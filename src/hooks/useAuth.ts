import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { authService } from '../services/authService';
import { User } from '../types';

/**
 * Custom React hook for accessing authentication state and actions.
 * Automatically initializes the Firebase auth state listener on mount.
 *
 * @returns Object containing user profile, auth flags, and authentication methods
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const error = useAuthStore((state) => state.error);
  const initialize = useAuthStore((state) => state.initialize);
  const signUp = useAuthStore((state) => state.signUp);
  const signIn = useAuthStore((state) => state.signIn);
  const signInDemo = useAuthStore((state) => state.signInDemo);
  const signOut = useAuthStore((state) => state.signOut);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const clearError = useAuthStore((state) => state.clearError);
  const setUser = useAuthStore((state) => state.setUser);

  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      initialize();
    }
  }, [initialize]);

  const updateUserProfile = useCallback(
    async (data: Partial<User>) => {
      if (!user) return;
      await authService.updateUserProfile(user.uid, data);
      setUser({ ...user, ...data });
    },
    [user, setUser]
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      await authService.updateCurrentUserPassword(newPassword);
    },
    []
  );

  return {
    user,
    isLoading,
    loading: isLoading,
    isAuthenticated,
    error,
    signUp,
    register: signUp,
    signIn,
    login: signIn,
    signInDemo,
    signOut,
    logout: signOut,
    resetPassword,
    updateUserProfile,
    updatePassword,
    clearError,
  };
}

export default useAuth;
