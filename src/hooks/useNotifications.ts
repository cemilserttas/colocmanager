import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { notificationService } from '../services/notificationService';
import { AppNotification } from '../types';

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
  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await notificationService.markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

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

  // Subscribe to user notifications in Firestore
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }

    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid,
      (newNotifs) => {
        setNotifications(newNotifs);
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
    notifications,
    unreadCount,
    hasPermission,
    isLoading,
    error,
  };
}

export default useNotifications;
