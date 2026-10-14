/**
 * Cloud Function: onProductUpdate
 *
 * Triggered when a product document is updated in Firestore.
 * Detects when currentTurnIndex changes (purchase completed)
 * and sends a notification to the next buyer in rotation.
 */

import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const messaging = admin.messaging();

export const onProductUpdate = onDocumentUpdated(
  'products/{productId}',
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      console.log('No data found in event');
      return;
    }

    // Check if the turn index changed (i.e., a purchase was completed)
    if (beforeData.currentTurnIndex === afterData.currentTurnIndex) {
      return; // No turn change, nothing to do
    }

    const { name, rotationOrder, currentTurnIndex } = afterData;

    // Get the next buyer's userId
    const nextBuyerUid = rotationOrder[currentTurnIndex % rotationOrder.length];

    if (!nextBuyerUid) {
      console.error('Could not determine next buyer');
      return;
    }

    try {
      // Get the user's document to find their FCM token
      const userDoc = await db.collection('users').doc(nextBuyerUid).get();
      const userData = userDoc.data();

      if (!userData) {
        console.log(`User ${nextBuyerUid} not found`);
        return;
      }

      // Send push notification if FCM token exists
      if (userData.fcmToken) {
        const message: admin.messaging.Message = {
          token: userData.fcmToken,
          notification: {
            title: '🛒 C\'est ton tour !',
            body: `Tu dois acheter : ${name}`,
          },
          data: {
            type: 'purchase_turn',
            productId: event.params.productId,
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'purchases',
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
        console.log(`Notification sent to ${nextBuyerUid} for product ${name}`);
      }

      // Store notification in Firestore for in-app display
      await db.collection('notifications').add({
        recipientUid: nextBuyerUid,
        type: 'purchase_turn',
        title: '🛒 C\'est ton tour !',
        body: `Tu dois acheter : ${name}`,
        referenceId: event.params.productId,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending purchase notification:', error);
    }
  }
);
