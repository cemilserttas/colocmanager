export type CleaningFrequency = 'weekly' | 'biweekly' | 'monthly';

/**
 * CleaningTask interface representing a scheduled household chore assigned on rotation.
 */
export interface CleaningTask {
  id: string;
  taskId?: string;
  groupId: string;
  name: string;
  area: string;
  frequency: CleaningFrequency;
  currentTurnIndex: number;
  rotationOrder: string[];
  nextDueDate: Date | string;
  isActive: boolean;
  lastCleanedAt?: Date | string | null;
  lastCleanedBy?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

/**
 * CleaningRecord interface tracking completion of a cleaning task by a group member.
 */
export interface CleaningRecord {
  id?: string;
  recordId?: string;
  taskId: string;
  cleanerUid: string;
  completedAt?: Date | string;
  cleanedAt?: Date | string;
  notes?: string;
}
