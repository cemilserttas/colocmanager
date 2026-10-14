/**
 * ColocManager — Application principale
 *
 * Application mobile de gestion des tâches et achats en colocation.
 * Gère la rotation équitable des achats et du nettoyage entre colocataires.
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { paperTheme } from './src/constants/theme';
import AppNavigator from './src/navigation/AppNavigator';

// Import Firebase config to ensure initialization
import './firebase.config';

export default function App() {
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
