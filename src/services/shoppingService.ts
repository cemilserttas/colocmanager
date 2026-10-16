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
import { getNextTurnIndex } from '../utils/rotation';

const shoppingSubscribers = new Set<(products: Product[]) => void>();

const notifyShoppingSubscribers = (products: Product[]) => {
  shoppingSubscribers.forEach((cb) => cb(products));
};

export const shoppingService = {
  async addProduct(
    groupId: string,
    name: string,
    icon: string,
    rotationOrder: string[]
  ): Promise<Product> {
    const now = new Date().toISOString();

    if (isDemoMode()) {
      const products = await mockStorage.getProducts();
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        productId: `prod-${Date.now()}`,
        groupId,
        name: name.trim(),
        icon: icon.trim(),
        rotationOrder,
        currentTurnIndex: 0,
        isActive: true,
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
        icon: icon.trim(),
        rotationOrder,
        currentTurnIndex: 0,
        isActive: true,
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
        groupId,
        name: name.trim(),
        icon: icon.trim(),
        rotationOrder,
        currentTurnIndex: 0,
        isActive: true,
        createdAt: now,
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
    if (isDemoMode()) {
      const products = await mockStorage.getProducts();
      const p = products.find((x) => x.id === productId || x.productId === productId);
      if (p) {
        const rotationLen = p.rotationOrder?.length || 0;
        const nextTurnIndex = getNextTurnIndex(p.currentTurnIndex ?? 0, rotationLen);
        const nextBuyerUid = rotationLen > 0 ? p.rotationOrder[nextTurnIndex] : '';
        p.currentTurnIndex = nextTurnIndex;
        p.lastPurchasedAt = new Date().toISOString();
        p.lastPurchasedBy = buyerUid;
        await mockStorage.setProducts(products);
        await mockStorage.addPurchaseRecord(productId, buyerUid, notes);
        notifyShoppingSubscribers(products);

        // Notify next buyer & roommates
        if (nextBuyerUid && nextBuyerUid !== buyerUid) {
          notificationService.addNotificationToFirestore(
            nextBuyerUid,
            'purchase_turn',
            '🛒 C\'est votre tour d\'acheter !',
            `"${p.name}" a été acheté. C'est maintenant à votre tour pour le prochain achat !`,
            productId
          ).catch(() => {});
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
      const nextBuyerUid = rotationLen > 0 ? product.rotationOrder[nextTurnIndex] : '';
      const now = new Date().toISOString();

      await updateDoc(productRef, {
        currentTurnIndex: nextTurnIndex,
        lastPurchasedAt: now,
        lastPurchasedBy: buyerUid,
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
      // 1. Notify the NEXT person in rotation: It is now their turn!
      if (nextBuyerUid && nextBuyerUid !== buyerUid) {
        notificationService.addNotificationToFirestore(
          nextBuyerUid,
          'purchase_turn',
          '🛒 C\'est votre tour d\'acheter !',
          `"${product.name}" a été acheté. C'est maintenant à votre tour pour le prochain achat !`,
          productId
        ).catch((e) => console.warn('Turn notification error:', e));
      }

      // 2. Notify all other roommates in rotation that purchase was completed
      for (const uid of product.rotationOrder) {
        if (uid !== buyerUid && uid !== nextBuyerUid) {
          notificationService.addNotificationToFirestore(
            uid,
            'shopping',
            '🛒 Achat enregistré',
            `Un colocataire a acheté "${product.name}".`,
            productId
          ).catch(() => {});
        }
      }
    } catch {
      const products = await mockStorage.getProducts();
      const p = products.find((x) => x.id === productId || x.productId === productId);
      if (p && p.rotationOrder.length > 0) {
        p.currentTurnIndex = (p.currentTurnIndex + 1) % p.rotationOrder.length;
        p.lastPurchasedAt = new Date().toISOString();
        p.lastPurchasedBy = buyerUid;
        await mockStorage.setProducts(products);
        await mockStorage.addPurchaseRecord(productId, buyerUid, notes);
        notifyShoppingSubscribers(products);
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
    if (isDemoMode()) {
      shoppingSubscribers.add(callback);
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

    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => docSnap.data() as Product);
      callback(items);
    });
  },
};

export default shoppingService;
