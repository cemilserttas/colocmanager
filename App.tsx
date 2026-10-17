/**
 * ColocManager — Application principale
 *
 * Application mobile de gestion des tâches et achats en colocation.
 * Gère la rotation équitable des achats et du nettoyage entre colocataires.
 */

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { paperLightTheme, paperDarkTheme } from './src/constants/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { RootStackParamList } from './src/navigation/types';
import { notificationService } from './src/services/notificationService';
import { useThemeStore } from './src/store/useThemeStore';
import { useLanguageStore } from './src/store/useLanguageStore';
import { useNotificationPreferences } from './src/store/useNotificationPreferences';
import { NotificationStartupModal } from './src/components/common/NotificationStartupModal';

// Import Firebase config to ensure initialization
import './firebase.config';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'https://colocmanager.vercel.app',
    'http://localhost:8081',
    'colocmanager://',
  ],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },
      JoinCreateGroup: 'join',
      AdminPortal: 'admin',
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Shopping: {
            screens: {
              ShoppingList: 'shopping',
              ProductDetail: 'shopping/:productId',
              AddProduct: 'shopping-add',
            },
          },
          Inventory: 'inventory',
          Cleaning: {
            screens: {
              CleaningList: 'cleaning',
              CleaningDetail: 'cleaning/:taskId',
              AddCleaningTask: 'cleaning-add',
            },
          },
          Profile: {
            screens: {
              ProfileMain: 'profile',
              ManageMembers: 'members',
              AdminPortal: 'admin-portal',
            },
          },
        },
      },
    },
  },
};

export default function App() {
  const { isDark } = useThemeStore();

  useEffect(() => {
    // Dynamic body background color on web for seamless liquid glass styling
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = isDark ? '#0B0D17' : '#F8FAFC';
    }
  }, [isDark]);

  useEffect(() => {
    // Initialize preferences, themes and internationalization
    useThemeStore.getState().initializeTheme();
    useLanguageStore.getState().initializeLanguage();
    useNotificationPreferences.getState().initializePreferences();

    // Setup foreground notifications handler
    try {
      notificationService.setupNotificationHandler();
    } catch {
      // Ignore in environments without native notification support
    }

    // Register PWA service worker on web
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('PWA ServiceWorker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA ServiceWorker registration error:', err);
        });
    }

    // Ensure MaterialCommunityIcons font-face is active on web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fontId = 'material-community-icons-style';
      if (!document.getElementById(fontId)) {
        const style = document.createElement('style');
        style.id = fontId;
        style.textContent = `
          @font-face {
            font-family: 'MaterialCommunityIcons';
            src: url('https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/fonts/materialdesignicons-webfont.woff2?v=7.4.47') format('woff2'),
                 url('https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/fonts/materialdesignicons-webfont.ttf?v=7.4.47') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={isDark ? paperDarkTheme : paperLightTheme}>
        <NavigationContainer linking={linking}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <AppNavigator />
          <NotificationStartupModal />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
