/**
 * ColocManager — Application principale
 *
 * Application mobile de gestion des tâches et achats en colocation.
 * Gère la rotation équitable des achats et du nettoyage entre colocataires.
 */

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { paperTheme } from './src/constants/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notificationService';

// Import Firebase config to ensure initialization
import './firebase.config';

export default function App() {
  useEffect(() => {
    // Setup foreground notifications handler
    try {
      notificationService.setupNotificationHandler();
    } catch {
      // Ignore in environments without native notification support
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
      <PaperProvider theme={paperTheme}>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
