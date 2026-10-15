import { User } from './user';
import { Group } from './group';

export interface GroupSizeDistribution {
  single: number;   // 1 member
  small: number;    // 2-3 members
  medium: number;   // 4-5 members
  large: number;    // 6+ members
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  superAdminsCount: number;
  totalGroups: number;
  totalProducts: number;
  totalCleaningTasks: number;
  completedTasks: number;
  averageMembersPerGroup: number;
  groupSizeDistribution: GroupSizeDistribution;
}

export type AdminAuditAction =
  | 'SUSPEND_USER'
  | 'ACTIVATE_USER'
  | 'DELETE_USER'
  | 'DELETE_GROUP'
  | 'CREATE_USER'
  | 'PROMOTE_ADMIN'
  | 'DEMOTE_ADMIN'
  | 'TRANSFER_ADMIN';

export interface AuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: AdminAuditAction;
  targetId: string;
  targetName: string;
  details: string;
  timestamp: string;
}

export interface SystemBroadcast {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'warning' | 'urgent';
  active: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  displayName: string;
  isSuperAdmin?: boolean;
  groupId?: string | null;
  createGroupWithName?: string | null;
}
