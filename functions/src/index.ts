/**
 * Firebase Cloud Functions for ColocManager
 *
 * These functions handle server-side logic:
 * - Rotation advancement after purchases/cleaning
 * - Push notification delivery
 * - Scheduled reminders for overdue tasks
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export all cloud functions
export { onProductUpdate } from './onProductUpdate';
export { onCleaningUpdate } from './onCleaningUpdate';
export { sendNotification } from './sendNotification';
export { scheduledReminders } from './scheduledReminders';
