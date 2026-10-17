/**
 * Product interface representing a shared grocery or household item tracked by rotation.
 */
export interface Product {
  id: string;
  productId?: string;
  groupId: string;
  name: string;
  icon: string;
  comment?: string;
  currentTurnIndex: number;
  rotationOrder: string[];
  isActive: boolean;
  needsRestock?: boolean;
  lastPurchasedAt?: Date | string | null;
  lastPurchasedBy?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

/**
 * PurchaseRecord interface tracking each time a product was bought by a group member.
 */
export interface PurchaseRecord {
  id?: string;
  recordId?: string;
  productId: string;
  buyerUid: string;
  purchasedAt: Date | string;
  notes?: string;
}
