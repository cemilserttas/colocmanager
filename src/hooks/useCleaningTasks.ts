import { useEffect, useMemo, useCallback } from 'react';
import { useCleaningStore } from '../store/useCleaningStore';
import { useGroupStore } from '../store/useGroupStore';
import { CleaningTask, CleaningRecord, CleaningFrequency, GroupMember } from '../types';
import { getCurrentAssignee } from '../utils/rotation';
import { parseUserDate } from '../services/cleaningService';

/**
 * Cleaning task extended with resolved current cleaner details.
 */
export interface CleaningTaskWithCleaner extends CleaningTask {
  currentCleanerUid: string;
  currentCleaner?: GroupMember;
}

/**
 * Custom React hook for managing household cleaning chores, rotating cleaners,
 * and completion history.
 * Automatically synchronizes with the active group's tasks and cleans up subscriptions on unmount.
 *
 * @returns Cleaning tasks state, current cleaners, chore actions, and rotation helpers
 */
export function useCleaningTasks() {
  const group = useGroupStore((state) => state.group);
  const members = useGroupStore((state) => state.members);

  const tasks = useCleaningStore((state) => state.tasks);
  const isLoading = useCleaningStore((state) => state.isLoading);
  const error = useCleaningStore((state) => state.error);

  const loadTasks = useCleaningStore((state) => state.loadTasks);
  const addTaskStore = useCleaningStore((state) => state.addTask);
  const updateTaskDueDate = useCleaningStore((state) => state.updateTaskDueDate);
  const removeTask = useCleaningStore((state) => state.removeTask);
  const updateTaskFrequency = useCleaningStore((state) => state.updateTaskFrequency);
  const updateRotationOrder = useCleaningStore((state) => state.updateRotationOrder);
  const markCleaningComplete = useCleaningStore((state) => state.markCleaningComplete);
  const getTaskHistory = useCleaningStore((state) => state.getTaskHistory);
  const subscribeToTasks = useCleaningStore((state) => state.subscribeToTasks);
  const clearError = useCleaningStore((state) => state.clearError);
  const reset = useCleaningStore((state) => state.reset);

  // Subscribe to real-time cleaning tasks when active group exists
  const currentGroupId = group?.id || (group as any)?.groupId;
  useEffect(() => {
    if (!currentGroupId) {
      return;
    }

    const unsubscribe = subscribeToTasks(currentGroupId);

    return () => {
      unsubscribe();
    };
  }, [currentGroupId, subscribeToTasks]);

  /**
   * Retrieves the current cleaner user ID for a cleaning task.
   */
  const getCurrentCleanerUid = useCallback((task: CleaningTask): string => {
    return getCurrentAssignee(task.rotationOrder, task.currentTurnIndex);
  }, []);

  /**
   * Retrieves the current cleaner GroupMember object for a cleaning task.
   */
  const getCurrentCleanerMember = useCallback(
    (task: CleaningTask): GroupMember | undefined => {
      const cleanerUid = getCurrentAssignee(task.rotationOrder, task.currentTurnIndex);
      return members.find((m) => m.userId === cleanerUid);
    },
    [members]
  );

  /**
   * Returns both UID and GroupMember representation for the active cleaner of a task.
   */
  const getCurrentCleaner = useCallback(
    (task: CleaningTask): { uid: string; member?: GroupMember } => {
      const uid = getCurrentCleanerUid(task);
      const member = members.find((m) => m.userId === uid);
      return { uid, member };
    },
    [getCurrentCleanerUid, members]
  );

  /**
   * Memoized array of cleaning tasks annotated with current assignee information.
   */
  const tasksWithCleaner: CleaningTaskWithCleaner[] = useMemo(() => {
    return tasks.map((task) => {
      const currentCleanerUid = getCurrentAssignee(
        task.rotationOrder,
        task.currentTurnIndex
      );
      const currentCleaner = members.find((m) => m.userId === currentCleanerUid);
      return {
        ...task,
        currentCleanerUid,
        currentCleaner,
      };
    });
  }, [tasks, members]);

  /**
   * Convenience wrapper around addTask that defaults the groupId to the active group
   * and rotation order to all current members if unspecified.
   */
  const addTask = useCallback(
    async (
      name: string,
      area: string,
      frequency: CleaningFrequency,
      rotationOrder?: string[],
      firstDueDate?: Date | string
    ): Promise<void> => {
      const gId = group?.id || (group as any)?.groupId;
      if (!gId) {
        throw new Error('Aucun groupe actif sélectionné.');
      }

      // Safeguard: detect if rotationOrder and firstDueDate were passed in inverted order
      let actualOrder = rotationOrder;
      let actualDueDate = firstDueDate;
      if (Array.isArray(firstDueDate) && (!Array.isArray(rotationOrder) || typeof rotationOrder === 'string')) {
        actualOrder = firstDueDate as unknown as string[];
        actualDueDate = rotationOrder as unknown as string;
      }

      const order =
        actualOrder && actualOrder.length > 0
          ? actualOrder
          : members.map((m) => m.userId || m.id);

      const parsed = actualDueDate ? parseUserDate(actualDueDate) || new Date() : new Date();

      await addTaskStore(gId, name, area, frequency, order, parsed);
    },
    [group?.id, (group as any)?.groupId, members, addTaskStore]
  );

  /**
   * Loads tasks for the active group or a specified group ID.
   */
  const loadActiveGroupTasks = useCallback(
    async (targetGroupId?: string): Promise<void> => {
      const gId = targetGroupId || group?.id || (group as any)?.groupId;
      if (!gId) {
        return;
      }
      await loadTasks(gId);
    },
    [group?.id, (group as any)?.groupId, loadTasks]
  );

  return {
    tasks,
    tasksWithCleaner,
    isLoading,
    error,
    addTask,
    removeTask,
    updateTaskFrequency,
    updateTaskDueDate,
    updateRotationOrder,
    markCleaningComplete,
    getTaskHistory,
    getCurrentCleaner,
    getCurrentCleanerMember,
    getCurrentCleanerUid,
    loadTasks: loadActiveGroupTasks,
    clearError,
    reset,
  };
}

export default useCleaningTasks;
