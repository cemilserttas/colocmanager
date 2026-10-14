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

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { group, isLoading: groupLoading } = useGroup();

  // Show loading screen while checking auth and group status
  if (authLoading || (isAuthenticated && groupLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.logo}>🏠</Text>
        <Text style={styles.title}>ColocManager</Text>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Not authenticated → show auth screens
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : !group ? (
        // Authenticated but no group → show join/create
        <Stack.Screen
          name="JoinCreateGroup"
          component={JoinCreateGroupScreen}
          options={{ headerShown: false }}
        />
      ) : (
        // Authenticated + has group → show main app
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: theme.typography.fontSizes.h1,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: theme.typography.fontSizes.body,
    color: theme.colors.textSecondary,
  },
});

export default AppNavigator;
