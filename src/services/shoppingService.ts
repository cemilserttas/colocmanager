import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { Product, PurchaseRecord } from '../types';
import { isDemoMode, mockStorage } from './mockStorage';
import { notificationService } from './notificationService';
import { getNextTurnIndex, getCurrentAssignee } from '../utils/rotation';

const shoppingSubscribers = new Set<(products: Product[]) => void>();

const notifyShoppingSubscribers = (products: Product[]) => {
  shoppingSubscribers.forEach((cb) => cb(products));
};

export const shoppingService = {
  async addProduct(
    groupId: string,
    name: string,
    icon: string,
    rotationOrder: string[],
    comment?: string
  ): Promise<Product> {
    const now = new Date().toISOString();

    if (isDemoMode()) {
      const products = await mockStorage.getProducts();
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        productId: `prod-${Date.now()}`,
        groupId,
        name: name.trim(),
        icon: (icon || '🛒').trim(),
        ...(comment?.trim() ? { comment: comment.trim() } : {}),
        rotationOrder,
        currentTurnIndex: 0,
        isActive: true,
        needsRestock: true,
        lastPurchasedAt: null,
        lastPurchasedBy: null,
        createdAt: now,
        updatedAt: now,
      };
      products.push(newProduct);
      await mockStorage.setProducts(products);
      notifyShoppingSubscribers(products);
      return newProduct;
    }

    try {
      const productRef = doc(collection(db, 'products'));
      const newProduct: Product = {
        id: productRef.id,
        groupId,
        name: name.trim(),
        icon: (icon || '🛒').trim(),
        ...(comment?.trim() ? { comment: comment.trim() } : {}),
        rotationOrder,
        currentTurnIndex: 0,
        isActive: true,
        needsRestock: true,
        lastPurchasedAt: null,
        lastPurchasedBy: null,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(productRef, newProduct);
      return newProduct;
    } catch (error: any) {
      console.warn('Firebase error in addProduct, using demo:', error);
      const products = await mockStorage.getProducts();
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        productId: `prod-${Date.now()}`,
        groupId,
        name: name.trim(),
        icon: (icon || '🛒').trim(),
        ...(comment?.trim() ? { comment: comment.trim() } : {}),
        rotationOrder,
        currentTurnIndex: 0,
        isActive: true,
        needsRestock: true,
        lastPurchasedAt: null,
        lastPurchasedBy: null,
        createdAt: now,
        updatedAt: now,
      };
      products.push(newProduct);
      await mockStorage.setProducts(products);
      notifyShoppingSubscribers(products);
      return newProduct;
    }
  },

  async removeProduct(productId: string): Promise<void> {
    if (isDemoMode()) {
      const products = await mockStorage.getProducts();
      const updated = products.filter((p) => p.id !== productId && p.productId !== productId);
      await mockStorage.setProducts(updated);
      notifyShoppingSubscribers(updated);
      return;
    }
    try {
      await updateDoc(doc(db, 'products', productId), {
        isActive: false,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      const products = await mockStorage.getProducts();
      const updated = products.filter((p) => p.id !== productId && p.productId !== productId);
      await mockStorage.setProducts(updated);
      notifyShoppingSubscribers(updated);
    }
  },

  async updateRotationOrder(productId: string, newOrder: string[]): Promise<void> {
    if (isDemoMode()) {
      const products = await mockStorage.getProducts();
      const p = products.find((x) => x.id === productId || x.productId === productId);
      if (p) {
        p.rotationOrder = newOrder;
        await mockStorage.setProducts(products);
        notifyShoppingSubscribers(products);
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'products', productId), {
        rotationOrder: newOrder,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      const products = await mockStorage.getProducts();
      const p = products.find((x) => x.id === productId || x.productId === productId);
      if (p) {
        p.rotationOrder = newOrder;
        await mockStorage.setProducts(products);
        notifyShoppingSubscribers(products);
      }
    }
  },

  async markPurchaseComplete(
    productId: string,
    buyerUid: string,
    notes?: string
  ): Promise<void> {
    const now = new Date().toISOString();

    if (isDemoMode()) {
      const products = await mockStorage.getProducts();
      const p = products.find((x) => x.id === productId || x.productId === productId);
      if (p) {
        const rotationLen = p.rotationOrder?.length || 0;
        const nextTurnIndex = getNextTurnIndex(p.currentTurnIndex ?? 0, rotationLen);
        p.currentTurnIndex = nextTurnIndex;
        p.lastPurchasedAt = now;
        p.lastPurchasedBy = buyerUid;
        p.needsRestock = false; // In stock now!
        p.updatedAt = now;
        await mockStorage.setProducts(products);
        await mockStorage.addPurchaseRecord(productId, buyerUid, notes);
        notifyShoppingSubscribers(products);

        // Notify roommates that product was purchased (in stock)
        // Note: Do NOT notify the next buyer of their turn yet; they will be notified only if restock is requested.
        for (const uid of p.rotationOrder) {
          if (uid !== buyerUid) {
            notificationService.addNotificationToFirestore(
              uid,
              'shopping',
              '🛒 Achat enregistré',
              `"${p.name}" a été acheté. Il est maintenant en stock.`,
              productId
            ).catch(() => {});
          }
        }
      }
      return;
    }

    try {
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) throw new Error('Produit non trouvé');

      const product = productSnap.data() as Product;
      const rotationLen = product.rotationOrder?.length || 0;
      const nextTurnIndex = getNextTurnIndex(product.currentTurnIndex ?? 0, rotationLen);

      await updateDoc(productRef, {
        currentTurnIndex: nextTurnIndex,
        lastPurchasedAt: now,
        lastPurchasedBy: buyerUid,
        needsRestock: false,
        updatedAt: now,
      });

      const historyRef = doc(collection(db, 'products', productId, 'history'));
      await setDoc(historyRef, {
        id: historyRef.id,
        productId,
        buyerUid,
        purchasedAt: now,
        ...(notes ? { notes } : {}),
      });

      // 🔔 CREATE NOTIFICATIONS IN FIRESTORE
      // Notify other roommates that purchase was completed and item is now in stock.
      // (Do NOT send turn notification to next buyer until restock is requested).
      for (const uid of product.rotationOrder || []) {
        if (uid !== buyerUid) {
          notificationService.addNotificationToFirestore(
            uid,
            'shopping',
            '🛒 Achat enregistré',
            `"${product.name}" a été acheté. Il est maintenant en stock.`,
            productId
          ).catch(() => {});
        }
      }
    } catch {
      const products = await mockStorage.getProducts();
      const p = products.find((x) => x.id === productId || x.productId === productId);
      if (p) {
        const rotationLen = p.rotationOrder?.length || 0;
        p.currentTurnIndex = getNextTurnIndex(p.currentTurnIndex ?? 0, rotationLen);
        p.lastPurchasedAt = now;
        p.lastPurchasedBy = buyerUid;
        p.needsRestock = false;
        p.updatedAt = now;
        await mockStorage.setProducts(products);
        await mockStorage.addPurchaseRecord(productId, buyerUid, notes);
        notifyShoppingSubscribers(products);
      }
    }
  },

  async requestRestock(
    productId: string,
    requestedByUid?: string,
    senderDisplayName?: string
  ): Promise<Product> {
    const now = new Date().toISOString();

    if (isDemoMode()) {
      const products = await mockStorage.getProducts();
      const p = products.find((x) => x.id === productId || x.productId === productId);
      if (!p) throw new Error('Produit non trouvé');

      p.needsRestock = true;
      p.updatedAt = now;
      await mockStorage.setProducts(products);
      notifyShoppingSubscribers(products);

      const currentBuyerUid = getCurrentAssignee(p.rotationOrder || [], p.currentTurnIndex ?? 0);
      const senderName = senderDisplayName || 'Un colocataire';

      if (currentBuyerUid) {
        notificationService.addNotificationToFirestore(
          currentBuyerUid,
          'purchase_turn',
          '🛒 Rachat nécessaire !',
          `${senderName} signale qu'il faut racheter : "${p.name}". C'est votre tour !`,
          productId
        ).catch(() => {});
      }

      return p;
    }

    try {
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) throw new Error('Produit non trouvé');

      const product = productSnap.data() as Product;
      await updateDoc(productRef, {
        needsRestock: true,
        updatedAt: now,
      });

      product.needsRestock = true;
      product.updatedAt = now;

      const currentBuyerUid = getCurrentAssignee(product.rotationOrder || [], product.currentTurnIndex ?? 0);
      const senderName = senderDisplayName || 'Un colocataire';

      if (currentBuyerUid) {
        notificationService.addNotificationToFirestore(
          currentBuyerUid,
          'purchase_turn',
          '🛒 Rachat nécessaire !',
          `${senderName} signale qu'il faut racheter : "${product.name}". C'est votre tour !`,
          productId
        ).catch((e) => console.warn('Restock notification error:', e));
      }

      return product;
    } catch (error: any) {
      console.warn('Firebase error in requestRestock, falling back to local:', error);
      const products = await mockStorage.getProducts();
      const p = products.find((x) => x.id === productId || x.productId === productId);
      if (p) {
        p.needsRestock = true;
        p.updatedAt = now;
        await mockStorage.setProducts(products);
        notifyShoppingSubscribers(products);

        const currentBuyerUid = getCurrentAssignee(p.rotationOrder || [], p.currentTurnIndex ?? 0);
        const senderName = senderDisplayName || 'Un colocataire';

        if (currentBuyerUid) {
          notificationService.addNotificationToFirestore(
            currentBuyerUid,
            'purchase_turn',
            '🛒 Rachat nécessaire !',
            `${senderName} signale qu'il faut racheter : "${p.name}". C'est votre tour !`,
            productId
          ).catch(() => {});
        }
      }
      return p || ({} as Product);
    }
  },

  async requestRestockMultiple(
    productIds: string[],
    requestedByUid?: string,
    senderDisplayName?: string
  ): Promise<void> {
    if (productIds.length === 0) return;
    const now = new Date().toISOString();
    const senderName = senderDisplayName || 'Un colocataire';

    if (isDemoMode()) {
      const products = await mockStorage.getProducts();
      const buyerProductsMap: Record<string, { names: string[]; ids: string[] }> = {};

      for (const id of productIds) {
        const p = products.find((x) => x.id === id || x.productId === id);
        if (p) {
          p.needsRestock = true;
          p.updatedAt = now;
          const buyerUid = getCurrentAssignee(p.rotationOrder || [], p.currentTurnIndex ?? 0);
          if (buyerUid) {
            if (!buyerProductsMap[buyerUid]) {
              buyerProductsMap[buyerUid] = { names: [], ids: [] };
            }
            buyerProductsMap[buyerUid].names.push(p.name);
            buyerProductsMap[buyerUid].ids.push(p.id || id);
          }
        }
      }

      await mockStorage.setProducts(products);
      notifyShoppingSubscribers(products);

      // Dispatch notifications grouped by buyer with their own product reference ID
      for (const [buyerUid, info] of Object.entries(buyerProductsMap)) {
        notificationService.addNotificationToFirestore(
          buyerUid,
          'purchase_turn',
          '🛒 Rachat nécessaire !',
          `${senderName} signale qu'il faut racheter : ${info.names.join(', ')}. C'est votre tour !`,
          info.ids[0] || productIds[0]
        ).catch(() => {});
      }
      return;
    }

    try {
      const products = await mockStorage.getProducts();
      const buyerProductsMap: Record<string, { names: string[]; ids: string[] }> = {};
      let modifiedLocalStorage = false;

      for (const id of productIds) {
        try {
          const productRef = doc(db, 'products', id);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const product = productSnap.data() as Product;
            await updateDoc(productRef, {
              needsRestock: true,
              updatedAt: now,
            });
            const buyerUid = getCurrentAssignee(product.rotationOrder || [], product.currentTurnIndex ?? 0);
            if (buyerUid) {
              if (!buyerProductsMap[buyerUid]) {
                buyerProductsMap[buyerUid] = { names: [], ids: [] };
              }
              buyerProductsMap[buyerUid].names.push(product.name);
              buyerProductsMap[buyerUid].ids.push(product.id || id);
            }
          } else {
            const p = products.find((x) => x.id === id || x.productId === id);
            if (p) {
              p.needsRestock = true;
              p.updatedAt = now;
              modifiedLocalStorage = true;
              const buyerUid = getCurrentAssignee(p.rotationOrder || [], p.currentTurnIndex ?? 0);
              if (buyerUid) {
                if (!buyerProductsMap[buyerUid]) {
                  buyerProductsMap[buyerUid] = { names: [], ids: [] };
                }
                buyerProductsMap[buyerUid].names.push(p.name);
                buyerProductsMap[buyerUid].ids.push(p.id || id);
              }
            }
          }
        } catch (itemErr) {
          console.warn(`Failed to update restock for ${id} in Firestore, falling back to local:`, itemErr);
          const p = products.find((x) => x.id === id || x.productId === id);
          if (p) {
            p.needsRestock = true;
            p.updatedAt = now;
            modifiedLocalStorage = true;
            const buyerUid = getCurrentAssignee(p.rotationOrder || [], p.currentTurnIndex ?? 0);
            if (buyerUid) {
              if (!buyerProductsMap[buyerUid]) {
                buyerProductsMap[buyerUid] = { names: [], ids: [] };
              }
              buyerProductsMap[buyerUid].names.push(p.name);
              buyerProductsMap[buyerUid].ids.push(p.id || id);
            }
          }
        }
      }

      if (modifiedLocalStorage) {
        await mockStorage.setProducts(products);
        notifyShoppingSubscribers(products);
      }

      for (const [buyerUid, info] of Object.entries(buyerProductsMap)) {
        notificationService.addNotificationToFirestore(
          buyerUid,
          'purchase_turn',
          '🛒 Rachat nécessaire !',
          `${senderName} signale qu'il faut racheter : ${info.names.join(', ')}. C'est votre tour !`,
          info.ids[0] || productIds[0]
        ).catch((e) => console.warn('Restock batch notification error:', e));
      }
    } catch (err) {
      console.warn('Fallback in requestRestockMultiple:', err);
      const products = await mockStorage.getProducts();
      const buyerProductsMap: Record<string, { names: string[]; ids: string[] }> = {};
      for (const id of productIds) {
        const p = products.find((x) => x.id === id || x.productId === id);
        if (p) {
          p.needsRestock = true;
          p.updatedAt = now;
          const buyerUid = getCurrentAssignee(p.rotationOrder || [], p.currentTurnIndex ?? 0);
          if (buyerUid) {
            if (!buyerProductsMap[buyerUid]) {
              buyerProductsMap[buyerUid] = { names: [], ids: [] };
            }
            buyerProductsMap[buyerUid].names.push(p.name);
            buyerProductsMap[buyerUid].ids.push(p.id || id);
          }
        }
      }
      await mockStorage.setProducts(products);
      notifyShoppingSubscribers(products);

      for (const [buyerUid, info] of Object.entries(buyerProductsMap)) {
        notificationService.addNotificationToFirestore(
          buyerUid,
          'purchase_turn',
          '🛒 Rachat nécessaire !',
          `${senderName} signale qu'il faut racheter : ${info.names.join(', ')}. C'est votre tour !`,
          info.ids[0] || productIds[0]
        ).catch(() => {});
      }
    }
  },

  async getProducts(groupId: string): Promise<Product[]> {
    if (isDemoMode()) {
      return await mockStorage.getProducts();
    }
    try {
      const q = query(
        collection(db, 'products'),
        where('groupId', '==', groupId),
        where('isActive', '==', true)
      );
      const querySnap = await getDocs(q);
      return querySnap.docs.map((docSnap) => docSnap.data() as Product);
    } catch {
      return await mockStorage.getProducts();
    }
  },

  async getProductHistory(productId: string, limitCount = 20): Promise<PurchaseRecord[]> {
    if (isDemoMode()) {
      return await mockStorage.getPurchaseHistory(productId);
    }
    try {
      const historyQuery = query(
        collection(db, 'products', productId, 'history'),
        orderBy('purchasedAt', 'desc'),
        limit(limitCount)
      );
      const querySnap = await getDocs(historyQuery);
      return querySnap.docs.map((docSnap) => docSnap.data() as PurchaseRecord);
    } catch {
      return await mockStorage.getPurchaseHistory(productId);
    }
  },

  subscribeToProducts(groupId: string, callback: (products: Product[]) => void): () => void {
    shoppingSubscribers.add(callback);

    if (isDemoMode()) {
      mockStorage.getProducts().then(callback);
      return () => {
        shoppingSubscribers.delete(callback);
      };
    }

    const q = query(
      collection(db, 'products'),
      where('groupId', '==', groupId),
      where('isActive', '==', true)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => docSnap.data() as Product);
        callback(items);
      },
      (error) => {
        console.warn('Realtime products subscription error, falling back to query:', error);
        shoppingService.getProducts(groupId).then(callback).catch(() => {});
      }
    );

    return () => {
      shoppingSubscribers.delete(callback);
      unsub();
    };
  },
};

export default shoppingService;
