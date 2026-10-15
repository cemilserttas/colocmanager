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
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        const { name, area, frequency, rotationOrder, nextDueDate, firstDueDate } = args[0];
        return cleaningTasksHook.addTask(
          name,
          area,
          frequency as CleaningFrequency,
          rotationOrder,
          nextDueDate || firstDueDate
        );
      }

      // Handle positional arguments with defensive ordering:
      let [name, area, frequency, arg3, arg4] = args;
      let rotationOrder = arg3;
      let firstDueDate = arg4;

      // If inverted: arg3 is string/Date and arg4 is array
      if (Array.isArray(arg4) && (!Array.isArray(arg3) || typeof arg3 === 'string')) {
        rotationOrder = arg4;
        firstDueDate = arg3;
      }

      return cleaningTasksHook.addTask(
        name,
        area,
        frequency as CleaningFrequency,
        rotationOrder,
        firstDueDate
      );
    },
    [cleaningTasksHook]
  );

  const updateTask = useCallback(
    async (
      taskId: string,
      updates: { rotationOrder?: string[]; frequency?: string; nextDueDate?: Date | string }
    ) => {
      if (updates.rotationOrder) {
        await cleaningTasksHook.updateRotationOrder(taskId, updates.rotationOrder);
      }
      if (updates.frequency) {
        await cleaningTasksHook.updateTaskFrequency(taskId, updates.frequency as CleaningFrequency);
      }
      if (updates.nextDueDate) {
        await cleaningTasksHook.updateTaskDueDate(taskId, updates.nextDueDate);
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
    updateTaskDueDate: cleaningTasksHook.updateTaskDueDate,
    deleteTask: cleaningTasksHook.removeTask,
    markAsDone,
    fetchTasks: cleaningTasksHook.loadTasks,
    fetchTaskHistory: cleaningTasksHook.getTaskHistory,
  };
}

export default useCleaning;
