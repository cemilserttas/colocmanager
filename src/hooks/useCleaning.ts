import { useCallback } from 'react';
import { useCleaningTasks } from './useCleaningTasks';
import { useAuthStore } from '../store/useAuthStore';
import { useGroupStore } from '../store/useGroupStore';
import { CleaningFrequency } from '../types';

export function useCleaning() {
  const cleaningTasksHook = useCleaningTasks();
  const user = useAuthStore((state) => state.user);
  const group = useGroupStore((state) => state.group);

  const currentGroupId = group?.id || group?.groupId;

  const addTask = useCallback(
    async (...args: any[]) => {
      if (args.length === 1 && typeof args[0] === 'object') {
        const { name, area, frequency, rotationOrder, nextDueDate } = args[0];
        return cleaningTasksHook.addTask(
          name,
          area,
          frequency as CleaningFrequency,
          rotationOrder,
          nextDueDate
        );
      }
      return (cleaningTasksHook.addTask as any)(...args);
    },
    [cleaningTasksHook]
  );

  const updateTask = useCallback(
    async (taskId: string, updates: { rotationOrder?: string[]; frequency?: string }) => {
      if (updates.rotationOrder) {
        await cleaningTasksHook.updateRotationOrder(taskId, updates.rotationOrder);
      }
      if (updates.frequency) {
        await cleaningTasksHook.updateTaskFrequency(taskId, updates.frequency as CleaningFrequency);
      }
    },
    [cleaningTasksHook]
  );

  const markAsDone = useCallback(
    async (taskId: string, cleanerUid?: string, notes?: string) => {
      const uid = cleanerUid || user?.uid;
      if (!uid) throw new Error('Utilisateur non connecté');
      return cleaningTasksHook.markCleaningComplete(taskId, uid, notes);
    },
    [user?.uid, cleaningTasksHook]
  );

  return {
    ...cleaningTasksHook,
    loading: cleaningTasksHook.isLoading,
    addTask,
    updateTask,
    deleteTask: cleaningTasksHook.removeTask,
    markAsDone,
    fetchTasks: cleaningTasksHook.loadTasks,
    fetchTaskHistory: cleaningTasksHook.getTaskHistory,
  };
}

export default useCleaning;
