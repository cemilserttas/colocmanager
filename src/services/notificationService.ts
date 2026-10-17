import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { AppNotification, NotificationType, Product, CleaningTask } from '../types';
import { isDemoMode, mockStorage } from './mockStorage';
import { getCurrentAssignee } from '../utils/rotation';

const demoNotificationSubscribers = new Map<string, Set<(notifications: AppNotification[]) => void>>();

const notifyDemoNotificationSubscribers = async (userId: string) => {
  if (!userId) return;
  const notifs = await mockStorage.getNotifications(userId);
  const subs = demoNotificationSubscribers.get(userId);
  if (subs) {
    subs.forEach((cb) => cb(notifs));
  }
};

const VAPID_PUBLIC_KEY = 'BN29BeOIv9Jrkh5opy8rSf2BWgRUI5Mk9-I07X_7gXT2Q1rJpZO9gKgPkSpMEgw175Sl7iT4v2lsgzi3ADPpeZs';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Service managing push tokens, local scheduled notifications,
 * foreground handlers, and Firestore notifications storage and listeners.
 */
export const notificationService = {
  /**
   * Configures foreground notification display options (sound, alert banner, badge).
   * Also ensures default Android channel is created immediately on app launch.
   */
  setupNotificationHandler(): void {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'ColocManager Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
        sound: 'default',
      }).catch(() => {});
    }
  },

  /**
   * Requests push notification permissions from the device user.
   * Also ensures default notification channel is created for Android.
   *
   * @returns Boolean indicating whether permission was granted
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          return true;
        }
        if (Notification.permission !== 'denied') {
          const res = await Notification.requestPermission();
          return res === 'granted';
        }
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // Configure default channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'ColocManager Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
          sound: 'default',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  },

  /**
   * Obtains the Expo push token for the device.
   *
   * @returns The push token string or null if unavailable
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      return tokenData.data;
    } catch (error) {
      console.error('Error fetching Expo push token:', error);
      return null;
    }
  },

  /**
   * Obtains the Expo push token and saves it in the user's Firestore document.
   *
   * @param userId - The user's UID
   */
  async registerForPushNotifications(userId: string): Promise<void> {
    try {
      const token = await notificationService.getExpoPushToken();
      if (token) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          fcmToken: token,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error(`Error registering push token for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Dispatches remote push notification via Expo Push API.
   */
  async sendExpoPush(
    token: string,
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      if (
        !token ||
        typeof token !== 'string' ||
        (!token.startsWith('ExponentPushToken') && !token.startsWith('ExpoPushToken'))
      ) {
        return;
      }
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title,
          body,
          data,
        }),
      });
    } catch (e) {
      console.warn('Expo push dispatch failed (non-fatal):', e);
    }
  },

  /**
   * Registers the browser / PWA for Web Push via Service Worker PushManager
   * and saves the subscription to the user's Firestore profile.
   * This enables receiving system push notifications even when the app is completely closed.
   */
  async registerWebPushSubscription(userId?: string): Promise<any | null> {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return null;
    }

    try {
      if ('Notification' in window && Notification.permission !== 'granted') {
        const req = await Notification.requestPermission();
        if (req !== 'granted') {
          return null;
        }
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any,
        });
      }

      if (subscription && userId) {
        const subJson = subscription.toJSON();
        if (subJson && subJson.endpoint) {
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);
          let existingSubs: any[] = [];
          if (userSnap.exists()) {
            existingSubs = userSnap.data()?.webPushSubscriptions || [];
          }
          const filtered = existingSubs.filter(
            (s: any) => s && s.endpoint && s.endpoint !== subJson.endpoint
          );
          filtered.push(subJson);
          await updateDoc(userRef, {
            webPushSubscriptions: filtered,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      return subscription;
    } catch (err) {
      console.warn('Error registering web push subscription:', err);
      return null;
    }
  },

  /**
   * Sends a Web Push payload to one or more Web Push subscriptions via our /api/send-push endpoint.
   * Delivered directly by Apple APNs / Google FCM even when the app is completely closed.
   */
  async sendWebPush(
    subscriptions: any[],
    title: string,
    body: string,
    data?: any,
    delaySeconds?: number
  ): Promise<void> {
    if (!subscriptions || subscriptions.length === 0) return;
    try {
      await fetch('/api/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptions,
          title,
          body,
          data,
          delaySeconds,
        }),
      });
    } catch (e) {
      console.warn('Error sending web push via /api/send-push:', e);
    }
  },

  /**
   * Schedules a Web Push notification to test delivery when the app is completely closed.
   * Gives the user delaySeconds (default 5s) to close the app or lock their phone.
   */
  async testClosedAppWebPush(userId?: string, delaySeconds: number = 5): Promise<boolean> {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return false;
    }
    try {
      const sub = await notificationService.registerWebPushSubscription(userId);
      if (!sub) return false;

      const subData = typeof sub.toJSON === 'function' ? sub.toJSON() : sub;
      await notificationService.sendWebPush(
        [subData],
        'ColocManager 📲',
        'Notification reçue avec succès alors que l\'application était fermée !',
        { test: true },
        delaySeconds
      );
      return true;
    } catch (err) {
      console.warn('Error scheduling closed app test push:', err);
      return false;
    }
  },

  /**
   * Schedules a local notification to fire after a specified number of seconds.
   *
   * @param title - Notification title
   * @param body - Notification message body
   * @param seconds - Delay in seconds before triggering
   * @returns Notification ID string
   */
  /**
   * Dispatches an immediate system notification across both native (Expo)
   * and Web / PWA environments (ServiceWorker / Web Notifications API).
   */
  async showSystemNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if ('Notification' in window && Notification.permission === 'granted') {
          if ('serviceWorker' in navigator) {
            try {
              const reg = await navigator.serviceWorker.ready;
              if (reg && typeof reg.showNotification === 'function') {
                await reg.showNotification(title, {
                  body,
                  icon: '/icon.png',
                  badge: '/icon.png',
                  data,
                });
                return;
              }
            } catch {
              // Fallback to new Notification
            }
          }
          try {
            new Notification(title, {
              body,
              icon: '/icon.png',
            });
            return;
          } catch {
            // Ignore
          }
        }
        // Web execution terminates here to avoid calling unsupported native Expo Notifications API on web
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          data,
        },
        trigger: {
          channelId: 'default',
        },
      });
    } catch (e) {
      console.warn('System notification dispatch error:', e);
    }
  },

  async scheduleLocalNotification(
    title: string,
    body: string,
    seconds: number
  ): Promise<string> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        setTimeout(() => {
          notificationService.showSystemNotification(title, body);
        }, Math.max(1, seconds) * 1000);
        return `web-local-${Date.now()}`;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, seconds),
        },
      });

      return notificationId;
    } catch (error: any) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  },

  /**
   * Cancels a previously scheduled local notification.
   *
   * @param notificationId - The notification identifier to cancel
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error: any) {
      console.error(`Error cancelling notification ${notificationId}:`, error);
      throw error;
    }
  },

  /**
   * Creates and stores a notification record in the Firestore 'notifications' collection.
   *
   * @param recipientUid - The user ID to whom the notification belongs
   * @param type - Notification category (e.g. 'shopping', 'cleaning', 'group')
   * @param title - Notification title
   * @param body - Notification message body
   * @param referenceId - Optional related document ID (e.g. taskId, productId)
   */
  async addNotificationToFirestore(
    recipientUid: string,
    type: NotificationType,
    title: string,
    body: string,
    referenceId?: string
  ): Promise<void> {
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newNotification: AppNotification = {
      id: notifId,
      notifId,
      recipientUid,
      type,
      title,
      body,
      ...(referenceId ? { referenceId } : {}),
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    if (isDemoMode()) {
      await mockStorage.addNotification(newNotification);
      notifyDemoNotificationSubscribers(recipientUid).catch(() => {});
      return;
    }

    try {
      const notifRef = doc(collection(db, 'notifications'));
      newNotification.id = notifRef.id;
      newNotification.notifId = notifRef.id;
      await setDoc(notifRef, newNotification);

      // Dispatch remote push notification (Expo push for native, Web Push for PWA/Web)
      try {
        const recipientUserDoc = await getDoc(doc(db, 'users', recipientUid));
        if (recipientUserDoc.exists()) {
          const userData = recipientUserDoc.data();
          const pushToken = userData?.fcmToken;
          if (pushToken) {
            await notificationService.sendExpoPush(pushToken, title, body, {
              type,
              referenceId,
            });
          }

          const webSubs = userData?.webPushSubscriptions;
          if (Array.isArray(webSubs) && webSubs.length > 0) {
            await notificationService.sendWebPush(webSubs, title, body, {
              type,
              referenceId,
            });
          }
        }
      } catch {
        // Non-fatal if token lookup fails
      }
    } catch (error: any) {
      console.warn('Firestore notification insert fallback to local storage:', error);
      await mockStorage.addNotification(newNotification);
    }
  },

  /**
   * Retrieves all notifications for a specific user, sorted newest first.
   *
   * @param userId - The user's UID
   * @returns Array of AppNotification objects
   */
  async getNotifications(userId: string): Promise<AppNotification[]> {
    if (isDemoMode()) {
      return await mockStorage.getNotifications(userId);
    }

    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnap = await getDocs(q);

      return querySnap.docs.map((docSnap) => docSnap.data() as AppNotification);
    } catch (error) {
      // Graceful fallback to client-side sort if compound index is pending
      console.warn('Retrying notification query without orderBy clause:', error);
      try {
        const fallbackQuery = query(
          collection(db, 'notifications'),
          where('recipientUid', '==', userId)
        );
        const querySnap = await getDocs(fallbackQuery);
        const list = querySnap.docs.map(
          (docSnap) => docSnap.data() as AppNotification
        );

        return list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } catch (fallbackError: any) {
        console.warn(`Firestore notification fetch fallback to local for ${userId}:`, fallbackError);
        return await mockStorage.getNotifications(userId);
      }
    }
  },

  /**
   * Marks a notification as read in Firestore.
   *
   * @param notifId - The unique notification document ID
   */
  async markNotificationRead(notifId: string, recipientUid?: string): Promise<void> {
    if (isDemoMode()) {
      await mockStorage.markNotificationRead(notifId);
      if (recipientUid) {
        notifyDemoNotificationSubscribers(recipientUid).catch(() => {});
      } else {
        mockStorage.getNotifications().then((all) => {
          const target = all.find((n) => n.id === notifId || n.notifId === notifId);
          if (target?.recipientUid) {
            notifyDemoNotificationSubscribers(target.recipientUid).catch(() => {});
          }
        }).catch(() => {});
      }
      return;
    }

    try {
      const notifRef = doc(db, 'notifications', notifId);
      await updateDoc(notifRef, {
        isRead: true,
      });
    } catch (error: any) {
      console.warn(`Fallback marking notification read for ${notifId}:`, error);
      await mockStorage.markNotificationRead(notifId);
      if (recipientUid) {
        notifyDemoNotificationSubscribers(recipientUid).catch(() => {});
      }
    }
  },

  /**
   * Deletes a specific notification record.
   */
  async deleteNotification(notifId: string, recipientUid?: string): Promise<void> {
    if (isDemoMode()) {
      await mockStorage.deleteNotification(notifId);
      if (recipientUid) {
        notifyDemoNotificationSubscribers(recipientUid).catch(() => {});
      }
      return;
    }

    try {
      await deleteDoc(doc(db, 'notifications', notifId));
    } catch (error: any) {
      console.warn(`Fallback deleting notification ${notifId}:`, error);
      await mockStorage.deleteNotification(notifId);
      if (recipientUid) {
        notifyDemoNotificationSubscribers(recipientUid).catch(() => {});
      }
    }
  },

  /**
   * Clears all notifications for a specific user.
   */
  async clearAllNotifications(userId: string): Promise<void> {
    if (isDemoMode()) {
      await mockStorage.clearAllNotifications(userId);
      notifyDemoNotificationSubscribers(userId).catch(() => {});
      return;
    }

    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', userId)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      await mockStorage.clearAllNotifications(userId);
      notifyDemoNotificationSubscribers(userId).catch(() => {});
    } catch (error: any) {
      console.warn(`Fallback clearing notifications for ${userId}:`, error);
      await mockStorage.clearAllNotifications(userId);
      notifyDemoNotificationSubscribers(userId).catch(() => {});
    }
  },

  /**
   * Automatically generates reminder notifications in Firestore
   * for the user's upcoming/overdue tasks or shopping turns.
   */
  async checkAndGenerateReminders(
    userId: string,
    groupId: string,
    products: Product[] = [],
    tasks: CleaningTask[] = []
  ): Promise<void> {
    if (!userId) return;

    try {
      // Get recent notifications for this user to avoid duplicating reminders in the last 24h
      const existingNotifs = await notificationService.getNotifications(userId);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      // 1. Check shopping items where it's currently userId's turn and restock is needed
      for (const p of products) {
        if (!p.isActive || !p.rotationOrder || p.rotationOrder.length === 0) continue;
        if (p.needsRestock === false) continue;
        const currentBuyer = getCurrentAssignee(p.rotationOrder, p.currentTurnIndex ?? 0);
        if (currentBuyer === userId) {
          const hasRecentReminder = existingNotifs.some((n) => {
            const notifTime = new Date(n.createdAt).getTime();
            return (
              n.referenceId === p.id &&
              (n.type === 'reminder' || n.type === 'purchase_turn') &&
              notifTime > oneDayAgo
            );
          });

          if (!hasRecentReminder) {
              await notificationService.addNotificationToFirestore(
                userId,
                'reminder',
                'Rappel d\'achat !',
                `C'est votre tour d'acheter : "${p.name}". Pensez-y lors de vos courses !`,
                p.id
              );
            }
          }
        }

        // 2. Check cleaning tasks where it's currently userId's turn and due soon or overdue
        for (const t of tasks) {
          if (!t.isActive || !t.rotationOrder || t.rotationOrder.length === 0) continue;
          const currentCleaner = getCurrentAssignee(t.rotationOrder, t.currentTurnIndex ?? 0);
          if (currentCleaner === userId && t.nextDueDate) {
            const dueDate = new Date(t.nextDueDate).getTime();
            const isOverdue = dueDate < Date.now();
            const isDueSoon = dueDate - Date.now() < 2 * 24 * 60 * 60 * 1000; // within 48h

            if (isOverdue || isDueSoon) {
              const hasRecentReminder = existingNotifs.some((n) => {
                const notifTime = new Date(n.createdAt).getTime();
                return (
                  n.referenceId === t.id &&
                  (n.type === 'reminder' || n.type === 'cleaning_turn') &&
                  notifTime > oneDayAgo
                );
              });

              if (!hasRecentReminder) {
                const formattedDate = new Date(t.nextDueDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                });

                await notificationService.addNotificationToFirestore(
                  userId,
                  'reminder',
                  isOverdue ? 'Tâche en retard !' : 'Rappel de ménage !',
                  isOverdue
                    ? `La tâche "${t.name}" (${t.area}) est en retard ! Pensez à l'effectuer dès que possible.`
                    : `N'oubliez pas : votre tâche "${t.name}" (${t.area}) est prévue pour le ${formattedDate}.`,
                  t.id
                );
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error running checkAndGenerateReminders:', err);
      }
    },

    /**
     * Sends an immediate peer reminder to a roommate from another roommate/admin.
     */
    async sendPeerReminder(
      senderName: string,
      recipientUid: string,
      itemType: 'shopping' | 'cleaning',
      itemName: string,
      itemId: string
    ): Promise<void> {
      const title = 'Rappel amical de colocation';
    const body =
      itemType === 'shopping'
        ? `${senderName} vous rappelle gentiment qu'il faut acheter "${itemName}".`
        : `${senderName} vous rappelle gentiment qu'il faut effectuer la tâche "${itemName}".`;

    await notificationService.addNotificationToFirestore(
      recipientUid,
      'reminder',
      title,
      body,
      itemId
    );
  },

  /**
   * Subscribes to real-time notification updates for a specific user.
   *
   * @param userId - The user's UID
   * @param callback - Callback receiving the updated array of AppNotification objects
   * @returns Unsubscribe function
   */
  subscribeToNotifications(
    userId: string,
    callback: (notifications: AppNotification[]) => void
  ): () => void {
    if (isDemoMode()) {
      mockStorage.getNotifications(userId).then(callback).catch(() => {});
      if (!demoNotificationSubscribers.has(userId)) {
        demoNotificationSubscribers.set(userId, new Set());
      }
      const subs = demoNotificationSubscribers.get(userId)!;
      subs.add(callback);
      return () => {
        subs.delete(callback);
        if (subs.size === 0) {
          demoNotificationSubscribers.delete(userId);
        }
      };
    }

    let innerUnsub: (() => void) | null = null;
    let isCancelled = false;

    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', userId),
      orderBy('createdAt', 'desc')
    );

    innerUnsub = onSnapshot(
      q,
      (querySnap) => {
        if (isCancelled) return;
        const notifs = querySnap.docs.map(
          (docSnap) => docSnap.data() as AppNotification
        );
        callback(notifs);
      },
      (error) => {
        if (isCancelled) return;
        console.warn('Realtime notifications index error, fallback to unindexed query:', error);
        const fallbackQ = query(
          collection(db, 'notifications'),
          where('recipientUid', '==', userId)
        );
        innerUnsub = onSnapshot(fallbackQ, (querySnap) => {
          if (isCancelled) return;
          const fallbackNotifs = querySnap.docs
            .map((docSnap) => docSnap.data() as AppNotification)
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          callback(fallbackNotifs);
        });
      }
    );

    return () => {
      isCancelled = true;
      if (innerUnsub) {
        innerUnsub();
      }
    };
  },
};

export default notificationService;
