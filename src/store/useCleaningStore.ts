import { create } from 'zustand';
import { CleaningTask, CleaningRecord, CleaningFrequency } from '../types';
import { cleaningService, calculateNextDueDate, parseUserDate } from '../services/cleaningService';

/**
 * State and action interface for cleaning store.
 */
export interface CleaningState {
  tasks: CleaningTask[];
  isLoading: boolean;
  error: string | null;

  /**
   * Loads all active cleaning tasks for the specified group.
   */
  loadTasks: (groupId: string) => Promise<void>;

  /**
   * Adds a new cleaning chore with a schedule and rotation list.
   */
  addTask: (
    groupId: string,
    name: string,
    area: string,
    frequency: CleaningFrequency,
    rotationOrder: string[],
    firstDueDate: Date | string
  ) => Promise<void>;

  /**
   * Updates an existing cleaning chore's due date.
   */
  updateTaskDueDate: (
    taskId: string,
    nextDueDate: Date | string
  ) => Promise<void>;

  /**
   * Soft-deletes a cleaning task.
   */
  removeTask: (taskId: string) => Promise<void>;

  /**
   * Updates recurrence frequency for an existing task.
   */
  updateTaskFrequency: (
    taskId: string,
    frequency: CleaningFrequency
  ) => Promise<void>;

  /**
   * Updates the member rotation sequence for a task.
   */
  updateRotationOrder: (taskId: string, newOrder: string[]) => Promise<void>;

  /**
   * Records chore completion, advances the turn index, and calculates the next due date.
   */
  markCleaningComplete: (
    taskId: string,
    cleanerUid: string,
    notes?: string
  ) => Promise<void>;

  /**
   * Fetches the completion log history for a cleaning task.
   */
  getTaskHistory: (
    taskId: string,
    limit?: number
  ) => Promise<CleaningRecord[]>;

  /**
   * Subscribes to real-time updates of active tasks for a group.
   *
   * @returns Unsubscribe function
   */
  subscribeToTasks: (groupId: string) => () => void;

  /**
   * Clears any active error state.
   */
  clearError: () => void;

  /**
   * Resets all store state back to initial values.
   */
  reset: () => void;
}

/**
 * Zustand store for managing household cleaning chores, rotating assignees,
 * and completion history.
 */
export const useCleaningStore = create<CleaningState>((set) => ({
  tasks: [],
  isLoading: false,
  error: null,

  loadTasks: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await cleaningService.getTasks(groupId);
      set({ tasks, isLoading: false, error: null });
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Erreur lors du chargement des tâches ménagères.';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  addTask: async (
    groupId: string,
    name: string,
    area: string,
    frequency: CleaningFrequency,
    rotationOrder: string[],
    firstDueDate: Date | string
  ) => {
    set({ isLoading: true, error: null });
    try {
      const dateObj = parseUserDate(firstDueDate) || new Date();
      const newTask = await cleaningService.addTask(
        groupId,
        name,
        area,
        frequency,
        rotationOrder,
        dateObj
      );
      set((state) => ({
        tasks: [...state.tasks, newTask],
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage =
        error?.message || "Erreur lors de l'ajout de la tâche ménagère.";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateTaskDueDate: async (taskId: string, nextDueDate: Date | string) => {
    set({ isLoading: true, error: null });
    try {
      const parsed = parseUserDate(nextDueDate) || new Date();
      await cleaningService.updateTaskDueDate(taskId, parsed);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, nextDueDate: parsed.toISOString() } : t
        ),
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage =
        error?.message || "Erreur lors de la mise à jour de la date d'échéance.";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  removeTask: async (taskId: string) => {
    set({ isLoading: true, error: null });
    try {
      await cleaningService.removeTask(taskId);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== taskId),
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Erreur lors de la suppression de la tâche ménagère.';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateTaskFrequency: async (
    taskId: string,
    frequency: CleaningFrequency
  ) => {
    set({ isLoading: true, error: null });
    try {
      await cleaningService.updateTaskFrequency(taskId, frequency);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, frequency } : t
        ),
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Erreur lors de la mise à jour de la fréquence.';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateRotationOrder: async (taskId: string, newOrder: string[]) => {
    set({ isLoading: true, error: null });
    try {
      await cleaningService.updateRotationOrder(taskId, newOrder);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, rotationOrder: newOrder } : t
        ),
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        "Erreur lors de la mise à jour de l'ordre de rotation des tâches.";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  markCleaningComplete: async (
    taskId: string,
    cleanerUid: string,
    notes?: string
  ) => {
    set({ isLoading: true, error: null });
    try {
      await cleaningService.markCleaningComplete(taskId, cleanerUid, notes);
      set((state) => ({
        tasks: state.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const orderLength = t.rotationOrder?.length || 1;
          const nextTurnIndex = (t.currentTurnIndex + 1) % orderLength;
          const now = new Date();
          const nextDueDate = calculateNextDueDate(t.frequency, t.nextDueDate || now);

          return {
            ...t,
            currentTurnIndex: nextTurnIndex,
            nextDueDate: nextDueDate.toISOString(),
            lastCleanedAt: now.toISOString(),
            lastCleanedBy: cleanerUid,
          };
        }),
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Erreur lors de la validation du ménage.';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  getTaskHistory: async (taskId: string, limit?: number) => {
    try {
      return await cleaningService.getTaskHistory(taskId, limit);
    } catch (error: any) {
      const errorMessage =
        error?.message || "Erreur lors du chargement de l'historique de ménage.";
      set({ error: errorMessage });
      throw error;
    }
  },

  subscribeToTasks: (groupId: string) => {
    set({ isLoading: true, error: null });
    return cleaningService.subscribeToTasks(groupId, (tasks) => {
      set({ tasks, isLoading: false, error: null });
    });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      tasks: [],
      isLoading: false,
      error: null,
    });
  },
}));

export default useCleaningStore;
