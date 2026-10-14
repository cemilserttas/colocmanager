import { create } from 'zustand';
import { Product, PurchaseRecord } from '../types';
import { shoppingService } from '../services/shoppingService';

/**
 * State and action interface for shopping store.
 */
export interface ShoppingState {
  products: Product[];
  isLoading: boolean;
  error: string | null;

  /**
   * Loads all active products for the given group.
   */
  loadProducts: (groupId: string) => Promise<void>;

  /**
   * Adds a new product to the shopping rotation for a group.
   */
  addProduct: (
    groupId: string,
    name: string,
    icon: string,
    rotationOrder: string[]
  ) => Promise<void>;

  /**
   * Soft-deletes a product from the shopping list.
   */
  removeProduct: (productId: string) => Promise<void>;

  /**
   * Updates the member rotation order for a product.
   */
  updateRotationOrder: (productId: string, newOrder: string[]) => Promise<void>;

  /**
   * Records a completed purchase and advances the rotation queue.
   */
  markPurchaseComplete: (
    productId: string,
    buyerUid: string,
    notes?: string
  ) => Promise<void>;

  /**
   * Fetches past purchase logs for a specific product.
   */
  getProductHistory: (
    productId: string,
    limit?: number
  ) => Promise<PurchaseRecord[]>;

  /**
   * Subscribes to real-time changes of active products for a group.
   *
   * @returns Unsubscribe function
   */
  subscribeToProducts: (groupId: string) => () => void;

  /**
   * Clears any active error message.
   */
  clearError: () => void;

  /**
   * Resets all store state back to initial values.
   */
  reset: () => void;
}

/**
 * Zustand store for managing shopping products, turn-based rotation queues,
 * and purchase history records.
 */
export const useShoppingStore = create<ShoppingState>((set) => ({
  products: [],
  isLoading: false,
  error: null,

  loadProducts: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      const products = await shoppingService.getProducts(groupId);
      set({ products, isLoading: false, error: null });
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Erreur lors du chargement des produits.';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  addProduct: async (
    groupId: string,
    name: string,
    icon: string,
    rotationOrder: string[]
  ) => {
    set({ isLoading: true, error: null });
    try {
      const newProduct = await shoppingService.addProduct(
        groupId,
        name,
        icon,
        rotationOrder
      );
      set((state) => ({
        products: [...state.products, newProduct],
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage =
        error?.message || "Erreur lors de l'ajout du produit.";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  removeProduct: async (productId: string) => {
    set({ isLoading: true, error: null });
    try {
      await shoppingService.removeProduct(productId);
      set((state) => ({
        products: state.products.filter((p) => p.id !== productId),
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Erreur lors de la suppression du produit.';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateRotationOrder: async (productId: string, newOrder: string[]) => {
    set({ isLoading: true, error: null });
    try {
      await shoppingService.updateRotationOrder(productId, newOrder);
      set((state) => ({
        products: state.products.map((p) =>
          p.id === productId ? { ...p, rotationOrder: newOrder } : p
        ),
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage =
        error?.message || "Erreur lors de la mise à jour de l'ordre de rotation.";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  markPurchaseComplete: async (
    productId: string,
    buyerUid: string,
    notes?: string
  ) => {
    set({ isLoading: true, error: null });
    try {
      await shoppingService.markPurchaseComplete(productId, buyerUid, notes);
      set((state) => ({
        products: state.products.map((p) => {
          if (p.id !== productId) return p;
          const orderLength = p.rotationOrder?.length || 1;
          const nextIndex = (p.currentTurnIndex + 1) % orderLength;
          return {
            ...p,
            currentTurnIndex: nextIndex,
            lastPurchasedAt: new Date().toISOString(),
            lastPurchasedBy: buyerUid,
          };
        }),
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage =
        error?.message || "Erreur lors de l'enregistrement de l'achat.";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  getProductHistory: async (productId: string, limit?: number) => {
    try {
      return await shoppingService.getProductHistory(productId, limit);
    } catch (error: any) {
      const errorMessage =
        error?.message || "Erreur lors du chargement de l'historique d'achats.";
      set({ error: errorMessage });
      throw error;
    }
  },

  subscribeToProducts: (groupId: string) => {
    set({ isLoading: true, error: null });
    return shoppingService.subscribeToProducts(groupId, (products) => {
      set({ products, isLoading: false, error: null });
    });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      products: [],
      isLoading: false,
      error: null,
    });
  },
}));

export default useShoppingStore;
