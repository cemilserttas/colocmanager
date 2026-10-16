import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/authService';
import { useGroupStore } from './useGroupStore';
import { useShoppingStore } from './useShoppingStore';
import { useCleaningStore } from './useCleaningStore';

/**
 * State and action interface for authentication store.
 */
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  /**
   * Initializes Firebase auth state listener.
   * Updates user and authentication state on changes.
   */
  initialize: () => void;

  /**
   * Registers a new user with email, password, and display name.
   */
  signUp: (email: string, password: string, displayName: string) => Promise<void>;

  /**
   * Signs in an existing user with email and password.
   */
  signIn: (email: string, password: string) => Promise<void>;

  /**
   * Signs out the current user and clears session state.
   */
  signOut: () => Promise<void>;

  /**
   * Sends password reset email.
   */
  resetPassword: (email: string) => Promise<void>;

  /**
   * Clears any active error message.
   */
  clearError: () => void;

  /**
   * Quick sign-in using demo profile.
   */
  signInDemo: () => Promise<void>;

  /**
   * Manually sets or clears the current user.
   */
  setUser: (user: User | null) => void;

  /**
   * Refreshes user profile from Firestore.
   */
  refreshUser: () => Promise<void>;
}

// Module-level variable to avoid duplicate onAuthStateChanged subscriptions
let authUnsubscribe: (() => void) | null = null;

/**
 * Zustand store for managing authentication status, active user profile,
 * and authentication operations.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: () => {
    // Avoid attaching multiple concurrent auth listeners
    if (authUnsubscribe) {
      return;
    }

    set({ isLoading: true });

    authUnsubscribe = authService.onAuthStateChanged((user) => {
      set({
        user,
        isAuthenticated: !!user,
        isLoading: false,
        error: null,
      });
    });
  },

  signUp: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signUp(email, password, displayName);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Erreur lors de l'inscription.";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signIn(email, password);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Identifiants invalides.';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  signInDemo: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signInDemo();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({ error: error?.message || 'Erreur mode démo', isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.signOut();
      // Purge cached flatshare data across stores to prevent stale data leak
      useGroupStore.getState().reset();
      useShoppingStore.getState().reset();
      useCleaningStore.getState().reset();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Erreur lors de la déconnexion.';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.resetPassword(email);
      set({ isLoading: false, error: null });
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Erreur lors de la réinitialisation du mot de passe.';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  refreshUser: async () => {
    const current = get().user;
    if (!current?.uid) return;
    try {
      const freshUser = await authService.getUserProfile(current.uid);
      if (freshUser) {
        set({
          user: freshUser,
          isAuthenticated: true,
        });
      }
    } catch {}
  },
}));

export default useAuthStore;
