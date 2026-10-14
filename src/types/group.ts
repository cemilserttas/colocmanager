export type GroupRole = 'admin' | 'member';

/**
 * Group interface representing a shared flat / colocation.
 */
export interface Group {
  id: string;
  groupId?: string;
  name: string;
  inviteCode: string;
  adminUid: string;
  memberCount?: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

/**
 * GroupMember interface representing membership of a user in a group with turn order.
 */
export interface GroupMember {
  id: string;
  memberId?: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  orderIndex?: number;
  displayName?: string;
  email?: string;
  photoURL?: string | null;
  joinedAt: Date | string;
}
