/**
 * Mock & LocalStorage service for ColocManager.
 * Automatically activates when Firebase keys are not configured ('YOUR_API_KEY'),
 * allowing the user to immediately test and use the app on mobile or web
 * without configuring a Firebase project first.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Group, GroupMember, Product, CleaningTask, PurchaseRecord, CleaningRecord, AppNotification } from '../types';
import { firebaseConfig } from '../../firebase.config';

export const isDemoMode = (): boolean => {
  return !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('YOUR_');
};

const STORAGE_KEYS = {
  USER: '@coloc_mock_user',
  GROUP: '@coloc_mock_group',
  MEMBERS: '@coloc_mock_members',
  PRODUCTS: '@coloc_mock_products',
  CLEANING: '@coloc_mock_cleaning',
  PURCHASE_HISTORY: '@coloc_mock_purchase_history',
  CLEANING_HISTORY: '@coloc_mock_cleaning_history',
  NOTIFICATIONS: '@coloc_mock_notifications',
};

// Default seed data for immediate demonstration
const DEFAULT_USER: User = {
  id: 'user-me',
  uid: 'user-me',
  displayName: 'Alex (Toi)',
  email: 'alex@coloc.fr',
  createdAt: new Date().toISOString(),
};

const DEFAULT_MEMBERS: GroupMember[] = [
  {
    id: 'user-me',
    memberId: 'user-me',
    userId: 'user-me',
    groupId: 'group-1',
    displayName: 'Alex (Toi)',
    email: 'alex@coloc.fr',
    role: 'admin',
    orderIndex: 0,
    joinedAt: new Date().toISOString(),
  },
  {
    id: 'user-marie',
    memberId: 'user-marie',
    userId: 'user-marie',
    groupId: 'group-1',
    displayName: 'Marie',
    email: 'marie@coloc.fr',
    role: 'member',
    orderIndex: 1,
    joinedAt: new Date().toISOString(),
  },
  {
    id: 'user-lucas',
    memberId: 'user-lucas',
    userId: 'user-lucas',
    groupId: 'group-1',
    displayName: 'Lucas',
    email: 'lucas@coloc.fr',
    role: 'member',
    orderIndex: 2,
    joinedAt: new Date().toISOString(),
  },
  {
    id: 'user-sophie',
    memberId: 'user-sophie',
    userId: 'user-sophie',
    groupId: 'group-1',
    displayName: 'Sophie',
    email: 'sophie@coloc.fr',
    role: 'member',
    orderIndex: 3,
    joinedAt: new Date().toISOString(),
  },
];

const DEFAULT_GROUP: Group = {
  id: 'group-1',
  groupId: 'group-1',
  name: '🏠 Coloc des Champions',
  inviteCode: 'COLOC-2026',
  adminUid: 'user-me',
  memberCount: 4,
  createdAt: new Date().toISOString(),
};

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    productId: 'prod-1',
    groupId: 'group-1',
    name: 'Papier toilette',
    icon: '🧻',
    currentTurnIndex: 0, // It's user-me's turn!
    rotationOrder: ['user-me', 'user-marie', 'user-lucas', 'user-sophie'],
    isActive: true,
    needsRestock: false,
    lastPurchasedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    lastPurchasedBy: 'Sophie',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    productId: 'prod-2',
    groupId: 'group-1',
    name: 'Liquide vaisselle',
    icon: '🧽',
    currentTurnIndex: 1, // Tour de Marie
    rotationOrder: ['user-me', 'user-marie', 'user-lucas', 'user-sophie'],
    isActive: true,
    needsRestock: false,
    lastPurchasedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    lastPurchasedBy: 'Lucas',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    productId: 'prod-3',
    groupId: 'group-1',
    name: 'Tablettes lave-vaisselle',
    icon: '🫧',
    currentTurnIndex: 2, // Tour de Lucas
    rotationOrder: ['user-me', 'user-marie', 'user-lucas', 'user-sophie'],
    isActive: true,
    needsRestock: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-4',
    productId: 'prod-4',
    groupId: 'group-1',
    name: 'Essuie-tout',
    icon: '🧻',
    currentTurnIndex: 3, // Tour de Sophie
    rotationOrder: ['user-me', 'user-marie', 'user-lucas', 'user-sophie'],
    isActive: true,
    needsRestock: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_CLEANING: CleaningTask[] = [
  {
    id: 'task-1',
    taskId: 'task-1',
    groupId: 'group-1',
    name: 'Nettoyer salle de bain',
    area: 'Salle de bain',
    frequency: 'weekly',
    currentTurnIndex: 0, // Tour de Alex (Toi !)
    rotationOrder: ['user-me', 'user-marie', 'user-lucas', 'user-sophie'],
    nextDueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    taskId: 'task-2',
    groupId: 'group-1',
    name: 'Nettoyer cuisine & plaques',
    area: 'Cuisine',
    frequency: 'weekly',
    currentTurnIndex: 1, // Tour de Marie
    rotationOrder: ['user-me', 'user-marie', 'user-lucas', 'user-sophie'],
    nextDueDate: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    taskId: 'task-3',
    groupId: 'group-1',
    name: 'Poubelles & Tri sélectif',
    area: 'Entrée',
    frequency: 'weekly',
    currentTurnIndex: 2, // Tour de Lucas
    rotationOrder: ['user-me', 'user-marie', 'user-lucas', 'user-sophie'],
    nextDueDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), // En retard !
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-4',
    taskId: 'task-4',
    groupId: 'group-1',
    name: 'Passer l\'aspirateur salon',
    area: 'Salon',
    frequency: 'biweekly',
    currentTurnIndex: 3, // Tour de Sophie
    rotationOrder: ['user-me', 'user-marie', 'user-lucas', 'user-sophie'],
    nextDueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export const mockStorage = {
  async initDemoData(): Promise<User> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_USER));
    await AsyncStorage.setItem(STORAGE_KEYS.GROUP, JSON.stringify(DEFAULT_GROUP));
    await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(DEFAULT_MEMBERS));
    await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    await AsyncStorage.setItem(STORAGE_KEYS.CLEANING, JSON.stringify(DEFAULT_CLEANING));
    return DEFAULT_USER;
  },

  async getUser(): Promise<User | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },

  async setUser(user: User | null): Promise<void> {
    if (!user) {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
  },

  async getGroup(): Promise<Group | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.GROUP);
    return raw ? JSON.parse(raw) : null;
  },

  async setGroup(group: Group | null): Promise<void> {
    if (!group) {
      await AsyncStorage.removeItem(STORAGE_KEYS.GROUP);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.GROUP, JSON.stringify(group));
    }
  },

  async getMembers(): Promise<GroupMember[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.MEMBERS);
    return raw ? JSON.parse(raw) : [];
  },

  async setMembers(members: GroupMember[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  },

  async getProducts(): Promise<Product[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return raw ? JSON.parse(raw) : [];
  },

  async setProducts(products: Product[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  async getCleaning(): Promise<CleaningTask[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CLEANING);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEYS.CLEANING, JSON.stringify(DEFAULT_CLEANING));
      return DEFAULT_CLEANING;
    }
    return JSON.parse(raw);
  },

  async setCleaning(tasks: CleaningTask[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CLEANING, JSON.stringify(tasks));
  },

  async getPurchaseHistory(productId: string): Promise<PurchaseRecord[]> {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEYS.PURCHASE_HISTORY}_${productId}`);
    return raw ? JSON.parse(raw) : [];
  },

  async addPurchaseRecord(productId: string, buyerUid: string, notes?: string): Promise<void> {
    const history = await this.getPurchaseHistory(productId);
    const newRecord: PurchaseRecord = {
      id: `record-${Date.now()}`,
      recordId: `record-${Date.now()}`,
      productId,
      buyerUid,
      purchasedAt: new Date().toISOString(),
      notes,
    };
    history.unshift(newRecord);
    await AsyncStorage.setItem(
      `${STORAGE_KEYS.PURCHASE_HISTORY}_${productId}`,
      JSON.stringify(history)
    );
  },

  async getCleaningHistory(taskId: string): Promise<CleaningRecord[]> {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEYS.CLEANING_HISTORY}_${taskId}`);
    return raw ? JSON.parse(raw) : [];
  },

  async addCleaningRecord(taskId: string, cleanerUid: string, notes?: string): Promise<void> {
    const history = await this.getCleaningHistory(taskId);
    const newRecord: CleaningRecord = {
      id: `clean-rec-${Date.now()}`,
      recordId: `clean-rec-${Date.now()}`,
      taskId,
      cleanerUid,
      completedAt: new Date().toISOString(),
      cleanedAt: new Date().toISOString(),
      notes,
    };
    history.unshift(newRecord);
    await AsyncStorage.setItem(
      `${STORAGE_KEYS.CLEANING_HISTORY}_${taskId}`,
      JSON.stringify(history)
    );
  },

  async getNotifications(userId?: string): Promise<AppNotification[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const list: AppNotification[] = raw ? JSON.parse(raw) : [];
    if (!userId) return list;
    return list.filter((n) => n.recipientUid === userId);
  },

  async addNotification(notif: AppNotification): Promise<void> {
    const list = await this.getNotifications();
    list.unshift(notif);
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
  },

  async markNotificationRead(notifId: string): Promise<void> {
    const list = await this.getNotifications();
    const target = list.find((n) => n.id === notifId);
    if (target) {
      target.isRead = true;
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    }
  },

  async clearAll(): Promise<void> {
    for (const key of Object.values(STORAGE_KEYS)) {
      try {
        await AsyncStorage.removeItem(key);
      } catch {}
    }
  },
};
