import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

interface NotificationPreferencesState {
  notificationsEnabled: boolean;
  hasPromptedStartup: boolean;
  shoppingReminders: boolean;
  cleaningReminders: boolean;
  adminUpdates: boolean;
  groupUpdates: boolean;

  initializePreferences: () => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  setShoppingReminders: (enabled: boolean) => Promise<void>;
  setCleaningReminders: (enabled: boolean) => Promise<void>;
  setAdminUpdates: (enabled: boolean) => Promise<void>;
  setGroupUpdates: (enabled: boolean) => Promise<void>;
  setHasPromptedStartup: () => Promise<void>;
}

const STORAGE_KEY = '@coloc_notification_preferences_v2';

export const useNotificationPreferences = create<NotificationPreferencesState>((set, get) => ({
  // Default: disabled as required by user prompt
  notificationsEnabled: false,
  hasPromptedStartup: false,
  shoppingReminders: true,
  cleaningReminders: true,
  adminUpdates: true,
  groupUpdates: true,

  initializePreferences: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          notificationsEnabled: Boolean(parsed.notificationsEnabled),
          hasPromptedStartup: Boolean(parsed.hasPromptedStartup),
          shoppingReminders: parsed.shoppingReminders ?? true,
          cleaningReminders: parsed.cleaningReminders ?? true,
          adminUpdates: parsed.adminUpdates ?? true,
          groupUpdates: parsed.groupUpdates ?? true,
        });
      }
    } catch {
      // Keep defaults
    }
  },

  setNotificationsEnabled: async (enabled: boolean) => {
    if (enabled) {
      // Request device permissions
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        try {
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }
        } catch {
          // Ignore
        }
      } else {
        try {
          await Notifications.requestPermissionsAsync();
        } catch {
          // Ignore
        }
      }
    }

    set({ notificationsEnabled: enabled });
    const current = get();
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          notificationsEnabled: enabled,
          hasPromptedStartup: current.hasPromptedStartup,
          shoppingReminders: current.shoppingReminders,
          cleaningReminders: current.cleaningReminders,
          adminUpdates: current.adminUpdates,
          groupUpdates: current.groupUpdates,
        })
      );
    } catch {
      // Non-blocking
    }
    return enabled;
  },

  setShoppingReminders: async (enabled: boolean) => {
    set({ shoppingReminders: enabled });
    const current = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  },

  setCleaningReminders: async (enabled: boolean) => {
    set({ cleaningReminders: enabled });
    const current = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  },

  setAdminUpdates: async (enabled: boolean) => {
    set({ adminUpdates: enabled });
    const current = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  },

  setGroupUpdates: async (enabled: boolean) => {
    set({ groupUpdates: enabled });
    const current = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  },

  setHasPromptedStartup: async () => {
    set({ hasPromptedStartup: true });
    const current = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, hasPromptedStartup: true }));
  },
}));

export default useNotificationPreferences;
