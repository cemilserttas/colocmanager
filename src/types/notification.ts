export type NotificationType =
  | 'purchase_turn'
  | 'cleaning_turn'
  | 'reminder'
  | 'member_joined'
  | 'member_left'
  | string;

/**
 * AppNotification interface representing in-app / push notification alerts for roommates.
 */
export interface AppNotification {
  id: string;
  notifId?: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: Date | string;
}
