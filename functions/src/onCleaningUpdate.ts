/**
 * Cloud Function: onCleaningUpdate
 *
 * Triggered when a cleaning task document is updated.
 * Detects turn changes, calculates next due date,
 * and sends notification to the next person in rotation.
 */

import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Calculates the next due date based on frequency
 */
function calculateNextDueDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate);
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

/**
 * Formats a date as DD/MM/YYYY
 */
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export const onCleaningUpdate = onDocumentUpdated(
  'cleaningTasks/{taskId}',
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      console.log('No data found in event');
      return;
    }

    // Check if the turn index changed (i.e., cleaning was completed)
    if (beforeData.currentTurnIndex === afterData.currentTurnIndex) {
      return;
    }

    const { name, area, rotationOrder, currentTurnIndex, frequency, nextDueDate } = afterData;

    // Get the next cleaner's userId
    const nextCleanerUid = rotationOrder[currentTurnIndex % rotationOrder.length];

    if (!nextCleanerUid) {
      console.error('Could not determine next cleaner');
      return;
    }

    // Format the due date for the notification
    const dueDate = nextDueDate?.toDate ? nextDueDate.toDate() : new Date(nextDueDate);
    const dueDateStr = formatDate(dueDate);

    try {
      // Get the user's document
      const userDoc = await db.collection('users').doc(nextCleanerUid).get();
      const userData = userDoc.data();

      if (!userData) {
        console.log(`User ${nextCleanerUid} not found`);
        return;
      }

      // Send push notification
      if (userData.fcmToken) {
        const message: admin.messaging.Message = {
          token: userData.fcmToken,
          notification: {
            title: '🧹 Nettoyage à faire !',
            body: `${name} (${area}) — avant le ${dueDateStr}`,
          },
          data: {
            type: 'cleaning_turn',
            taskId: event.params.taskId,
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'cleaning',
              icon: 'ic_notification',
            },
          },
          apns: {
            payload: {
              aps: {
                badge: 1,
                sound: 'default',
              },
            },
          },
        };

        await messaging.send(message);
        console.log(`Cleaning notification sent to ${nextCleanerUid} for task ${name}`);
      }

      // Store notification in Firestore
      await db.collection('notifications').add({
        recipientUid: nextCleanerUid,
        type: 'cleaning_turn',
        title: '🧹 Nettoyage à faire !',
        body: `${name} (${area}) — avant le ${dueDateStr}`,
        referenceId: event.params.taskId,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending cleaning notification:', error);
    }
  }
);
