import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { AppNotification, NotificationType, Product, CleaningTask } from '../types';
import { isDemoMode, mockStorage } from './mockStorage';
import { getCurrentAssignee } from '../utils/rotation';

/**
 * Service managing push tokens, local scheduled notifications,
 * foreground handlers, and Firestore notifications storage and listeners.
 */
export const notificationService = {
  /**
   * Configures foreground notification display options (sound, alert banner, badge).
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
  },

  /**
   * Requests push notification permissions from the device user.
   * Also ensures default notification channel is created for Android.
   *
   * @returns Boolean indicating whether permission was granted
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('NotificationService: Push notifications require a physical device.');
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
   * Schedules a local notification to fire after a specified number of seconds.
   *
   * @param title - Notification title
   * @param body - Notification message body
   * @param seconds - Delay in seconds before triggering
   * @returns Notification ID string
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    seconds: number
  ): Promise<string> {
    try {
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
      return;
    }

    try {
      const notifRef = doc(collection(db, 'notifications'));
      newNotification.id = notifRef.id;
      newNotification.notifId = notifRef.id;
      await setDoc(notifRef, newNotification);
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
  async markNotificationRead(notifId: string): Promise<void> {
    if (isDemoMode()) {
      await mockStorage.markNotificationRead(notifId);
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

      // 1. Check shopping items where it's currently userId's turn
      for (const p of products) {
        if (!p.isActive || !p.rotationOrder || p.rotationOrder.length === 0) continue;
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
              '⏰ Rappel d\'achat !',
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
                isOverdue ? '🚨 Tâche en retard !' : '⏰ Rappel de ménage !',
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
    const title = '⏰ Rappel amical de colocation';
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
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (querySnap) => {
        const notifs = querySnap.docs.map(
          (docSnap) => docSnap.data() as AppNotification
        );
        callback(notifs);
      },
      (error) => {
        console.warn('Realtime notifications index error, fallback to unindexed query:', error);
        const fallbackQ = query(
          collection(db, 'notifications'),
          where('recipientUid', '==', userId)
        );
        return onSnapshot(fallbackQ, (querySnap) => {
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
  },
};

export default notificationService;
