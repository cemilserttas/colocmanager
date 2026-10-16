/**
 * Main Tab Navigator
 * Apple Liquid Glass floating island bottom navigation pill
 * Inspiring visionOS / iOS design as shown in user reference
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import InventoryScreen from '../screens/inventory/InventoryScreen';

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
        options={{ headerShown: false }}
      />
      <ShoppingStack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ headerShown: false }}
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
        options={{ headerShown: false }}
      />
      <CleaningStack.Screen
        name="AddCleaningTask"
        component={AddCleaningTaskScreen}
        options={{ headerShown: false }}
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
        options={{ headerShown: false }}
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
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

  const currentRoute = state.routes[state.index];
  const focusedRouteName = getFocusedRouteNameFromRoute(currentRoute);

  const hiddenScreens = [
    'ProductDetail',
    'AddProduct',
    'CleaningDetail',
    'AddCleaningTask',
    'ManageMembers',
    'AdminPortal',
  ];

  if (focusedRouteName && hiddenScreens.includes(focusedRouteName)) {
    return null;
  }

  const tabLabels: Record<string, { labelKey: any; emoji: string }> = {
    Dashboard: { labelKey: 'home', emoji: '🏠' },
    Shopping: { labelKey: 'shopping', emoji: '🛒' },
    Inventory: { labelKey: 'inventory', emoji: '📦' },
    Cleaning: { labelKey: 'cleaning', emoji: '🧹' },
    Profile: { labelKey: 'profile', emoji: '👤' },
  };

  const bottomOffset = (Platform.OS === 'web' ? 16 : 12) + insets.bottom;

  return (
    <View style={[styles.floatingBarWrapper, { bottom: bottomOffset }]}>
      <View
        style={[
          styles.floatingBarPill,
          {
            backgroundColor: isDark ? 'rgba(20, 24, 38, 0.96)' : 'rgba(255, 255, 255, 0.97)',
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
        name="Inventory"
        component={InventoryScreen}
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
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    paddingVertical: 2,
    marginHorizontal: 2,
  },
  activeBubble: {
    borderWidth: 1.2,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  tabEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabEmojiFocused: {
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});

export default MainTabs;
