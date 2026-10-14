import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { CleaningTask, CleaningRecord, CleaningFrequency } from '../types';
import { isDemoMode, mockStorage } from './mockStorage';

const cleaningSubscribers = new Set<(tasks: CleaningTask[]) => void>();

const notifyCleaningSubscribers = (tasks: CleaningTask[]) => {
  cleaningSubscribers.forEach((cb) => cb(tasks));
};

export function calculateNextDueDate(
  frequency: CleaningFrequency,
  baseDate: Date = new Date()
): Date {
  const next = new Date(baseDate.getTime());
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }
  return next;
}

export const cleaningService = {
  async addTask(
    groupId: string,
    name: string,
    area: string,
    frequency: CleaningFrequency,
    rotationOrder: string[],
    firstDueDate: Date | string
  ): Promise<CleaningTask> {
    const now = new Date().toISOString();
    const dueDateStr = firstDueDate
      ? new Date(firstDueDate).toISOString()
      : calculateNextDueDate(frequency).toISOString();

    if (isDemoMode()) {
      const tasks = await mockStorage.getCleaning();
      const newTask: CleaningTask = {
        id: `task-${Date.now()}`,
        taskId: `task-${Date.now()}`,
        groupId,
        name: name.trim(),
        area: area.trim(),
        frequency,
        rotationOrder,
        currentTurnIndex: 0,
        nextDueDate: dueDateStr,
        isActive: true,
        lastCleanedAt: null,
        lastCleanedBy: null,
        createdAt: now,
        updatedAt: now,
      };
      tasks.push(newTask);
      await mockStorage.setCleaning(tasks);
      notifyCleaningSubscribers(tasks);
      return newTask;
    }

    try {
      const taskRef = doc(collection(db, 'cleaningTasks'));
      const newTask: CleaningTask = {
        id: taskRef.id,
        groupId,
        name: name.trim(),
        area: area.trim(),
        frequency,
        rotationOrder,
        currentTurnIndex: 0,
        nextDueDate: dueDateStr,
        isActive: true,
        lastCleanedAt: null,
        lastCleanedBy: null,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(taskRef, newTask);
      return newTask;
    } catch {
      const tasks = await mockStorage.getCleaning();
      const newTask: CleaningTask = {
        id: `task-${Date.now()}`,
        groupId,
        name: name.trim(),
        area: area.trim(),
        frequency,
        rotationOrder,
        currentTurnIndex: 0,
        nextDueDate: dueDateStr,
        isActive: true,
        createdAt: now,
      };
      tasks.push(newTask);
      await mockStorage.setCleaning(tasks);
      notifyCleaningSubscribers(tasks);
      return newTask;
    }
  },

  async removeTask(taskId: string): Promise<void> {
    if (isDemoMode()) {
      const tasks = await mockStorage.getCleaning();
      const updated = tasks.filter((t) => t.id !== taskId && t.taskId !== taskId);
      await mockStorage.setCleaning(updated);
      notifyCleaningSubscribers(updated);
      return;
    }
    try {
      await updateDoc(doc(db, 'cleaningTasks', taskId), {
        isActive: false,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      const tasks = await mockStorage.getCleaning();
      const updated = tasks.filter((t) => t.id !== taskId && t.taskId !== taskId);
      await mockStorage.setCleaning(updated);
      notifyCleaningSubscribers(updated);
    }
  },

  async updateTaskFrequency(taskId: string, frequency: CleaningFrequency): Promise<void> {
    if (isDemoMode()) {
      const tasks = await mockStorage.getCleaning();
      const t = tasks.find((x) => x.id === taskId || x.taskId === taskId);
      if (t) {
        t.frequency = frequency;
        await mockStorage.setCleaning(tasks);
        notifyCleaningSubscribers(tasks);
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'cleaningTasks', taskId), {
        frequency,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      const tasks = await mockStorage.getCleaning();
      const t = tasks.find((x) => x.id === taskId || x.taskId === taskId);
      if (t) {
        t.frequency = frequency;
        await mockStorage.setCleaning(tasks);
        notifyCleaningSubscribers(tasks);
      }
    }
  },

  async updateRotationOrder(taskId: string, newOrder: string[]): Promise<void> {
    if (isDemoMode()) {
      const tasks = await mockStorage.getCleaning();
      const t = tasks.find((x) => x.id === taskId || x.taskId === taskId);
      if (t) {
        t.rotationOrder = newOrder;
        await mockStorage.setCleaning(tasks);
        notifyCleaningSubscribers(tasks);
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'cleaningTasks', taskId), {
        rotationOrder: newOrder,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      const tasks = await mockStorage.getCleaning();
      const t = tasks.find((x) => x.id === taskId || x.taskId === taskId);
      if (t) {
        t.rotationOrder = newOrder;
        await mockStorage.setCleaning(tasks);
        notifyCleaningSubscribers(tasks);
      }
    }
  },

  async markCleaningComplete(
    taskId: string,
    cleanerUid: string,
    notes?: string
  ): Promise<void> {
    if (isDemoMode()) {
      const tasks = await mockStorage.getCleaning();
      const t = tasks.find((x) => x.id === taskId || x.taskId === taskId);
      if (t && t.rotationOrder.length > 0) {
        t.currentTurnIndex = (t.currentTurnIndex + 1) % t.rotationOrder.length;
        t.lastCleanedAt = new Date().toISOString();
        t.lastCleanedBy = cleanerUid;
        t.nextDueDate = calculateNextDueDate(t.frequency).toISOString();
        await mockStorage.setCleaning(tasks);
        await mockStorage.addCleaningRecord(taskId, cleanerUid, notes);
        notifyCleaningSubscribers(tasks);
      }
      return;
    }

    try {
      const taskRef = doc(db, 'cleaningTasks', taskId);
      const taskSnap = await getDoc(taskRef);
      if (!taskSnap.exists()) throw new Error('Tâche non trouvée');

      const task = taskSnap.data() as CleaningTask;
      const nextTurnIndex = (task.currentTurnIndex + 1) % task.rotationOrder.length;
      const nextDueDate = calculateNextDueDate(task.frequency);
      const now = new Date().toISOString();

      await updateDoc(taskRef, {
        currentTurnIndex: nextTurnIndex,
        nextDueDate: nextDueDate.toISOString(),
        lastCleanedAt: now,
        lastCleanedBy: cleanerUid,
        updatedAt: now,
      });

      const historyRef = doc(collection(db, 'cleaningTasks', taskId, 'history'));
      await setDoc(historyRef, {
        id: historyRef.id,
        taskId,
        cleanerUid,
        cleanedAt: now,
        completedAt: now,
        ...(notes ? { notes } : {}),
      });
    } catch {
      const tasks = await mockStorage.getCleaning();
      const t = tasks.find((x) => x.id === taskId || x.taskId === taskId);
      if (t && t.rotationOrder.length > 0) {
        t.currentTurnIndex = (t.currentTurnIndex + 1) % t.rotationOrder.length;
        t.lastCleanedAt = new Date().toISOString();
        t.lastCleanedBy = cleanerUid;
        t.nextDueDate = calculateNextDueDate(t.frequency).toISOString();
        await mockStorage.setCleaning(tasks);
        await mockStorage.addCleaningRecord(taskId, cleanerUid, notes);
        notifyCleaningSubscribers(tasks);
      }
    }
  },

  async getTasks(groupId: string): Promise<CleaningTask[]> {
    if (isDemoMode()) {
      return await mockStorage.getCleaning();
    }
    try {
      const q = query(
        collection(db, 'cleaningTasks'),
        where('groupId', '==', groupId),
        where('isActive', '==', true)
      );
      const querySnap = await getDocs(q);
      return querySnap.docs.map((docSnap) => docSnap.data() as CleaningTask);
    } catch {
      return await mockStorage.getCleaning();
    }
  },

  async getTaskHistory(taskId: string, limitCount = 20): Promise<CleaningRecord[]> {
    if (isDemoMode()) {
      return await mockStorage.getCleaningHistory(taskId);
    }
    try {
      const historyQuery = query(
        collection(db, 'cleaningTasks', taskId, 'history'),
        orderBy('completedAt', 'desc'),
        limit(limitCount)
      );
      const querySnap = await getDocs(historyQuery);
      return querySnap.docs.map((docSnap) => docSnap.data() as CleaningRecord);
    } catch {
      return await mockStorage.getCleaningHistory(taskId);
    }
  },

  subscribeToTasks(groupId: string, callback: (tasks: CleaningTask[]) => void): () => void {
    if (isDemoMode()) {
      cleaningSubscribers.add(callback);
      mockStorage.getCleaning().then(callback);
      return () => {
        cleaningSubscribers.delete(callback);
      };
    }

    const q = query(
      collection(db, 'cleaningTasks'),
      where('groupId', '==', groupId),
      where('isActive', '==', true)
    );

    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => docSnap.data() as CleaningTask);
      callback(items);
    });
  },
};

export default cleaningService;
