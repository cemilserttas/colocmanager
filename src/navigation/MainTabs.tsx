/**
 * Main Tab Navigator
 * Apple Liquid Glass floating island bottom navigation pill
 * Inspiring visionOS / iOS design as shown in user reference
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native-paper';
import { MainTabParamList, ShoppingStackParamList, CleaningStackParamList, ProfileStackParamList } from './types';
import { useThemeStore, getLiquidGlassTokens } from '../store/useThemeStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { soundService } from '../services/soundService';

// Screens
import DashboardScreen from '../screens/home/DashboardScreen';
import ShoppingListScreen from '../screens/shopping/ShoppingListScreen';
import ProductDetailScreen from '../screens/shopping/ProductDetailScreen';
import AddProductScreen from '../screens/shopping/AddProductScreen';
import CleaningListScreen from '../screens/cleaning/CleaningListScreen';
import CleaningDetailScreen from '../screens/cleaning/CleaningDetailScreen';
import AddCleaningTaskScreen from '../screens/cleaning/AddCleaningTaskScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ManageMembersScreen from '../screens/group/ManageMembersScreen';
import AdminPortalScreen from '../screens/admin/AdminPortalScreen';

// Shopping Stack
const ShoppingStack = createNativeStackNavigator<ShoppingStackParamList>();

const ShoppingNavigator: React.FC = () => {
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

  return (
    <ShoppingStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: tokens.bg },
        headerTintColor: tokens.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
      }}
    >
      <ShoppingStack.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{ headerTitle: t('shoppingTitle') }}
      />
      <ShoppingStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ headerTitle: 'Détail produit' }}
      />
      <ShoppingStack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ headerTitle: t('addProductTitle') }}
      />
    </ShoppingStack.Navigator>
  );
};

// Cleaning Stack
const CleaningStack = createNativeStackNavigator<CleaningStackParamList>();

const CleaningNavigator: React.FC = () => {
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

  return (
    <CleaningStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: tokens.bg },
        headerTintColor: tokens.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
      }}
    >
      <CleaningStack.Screen
        name="CleaningList"
        component={CleaningListScreen}
        options={{ headerTitle: t('cleaningTitle') }}
      />
      <CleaningStack.Screen
        name="CleaningDetail"
        component={CleaningDetailScreen}
        options={{ headerTitle: 'Détail tâche' }}
      />
      <CleaningStack.Screen
        name="AddCleaningTask"
        component={AddCleaningTaskScreen}
        options={{ headerTitle: t('addChoreTitle') }}
      />
    </CleaningStack.Navigator>
  );
};

// Profile Stack
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileNavigator: React.FC = () => {
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: tokens.bg },
        headerTintColor: tokens.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
      }}
    >
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerTitle: `👤 ${t('profile')}` }}
      />
      <ProfileStack.Screen
        name="ManageMembers"
        component={ManageMembersScreen}
        options={{ headerTitle: t('membersTitle') }}
      />
      <ProfileStack.Screen
        name="AdminPortal"
        component={AdminPortalScreen}
        options={{ headerShown: false }}
      />
    </ProfileStack.Navigator>
  );
};

// Custom Apple Liquid Glass Tab Bar
function LiquidGlassTabBar({ state, descriptors, navigation }: any) {
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

  const tabLabels: Record<string, { labelKey: any; emoji: string }> = {
    Dashboard: { labelKey: 'home', emoji: '🏠' },
    Shopping: { labelKey: 'shopping', emoji: '🛒' },
    Cleaning: { labelKey: 'cleaning', emoji: '🧹' },
    Profile: { labelKey: 'profile', emoji: '👤' },
  };

  return (
    <View style={styles.floatingBarWrapper}>
      <View
        style={[
          styles.floatingBarPill,
          {
            backgroundColor: isDark ? 'rgba(18, 20, 30, 0.88)' : 'rgba(255, 255, 255, 0.92)',
            borderColor: tokens.border,
            shadowColor: isDark ? '#000' : '#64748B',
          },
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const { labelKey, emoji } = tabLabels[route.name] || { labelKey: route.name, emoji: '📌' };
          const label = t(labelKey);

          const onPress = () => {
            soundService.playPopSound();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={[
                styles.tabItem,
                isFocused && [
                  styles.activeBubble,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.16)'
                      : 'rgba(10, 132, 255, 0.12)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(10, 132, 255, 0.3)',
                  },
                ],
              ]}
            >
              <Text style={[styles.tabEmoji, isFocused && styles.tabEmojiFocused]}>
                {emoji}
              </Text>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused
                      ? tokens.primary
                      : tokens.textSecondary,
                    fontWeight: isFocused ? '800' : '600',
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Bottom Tab Navigator
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs: React.FC = () => {
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

  return (
    <Tab.Navigator
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Shopping"
        component={ShoppingNavigator}
      />
      <Tab.Screen
        name="Cleaning"
        component={CleaningNavigator}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  floatingBarWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 16 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  floatingBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 460,
    height: 64,
    borderRadius: 36,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingVertical: 4,
    marginHorizontal: 3,
  },
  activeBubble: {
    borderWidth: 1,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  tabEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabEmojiFocused: {
    transform: [{ scale: 1.15 }],
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

export default MainTabs;
