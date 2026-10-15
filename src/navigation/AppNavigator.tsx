/**
 * Root App Navigator
 * Handles auth state routing: Auth → JoinCreateGroup → Main
 */

import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { RootStackParamList } from './types';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { theme } from '../constants/theme';

import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import JoinCreateGroupScreen from '../screens/group/JoinCreateGroupScreen';
import SuspendedAccountScreen from '../screens/admin/SuspendedAccountScreen';
import AdminPortalScreen from '../screens/admin/AdminPortalScreen';

import { useThemeStore, getLiquidGlassTokens } from '../store/useThemeStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { group, isLoading: groupLoading } = useGroup();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);

  // Safety timeout: Never keep the user waiting on a spinner for more than 2 seconds
  const [safetyUnlocked, setSafetyUnlocked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSafetyUnlocked(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Show loading screen while checking auth and group status (capped at 2s max)
  const isStillLoading = !safetyUnlocked && (authLoading || (isAuthenticated && groupLoading));

  if (isStillLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: tokens.bg }]}>
        <Text style={styles.logo}>🏠</Text>
        <Text style={[styles.title, { color: tokens.text }]}>ColocManager</Text>
        <ActivityIndicator size="large" color={tokens.accent} style={styles.spinner} />
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>Chargement...</Text>
      </View>
    );
  }

  // Block suspended accounts immediately with dedicated restriction screen
  if (user?.status === 'suspended') {
    return <SuspendedAccountScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Not authenticated → show auth screens
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : !group ? (
        // Authenticated but no group → show join/create
        <>
          <Stack.Screen
            name="JoinCreateGroup"
            component={JoinCreateGroupScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="AdminPortal" component={AdminPortalScreen} />
        </>
      ) : (
        // Authenticated + has group → show main app
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="AdminPortal" component={AdminPortalScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: theme.typography.fontSizes.h1,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: theme.typography.fontSizes.body,
  },
});

export default AppNavigator;
