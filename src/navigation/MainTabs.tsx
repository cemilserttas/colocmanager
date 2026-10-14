/**
 * Main Tab Navigator
 * Bottom tabs for Dashboard, Shopping, Cleaning, and Profile
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabParamList, ShoppingStackParamList, CleaningStackParamList, ProfileStackParamList } from './types';
import { theme } from '../constants/theme';

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

// Shopping Stack
const ShoppingStack = createNativeStackNavigator<ShoppingStackParamList>();

const ShoppingNavigator: React.FC = () => (
  <ShoppingStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <ShoppingStack.Screen
      name="ShoppingList"
      component={ShoppingListScreen}
      options={{ headerTitle: '🛒 Achats' }}
    />
    <ShoppingStack.Screen
      name="ProductDetail"
      component={ProductDetailScreen}
      options={{ headerTitle: 'Détail produit' }}
    />
    <ShoppingStack.Screen
      name="AddProduct"
      component={AddProductScreen}
      options={{ headerTitle: 'Nouveau produit' }}
    />
  </ShoppingStack.Navigator>
);

// Cleaning Stack
const CleaningStack = createNativeStackNavigator<CleaningStackParamList>();

const CleaningNavigator: React.FC = () => (
  <CleaningStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: theme.colors.secondary },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <CleaningStack.Screen
      name="CleaningList"
      component={CleaningListScreen}
      options={{ headerTitle: '🧹 Nettoyage' }}
    />
    <CleaningStack.Screen
      name="CleaningDetail"
      component={CleaningDetailScreen}
      options={{ headerTitle: 'Détail tâche' }}
    />
    <CleaningStack.Screen
      name="AddCleaningTask"
      component={AddCleaningTaskScreen}
      options={{ headerTitle: 'Nouvelle tâche' }}
    />
  </CleaningStack.Navigator>
);

// Profile Stack
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileNavigator: React.FC = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <ProfileStack.Screen
      name="ProfileMain"
      component={ProfileScreen}
      options={{ headerTitle: '👤 Profil' }}
    />
    <ProfileStack.Screen
      name="ManageMembers"
      component={ManageMembersScreen}
      options={{ headerTitle: 'Gestion des membres' }}
    />
  </ProfileStack.Navigator>
);

// Bottom Tab Navigator
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <TabIcon emoji="🏠" size={size} />
          ),
          headerShown: true,
          headerTitle: '🏠 ColocManager',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Tab.Screen
        name="Shopping"
        component={ShoppingNavigator}
        options={{
          tabBarLabel: 'Achats',
          tabBarIcon: ({ color, size }) => (
            <TabIcon emoji="🛒" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Cleaning"
        component={CleaningNavigator}
        options={{
          tabBarLabel: 'Nettoyage',
          tabBarIcon: ({ color, size }) => (
            <TabIcon emoji="🧹" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <TabIcon emoji="👤" size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Simple emoji-based tab icon component
 */
import { Text } from 'react-native';

const TabIcon: React.FC<{ emoji: string; size: number }> = ({ emoji, size }) => (
  <Text style={{ fontSize: size - 4 }}>{emoji}</Text>
);

export default MainTabs;
