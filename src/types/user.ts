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
}
