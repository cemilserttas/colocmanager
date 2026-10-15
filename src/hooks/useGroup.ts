import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useGroupStore } from '../store/useGroupStore';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Custom React hook for managing group context, roommates, and group administrative actions.
 * Automatically loads the user's group on mount and sets up real-time synchronization.
 *
 * @returns Group state, member list, computed admin status, and group mutations
 */
export function useGroup() {
  const user = useAuthStore((state) => state.user);

  const group = useGroupStore((state) => state.group);
  const members = useGroupStore((state) => state.members);
  const isLoading = useGroupStore((state) => state.isLoading);
  const error = useGroupStore((state) => state.error);

  const loadUserGroup = useGroupStore((state) => state.loadUserGroup);
  const createGroupStore = useGroupStore((state) => state.createGroup);
  const joinGroupStore = useGroupStore((state) => state.joinGroup);
  const removeMemberStore = useGroupStore((state) => state.removeMember);
  const transferAdmin = useGroupStore((state) => state.transferAdmin);
  const regenerateInviteCodeStore = useGroupStore((state) => state.regenerateInviteCode);
  const subscribeToGroupUpdates = useGroupStore((state) => state.subscribeToGroupUpdates);
  const subscribeToMemberUpdates = useGroupStore((state) => state.subscribeToMemberUpdates);
  const clearError = useGroupStore((state) => state.clearError);
  const reset = useGroupStore((state) => state.reset);

  const loadedUserRef = useRef<string | null>(null);

  // On mount or user change, load user's group if not yet loaded
  useEffect(() => {
    if (!user?.uid) {
      loadedUserRef.current = null;
      return;
    }
    if (!group && loadedUserRef.current !== user.uid) {
      loadedUserRef.current = user.uid;
      loadUserGroup(user.uid).catch(() => {
        // Errors are captured inside the store state
      });
    }
  }, [user?.uid, group, loadUserGroup]);

  // Set up real-time subscriptions when group exists and clean up on unmount or group change
  const currentGroupId = group?.id || group?.groupId;
  useEffect(() => {
    if (!currentGroupId) {
      return;
    }

    const unsubGroup = subscribeToGroupUpdates(currentGroupId);
    const unsubMembers = subscribeToMemberUpdates(currentGroupId);

    return () => {
      unsubGroup();
      unsubMembers();
    };
  }, [currentGroupId, subscribeToGroupUpdates, subscribeToMemberUpdates]);

  // Computed property: true if current authenticated user is the group administrator
  const isAdmin = useMemo(() => {
    if (!group || !user?.uid) {
      return false;
    }
    return group.adminUid === user.uid;
  }, [group, user?.uid]);

  const createGroup = useCallback(
    async (name: string, adminUid?: string) => {
      const uid = adminUid || user?.uid;
      if (!uid) throw new Error('Utilisateur non connecté');
      return createGroupStore(name, uid);
    },
    [user?.uid, createGroupStore]
  );

  const joinGroup = useCallback(
    async (inviteCode: string, userId?: string) => {
      const uid = userId || user?.uid;
      if (!uid) throw new Error('Utilisateur non connecté');
      return joinGroupStore(inviteCode, uid);
    },
    [user?.uid, joinGroupStore]
  );

  const removeMember = useCallback(
    async (arg1: string, arg2?: string) => {
      if (arg2) {
        return removeMemberStore(arg1, arg2);
      }
      const gId = group?.id || group?.groupId;
      if (!gId) throw new Error('Aucun groupe actif');
      return removeMemberStore(gId, arg1);
    },
    [group?.id, group?.groupId, removeMemberStore]
  );

  const regenerateInviteCode = useCallback(
    async (targetGroupId?: string) => {
      const gId = targetGroupId || group?.id || group?.groupId;
      if (!gId) throw new Error('Aucun groupe actif');
      return regenerateInviteCodeStore(gId);
    },
    [group?.id, group?.groupId, regenerateInviteCodeStore]
  );

  const leaveGroup = useCallback(async () => {
    const gId = group?.id || group?.groupId;
    if (!gId || !user?.uid) return;
    await removeMemberStore(gId, user.uid);
    reset();
  }, [group?.id, group?.groupId, user?.uid, removeMemberStore, reset]);

  return {
    group,
    members,
    isLoading,
    loading: isLoading,
    error,
    isAdmin,
    loadUserGroup,
    createGroup,
    joinGroup,
    removeMember,
    transferAdmin,
    regenerateInviteCode,
    leaveGroup,
    clearError,
    reset,
  };
}

export default useGroup;
