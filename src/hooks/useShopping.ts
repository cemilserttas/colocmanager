import { useCallback } from 'react';
import { useProducts } from './useProducts';
import { useAuthStore } from '../store/useAuthStore';
import { useGroupStore } from '../store/useGroupStore';

export function useShopping() {
  const productsHook = useProducts();
  const user = useAuthStore((state) => state.user);
  const group = useGroupStore((state) => state.group);

  const currentGroupId = group?.id || group?.groupId;

  const addProduct = useCallback(
    async (...args: any[]) => {
      if (args.length === 3 || args.length === 4) {
        // addProduct(name, icon, rotationOrder, comment?)
        const [name, icon, rotationOrder, comment] = args;
        if (!currentGroupId) throw new Error('Aucun groupe actif');
        return productsHook.addProduct(name, icon, rotationOrder, comment);
      }
      return (productsHook.addProduct as any)(...args);
    },
    [currentGroupId, productsHook]
  );

  const markAsPurchased = useCallback(
    async (productId: string, buyerUid?: string, notes?: string) => {
      const uid = buyerUid || user?.uid;
      if (!uid) throw new Error('Utilisateur non connecté');
      return productsHook.markPurchaseComplete(productId, uid, notes);
    },
    [user?.uid, productsHook]
  );

  const requestRestock = useCallback(
    async (productId: string, senderDisplayName?: string) => {
      return productsHook.requestRestock(productId, user?.uid, senderDisplayName || user?.displayName);
    },
    [user?.uid, user?.displayName, productsHook]
  );

  const requestRestockMultiple = useCallback(
    async (productIds: string[], senderDisplayName?: string) => {
      return productsHook.requestRestockMultiple(productIds, user?.uid, senderDisplayName || user?.displayName);
    },
    [user?.uid, user?.displayName, productsHook]
  );

  const cancelRestock = useCallback(
    async (productId: string) => {
      return productsHook.cancelRestock(productId);
    },
    [productsHook]
  );

  const cancelRestockMultiple = useCallback(
    async (productIds: string[]) => {
      return productsHook.cancelRestockMultiple(productIds);
    },
    [productsHook]
  );

  return {
    ...productsHook,
    loading: productsHook.isLoading,
    addProduct,
    deleteProduct: productsHook.removeProduct,
    markAsPurchased,
    requestRestock,
    requestRestockMultiple,
    cancelRestock,
    cancelRestockMultiple,
    fetchProducts: productsHook.loadProducts,
    fetchProductHistory: productsHook.getProductHistory,
  };
}

export default useShopping;
