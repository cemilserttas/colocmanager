import { create } from 'zustand';
import { Group, GroupMember } from '../types';
import { groupService } from '../services/groupService';

/**
 * State and action interface for group management store.
 */
export interface GroupState {
  group: Group | null;
  members: GroupMember[];
  isLoading: boolean;
  error: string | null;

  /**
   * Finds and loads the group that the given user belongs to, including its members.
   */
  loadUserGroup: (userId: string) => Promise<void>;

  /**
   * Creates a new group and designates the creator as admin.
   */
  createGroup: (name: string, adminUid: string) => Promise<void>;

  /**
   * Joins an existing group using an invite code.
   */
  joinGroup: (inviteCode: string, userId: string) => Promise<void>;

  /**
   * Removes a member from the group.
   */
  removeMember: (groupId: string, userId: string) => Promise<void>;

  /**
   * Transfers group admin status to a designated member.
   */
  transferAdmin: (groupId: string, newAdminUid: string) => Promise<void>;

  /**
   * Generates and assigns a new invite code for the group.
   *
   * @returns The newly generated code string
   */
  regenerateInviteCode: (groupId: string) => Promise<string>;

  /**
   * Subscribes to real-time changes to the group document.
   *
   * @returns Unsubscribe function
   */
  subscribeToGroupUpdates: (groupId: string) => () => void;

  /**
   * Subscribes to real-time changes to the group's members subcollection.
   *
   * @returns Unsubscribe function
   */
  subscribeToMemberUpdates: (groupId: string) => () => void;

  /**
   * Checks synchronously whether the specified user ID is the admin of the active group.
   */
  isAdmin: (userId: string) => boolean;

  /**
   * Clears any active error state.
   */
  clearError: () => void;

  /**
   * Resets all store state back to initial default values.
   */
  reset: () => void;
}

/**
 * Zustand store for roommate group data, member roster, and group administration actions.
 */
export const useGroupStore = create<GroupState>((set, get) => ({
  group: null,
  members: [],
  isLoading: false,
  error: null,

  loadUserGroup: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await groupService.getUserGroup(userId);
      if (!result) {
        set({
          group: null,
          members: [],
          isLoading: false,
          error: null,
        });
        return;
      }

      const members = await groupService.getGroupMembers(result.group.id);
      set({
        group: result.group,
        members,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.warn('loadUserGroup caught error:', error);
      const errorMessage =
        error?.message || 'Erreur lors du chargement de la colocation.';
      set({ group: null, members: [], error: errorMessage, isLoading: false });
    }
  },

  createGroup: async (name: string, adminUid: string) => {
    set({ isLoading: true, error: null });
    try {
      const newGroup = await groupService.createGroup(name, adminUid);
      const members = await groupService.getGroupMembers(newGroup.id);
      set({
        group: newGroup,
        members,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Erreur lors de la création de la colocation.';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  joinGroup: async (inviteCode: string, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const joinedGroup = await groupService.joinGroup(inviteCode, userId);
      const members = await groupService.getGroupMembers(joinedGroup.id);
      set({
        group: joinedGroup,
        members,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage =
        error?.message || "Impossible de rejoindre la colocation avec ce code.";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  removeMember: async (groupId: string, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      await groupService.removeMember(groupId, userId);
      set((state) => ({
        members: state.members.filter((member) => member.userId !== userId),
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Erreur lors du retrait du membre.';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  transferAdmin: async (groupId: string, newAdminUid: string) => {
    set({ isLoading: true, error: null });
    try {
      await groupService.transferAdmin(groupId, newAdminUid);
      set((state) => ({
        group: state.group ? { ...state.group, adminUid: newAdminUid } : null,
        members: state.members.map((member) => {
          if (member.userId === newAdminUid) {
            return { ...member, role: 'admin' };
          }
          if (member.role === 'admin') {
            return { ...member, role: 'member' };
          }
          return member;
        }),
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage =
        error?.message || "Erreur lors du transfert des droits d'administrateur.";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  regenerateInviteCode: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      const newCode = await groupService.regenerateInviteCode(groupId);
      set((state) => ({
        group: state.group ? { ...state.group, inviteCode: newCode } : null,
        isLoading: false,
        error: null,
      }));
      return newCode;
    } catch (error: any) {
      const errorMessage =
        error?.message || "Erreur lors de la régénération du code d'invitation.";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  subscribeToGroupUpdates: (groupId: string) => {
    return groupService.subscribeToGroup(groupId, (updatedGroup) => {
      set({ group: updatedGroup });
    });
  },

  subscribeToMemberUpdates: (groupId: string) => {
    return groupService.subscribeToMembers(groupId, (updatedMembers) => {
      set({ members: updatedMembers });
    });
  },

  isAdmin: (userId: string) => {
    const { group } = get();
    if (!group || !userId) {
      return false;
    }
    return group.adminUid === userId;
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      group: null,
      members: [],
      isLoading: false,
      error: null,
    });
  },
}));

export default useGroupStore;
