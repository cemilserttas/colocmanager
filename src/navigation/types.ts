/**
 * Navigation type definitions for ColocManager
 */

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Main Bottom Tabs
export type MainTabParamList = {
  Dashboard: undefined;
  Shopping: NavigatorScreenParams<ShoppingStackParamList>;
  Cleaning: NavigatorScreenParams<CleaningStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// Shopping Stack (nested in tab)
export type ShoppingStackParamList = {
  ShoppingList: undefined;
  ProductDetail: { productId: string };
  AddProduct: undefined;
};

// Cleaning Stack (nested in tab)
export type CleaningStackParamList = {
  CleaningList: undefined;
  CleaningDetail: { taskId: string };
  AddCleaningTask: undefined;
};

// Profile Stack (nested in tab)
export type ProfileStackParamList = {
  ProfileMain: undefined;
  ManageMembers: undefined;
  AdminPortal: undefined;
};

// Root Stack (wraps everything)
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  JoinCreateGroup: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  AdminPortal: undefined;
};

// Screen props types
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;
export type ForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export type JoinCreateGroupScreenProps = NativeStackScreenProps<RootStackParamList, 'JoinCreateGroup'>;

export type DashboardScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ShoppingListScreenProps = NativeStackScreenProps<ShoppingStackParamList, 'ShoppingList'>;
export type ProductDetailScreenProps = NativeStackScreenProps<ShoppingStackParamList, 'ProductDetail'>;
export type AddProductScreenProps = NativeStackScreenProps<ShoppingStackParamList, 'AddProduct'>;

export type CleaningListScreenProps = NativeStackScreenProps<CleaningStackParamList, 'CleaningList'>;
export type CleaningDetailScreenProps = NativeStackScreenProps<CleaningStackParamList, 'CleaningDetail'>;
export type AddCleaningTaskScreenProps = NativeStackScreenProps<CleaningStackParamList, 'AddCleaningTask'>;

export type ProfileMainScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type ManageMembersScreenProps = NativeStackScreenProps<ProfileStackParamList, 'ManageMembers'>;
