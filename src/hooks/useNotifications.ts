import { useEffect, useState, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationPreferences } from '../store/useNotificationPreferences';
import { useLanguageStore } from '../store/useLanguageStore';
import { notificationService } from '../services/notificationService';
import {
  translateNotificationTitle,
  translateNotificationBody,
} from '../utils/notificationTranslation';
import { stripLeadingEmojis } from '../utils/stripEmojis';
import { AppNotification } from '../types';

const globallySeenNotifIds = new Set<string>();
let globalInitialLoadDone = false;

/**
 * Custom React hook for managing push notification permissions, device registration,
 * foreground handlers, scheduling local reminders, and real-time notification alerts.
 *
 * @returns Push registration method, scheduleNotification helper, notifications array, and helpers
 */
export function useNotifications() {
  const user = useAuthStore((state) => state.user);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isConfiguredRef = useRef<boolean>(false);


  /**
   * Requests push notification permissions and saves the Expo push token
   * to the user's Firestore document.
   *
   * @param targetUserId - Optional explicit user ID (falls back to currently logged in user)
   * @returns Boolean indicating whether permission was granted and token registered
   */
  const registerForNotifications = useCallback(
    async (targetUserId?: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const granted = await notificationService.requestPermissions();
        setHasPermission(granted);

        if (!granted) {
          setIsLoading(false);
          return false;
        }

        const uid = targetUserId || user?.uid;
        if (uid) {
          await notificationService.registerForPushNotifications(uid);
        }

        setIsLoading(false);
        return true;
      } catch (err: any) {
        const errorMessage =
          err?.message || "Erreur lors de l'enregistrement aux notifications.";
        setError(errorMessage);
        setIsLoading(false);
        return false;
      }
    },
    [user?.uid]
  );

  /**
   * Schedules a local device notification to fire after a given number of seconds.
   *
   * @param title - Notification title text
   * @param body - Notification message content
   * @param seconds - Number of seconds to delay before delivery (default: 1)
   * @returns Notification ID string
   */
  const scheduleNotification = useCallback(
    async (
      title: string,
      body: string,
      seconds: number = 1
    ): Promise<string> => {
      try {
        return await notificationService.scheduleLocalNotification(
          title,
          body,
          seconds
        );
      } catch (err: any) {
        const errorMessage =
          err?.message || 'Erreur lors de la programmation de la notification.';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  /**
   * Cancels a scheduled local notification by ID.
   */
  const cancelNotification = useCallback(
    async (notificationId: string): Promise<void> => {
      try {
        await notificationService.cancelNotification(notificationId);
      } catch (err: any) {
        const errorMessage =
          err?.message || "Erreur lors de l'annulation de la notification.";
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  /**
   * Marks a notification as read.
   */
  const markAsRead = useCallback(
    async (notificationId: string): Promise<void> => {
      try {
        await notificationService.markNotificationRead(notificationId, user?.uid);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
      } catch (err: any) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    [user?.uid]
  );

  const deleteNotification = useCallback(
    async (notificationId: string): Promise<void> => {
      try {
        await notificationService.deleteNotification(notificationId, user?.uid);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      } catch (err: any) {
        console.error('Failed to delete notification:', err);
      }
    },
    [user?.uid]
  );

  const clearAllNotifications = useCallback(async (): Promise<void> => {
    if (!user?.uid) return;
    try {
      await notificationService.clearAllNotifications(user.uid);
      setNotifications([]);
    } catch (err: any) {
      console.error('Failed to clear notifications:', err);
    }
  }, [user?.uid]);

  // Configure foreground notification behavior once on mount
  useEffect(() => {
    if (!isConfiguredRef.current) {
      isConfiguredRef.current = true;
      notificationService.setupNotificationHandler();
    }
  }, []);

  // Request permissions and register token when user is logged in
  useEffect(() => {
    if (user?.uid) {
      registerForNotifications(user.uid).catch((err) => {
        console.warn('Initial push notification registration skipped/failed:', err);
      });
    }
  }, [user?.uid, registerForNotifications]);

  // Subscribe to user notifications in Firestore / mockStorage
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      globallySeenNotifIds.clear();
      globalInitialLoadDone = false;
      return;
    }

    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid,
      (newNotifs) => {
        setNotifications(newNotifs);

        if (!globalInitialLoadDone) {
          // Record existing notification IDs so initial mount doesn't re-trigger push
          newNotifs.forEach((n) => globallySeenNotifIds.add(n.id));
          globalInitialLoadDone = true;
          return;
        }

        const prefs = useNotificationPreferences.getState();
        if (!prefs.notificationsEnabled) {
          newNotifs.forEach((n) => globallySeenNotifIds.add(n.id));
          return;
        }

        newNotifs.forEach((notif) => {
          if (!notif.isRead && !globallySeenNotifIds.has(notif.id)) {
            globallySeenNotifIds.add(notif.id);

            let isAllowed = true;
            const titleLower = (notif.title || '').toLowerCase();
            const bodyLower = (notif.body || '').toLowerCase();
            const isShopping =
              notif.type === 'shopping' ||
              notif.type === 'purchase_turn' ||
              (notif.type === 'reminder' &&
                (titleLower.includes('achat') ||
                  bodyLower.includes('achat') ||
                  bodyLower.includes('acheter') ||
                  bodyLower.includes('course') ||
                  bodyLower.includes('racheter') ||
                  titleLower.includes('restock') ||
                  bodyLower.includes('restock')));
            const isCleaning =
              notif.type === 'cleaning' ||
              notif.type === 'cleaning_turn' ||
              (notif.type === 'reminder' &&
                (titleLower.includes('ménage') ||
                  bodyLower.includes('ménage') ||
                  bodyLower.includes('nettoy') ||
                  bodyLower.includes('tâche') ||
                  titleLower.includes('clean') ||
                  bodyLower.includes('clean') ||
                  titleLower.includes('chore')));
            const isAdmin = notif.type === 'admin' || notif.type === 'admin_transfer';
            const isGroup =
              notif.type === 'group' ||
              notif.type === 'member_joined' ||
              notif.type === 'member_left';

            if (isShopping && !prefs.shoppingReminders) {
              isAllowed = false;
            } else if (isCleaning && !prefs.cleaningReminders) {
              isAllowed = false;
            } else if (isAdmin && !prefs.adminUpdates) {
              isAllowed = false;
            } else if (isGroup && !prefs.groupUpdates) {
              isAllowed = false;
            }

            if (isAllowed) {
              const isEn = useLanguageStore.getState().language === 'en';
              const cleanTitle = stripLeadingEmojis(notif.title);
              const cleanBody = stripLeadingEmojis(notif.body);
              const title = translateNotificationTitle(cleanTitle, isEn);
              const body = translateNotificationBody(cleanBody, isEn);

              notificationService
                .showSystemNotification(title, body, { notifId: notif.id })
                .catch((e) => console.warn('Push dispatch error:', e));
            }
          }
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    registerForNotifications,
    scheduleNotification,
    cancelNotification,
    markAsRead,
    deleteNotification,
    clearAllNotifications,
    notifications,
    unreadCount,
    hasPermission,
    isLoading,
    error,
  };
}

export default useNotifications;
