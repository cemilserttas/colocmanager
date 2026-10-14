/**
 * Cloud Function: sendNotification
 *
 * Callable function to send push notifications on demand.
 * Used when admin actions require immediate notification delivery.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const messaging = admin.messaging();

interface SendNotificationData {
  recipientUid: string;
  title: string;
  body: string;
  type: string;
  referenceId?: string;
}

export const sendNotification = onCall(async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Vous devez être connecté.');
  }

  const { recipientUid, title, body, type, referenceId } = request.data as SendNotificationData;

  // Validate required fields
  if (!recipientUid || !title || !body || !type) {
    throw new HttpsError('invalid-argument', 'Champs requis manquants.');
  }

  try {
    // Get the recipient's FCM token
    const userDoc = await db.collection('users').doc(recipientUid).get();
    const userData = userDoc.data();

    if (!userData) {
      throw new HttpsError('not-found', 'Utilisateur non trouvé.');
    }

    // Send push notification if token exists
    if (userData.fcmToken) {
      const message: admin.messaging.Message = {
        token: userData.fcmToken,
        notification: { title, body },
        data: {
          type,
          ...(referenceId ? { referenceId } : {}),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: type.includes('cleaning') ? 'cleaning' : 'purchases',
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
    }

    // Store notification in Firestore
    const notifRef = await db.collection('notifications').add({
      recipientUid,
      type,
      title,
      body,
      referenceId: referenceId || null,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, notificationId: notifRef.id };
  } catch (error: any) {
    console.error('Error sending notification:', error);

    // Handle invalid FCM token
    if (error.code === 'messaging/registration-token-not-registered') {
      // Clear invalid token
      await db.collection('users').doc(recipientUid).update({
        fcmToken: admin.firestore.FieldValue.delete(),
      });
      console.log(`Cleared invalid FCM token for user ${recipientUid}`);
    }

    throw new HttpsError('internal', 'Erreur lors de l\'envoi de la notification.');
  }
});
