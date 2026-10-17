import { useEffect, useMemo, useCallback } from 'react';
import { useShoppingStore } from '../store/useShoppingStore';
import { useGroupStore } from '../store/useGroupStore';
import { Product, PurchaseRecord, GroupMember } from '../types';
import { getCurrentAssignee } from '../utils/rotation';

/**
 * Product extended with resolved current buyer details.
 */
export interface ProductWithBuyer extends Product {
  currentBuyerUid: string;
  currentBuyer?: GroupMember;
}

/**
 * Custom React hook for managing shopping list products, turn rotations,
 * and purchase records.
 * Automatically synchronizes with the current group's products and cleans up subscriptions on unmount.
 *
 * @returns Product state, current buyers, actions for adding/removing/purchasing, and rotation utilities
 */
export function useProducts() {
  const group = useGroupStore((state) => state.group);
  const members = useGroupStore((state) => state.members);

  const products = useShoppingStore((state) => state.products);
  const isLoading = useShoppingStore((state) => state.isLoading);
  const error = useShoppingStore((state) => state.error);

  const loadProducts = useShoppingStore((state) => state.loadProducts);
  const addProductStore = useShoppingStore((state) => state.addProduct);
  const removeProduct = useShoppingStore((state) => state.removeProduct);
  const updateRotationOrder = useShoppingStore((state) => state.updateRotationOrder);
  const markPurchaseComplete = useShoppingStore((state) => state.markPurchaseComplete);
  const requestRestock = useShoppingStore((state) => state.requestRestock);
  const requestRestockMultiple = useShoppingStore((state) => state.requestRestockMultiple);
  const cancelRestock = useShoppingStore((state) => state.cancelRestock);
  const cancelRestockMultiple = useShoppingStore((state) => state.cancelRestockMultiple);
  const getProductHistory = useShoppingStore((state) => state.getProductHistory);
  const subscribeToProducts = useShoppingStore((state) => state.subscribeToProducts);
  const clearError = useShoppingStore((state) => state.clearError);
  const reset = useShoppingStore((state) => state.reset);

  // Subscribe to real-time products updates when group is active
  const currentGroupId = group?.id || (group as any)?.groupId;
  useEffect(() => {
    if (!currentGroupId) {
      return;
    }

    const unsubscribe = subscribeToProducts(currentGroupId);

    return () => {
      unsubscribe();
    };
  }, [currentGroupId, subscribeToProducts]);

  /**
   * Retrieves the current buyer user ID for a product based on its rotation order and turn index.
   */
  const getCurrentBuyerUid = useCallback((product: Product): string => {
    return getCurrentAssignee(product.rotationOrder, product.currentTurnIndex);
  }, []);

  /**
   * Retrieves the current buyer GroupMember object for a product.
   */
  const getCurrentBuyerMember = useCallback(
    (product: Product): GroupMember | undefined => {
      const buyerUid = getCurrentAssignee(product.rotationOrder, product.currentTurnIndex);
      return members.find((m) => m.userId === buyerUid);
    },
    [members]
  );

  /**
   * Returns both the UID and GroupMember representation for the current buyer of a product.
   */
  const getCurrentBuyer = useCallback(
    (product: Product): { uid: string; member?: GroupMember } => {
      const uid = getCurrentBuyerUid(product);
      const member = members.find((m) => m.userId === uid);
      return { uid, member };
    },
    [getCurrentBuyerUid, members]
  );

  /**
   * Memoized product list where each product is annotated with its current buyer information.
   */
  const productsWithBuyer: ProductWithBuyer[] = useMemo(() => {
    return products.map((product) => {
      const currentBuyerUid = getCurrentAssignee(
        product.rotationOrder,
        product.currentTurnIndex
      );
      const currentBuyer = members.find((m) => m.userId === currentBuyerUid);
      return {
        ...product,
        currentBuyerUid,
        currentBuyer,
      };
    });
  }, [products, members]);

  /**
   * Convenience wrapper around addProduct that defaults the groupId to the current group
   * and rotationOrder to all group members if not explicitly provided.
   */
  const addProduct = useCallback(
    async (name: string, icon: string, rotationOrder?: string[], comment?: string): Promise<void> => {
      const gId = group?.id || (group as any)?.groupId;
      if (!gId) {
        throw new Error('Aucun groupe actif sélectionné.');
      }
      const order =
        rotationOrder && rotationOrder.length > 0
          ? rotationOrder
          : members.map((m) => m.userId || m.id);

      await addProductStore(gId, name, icon, order, comment);
    },
    [group?.id, (group as any)?.groupId, members, addProductStore]
  );

  /**
   * Loads products for the active group or an explicit group ID.
   */
  const loadActiveGroupProducts = useCallback(
    async (targetGroupId?: string): Promise<void> => {
      const gId = targetGroupId || group?.id;
      if (!gId) {
        return;
      }
      await loadProducts(gId);
    },
    [group?.id, loadProducts]
  );

  return {
    products,
    productsWithBuyer,
    isLoading,
    error,
    addProduct,
    removeProduct,
    updateRotationOrder,
    markPurchaseComplete,
    requestRestock,
    requestRestockMultiple,
    cancelRestock,
    cancelRestockMultiple,
    getProductHistory,
    getCurrentBuyer,
    getCurrentBuyerMember,
    getCurrentBuyerUid,
    loadProducts: loadActiveGroupProducts,
    clearError,
    reset,
  };
}

export default useProducts;
