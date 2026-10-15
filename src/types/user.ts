/**
 * User interface representing an authenticated user profile in ColocManager.
 */
export interface User {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  fcmToken?: string | null;
  groupId?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;

  /** Platform Super-Administrator privileges */
  isSuperAdmin?: boolean;

  /** Account status: 'active' or 'suspended' (restricted) */
  status?: 'active' | 'suspended';

  /** Reason provided when restricting account access */
  suspendedReason?: string | null;

  /** Timestamp of account restriction */
  suspendedAt?: string | null;
}
