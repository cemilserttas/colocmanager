/**
 * Cloud Function: scheduledReminders
 *
 * Runs daily to check for overdue tasks and send reminder notifications.
 * Triggers every day at 9:00 AM UTC.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Formats a date as DD/MM/YYYY
 */
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export const scheduledReminders = onSchedule(
  {
    schedule: '0 9 * * *', // Every day at 9:00 AM UTC
    timeZone: 'Europe/Paris',
  },
  async () => {
    console.log('Running scheduled reminders check...');

    const now = new Date();

    try {
      // === Check overdue cleaning tasks ===
      const cleaningSnapshot = await db
        .collection('cleaningTasks')
        .where('isActive', '==', true)
        .where('nextDueDate', '<=', admin.firestore.Timestamp.fromDate(now))
        .get();

      console.log(`Found ${cleaningSnapshot.size} overdue cleaning tasks`);

      for (const doc of cleaningSnapshot.docs) {
        const task = doc.data();
        const currentCleanerUid =
          task.rotationOrder[task.currentTurnIndex % task.rotationOrder.length];

        if (!currentCleanerUid) continue;

        // Get user's FCM token
        const userDoc = await db.collection('users').doc(currentCleanerUid).get();
        const userData = userDoc.data();

        if (!userData) continue;

        const dueDate = task.nextDueDate.toDate
          ? task.nextDueDate.toDate()
          : new Date(task.nextDueDate);

        // Send reminder notification
        if (userData.fcmToken) {
          try {
            const message: admin.messaging.Message = {
              token: userData.fcmToken,
              notification: {
                title: '⏰ Rappel nettoyage !',
                body: `${task.name} (${task.area}) était prévu pour le ${formatDate(dueDate)}. N'oublie pas !`,
              },
              data: {
                type: 'reminder',
                taskId: doc.id,
              },
              android: {
                priority: 'high',
                notification: {
                  channelId: 'reminders',
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
            console.log(`Reminder sent to ${currentCleanerUid} for task ${task.name}`);
          } catch (msgError: any) {
            // Handle invalid token
            if (msgError.code === 'messaging/registration-token-not-registered') {
              await db.collection('users').doc(currentCleanerUid).update({
                fcmToken: admin.firestore.FieldValue.delete(),
              });
            }
            console.error(`Failed to send reminder to ${currentCleanerUid}:`, msgError);
          }
        }

        // Store reminder notification in Firestore
        await db.collection('notifications').add({
          recipientUid: currentCleanerUid,
          type: 'reminder',
          title: '⏰ Rappel nettoyage !',
          body: `${task.name} (${task.area}) était prévu pour le ${formatDate(dueDate)}`,
          referenceId: doc.id,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // === Check products that haven't been purchased in a while ===
      // We check purchase records to see if any product's current buyer
      // hasn't acted in more than 7 days
      const productsSnapshot = await db
        .collection('products')
        .where('isActive', '==', true)
        .get();

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const doc of productsSnapshot.docs) {
        const product = doc.data();
        const currentBuyerUid =
          product.rotationOrder[product.currentTurnIndex % product.rotationOrder.length];

        if (!currentBuyerUid) continue;

        // Check when the last purchase was made for this product
        const lastPurchase = await db
          .collection('products')
          .doc(doc.id)
          .collection('history')
          .orderBy('purchasedAt', 'desc')
          .limit(1)
          .get();

        let shouldRemind = false;

        if (lastPurchase.empty) {
          // No purchase ever → check product creation date
          const createdAt = product.createdAt?.toDate
            ? product.createdAt.toDate()
            : new Date(product.createdAt);
          shouldRemind = createdAt < sevenDaysAgo;
        } else {
          const lastDate = lastPurchase.docs[0].data().purchasedAt?.toDate
            ? lastPurchase.docs[0].data().purchasedAt.toDate()
            : new Date(lastPurchase.docs[0].data().purchasedAt);
          shouldRemind = lastDate < sevenDaysAgo;
        }

        if (shouldRemind) {
          const userDoc = await db.collection('users').doc(currentBuyerUid).get();
          const userData = userDoc.data();

          if (userData?.fcmToken) {
            try {
              const message: admin.messaging.Message = {
                token: userData.fcmToken,
                notification: {
                  title: '⏰ Rappel achat !',
                  body: `N'oublie pas d'acheter : ${product.name}`,
                },
                data: {
                  type: 'reminder',
                  productId: doc.id,
                },
              };

              await messaging.send(message);
            } catch (msgError) {
              console.error(`Failed to send purchase reminder:`, msgError);
            }
          }

          // Store reminder
          await db.collection('notifications').add({
            recipientUid: currentBuyerUid,
            type: 'reminder',
            title: '⏰ Rappel achat !',
            body: `N'oublie pas d'acheter : ${product.name}`,
            referenceId: doc.id,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      console.log('Scheduled reminders check completed successfully');
    } catch (error) {
      console.error('Error in scheduled reminders:', error);
    }
  }
);
