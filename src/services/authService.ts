import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../firebase.config';
import { User } from '../types';
import { isDemoMode, mockStorage } from './mockStorage';

/**
 * Helper to race any promise against a timeout
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * Translates Firebase Auth error codes into friendly French messages.
 */
export function formatAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Adresse e-mail ou mot de passe incorrect.';
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail est déjà associée à un compte.';
    case 'auth/weak-password':
      return 'Le mot de passe doit comporter au moins 6 caractères.';
    case 'auth/invalid-email':
      return "L'adresse e-mail n'est pas valide.";
    case 'auth/network-request-failed':
      return 'Erreur de connexion. Vérifiez votre accès internet.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives échouées. Veuillez réessayer dans quelques instants.';
    case 'auth/user-disabled':
      return 'Ce compte a été suspendu.';
    default:
      return error?.message || 'Une erreur est survenue lors de la connexion.';
  }
}

/**
 * Maps a Firebase auth user and optional Firestore data into the application User interface.
 */
function mapFirebaseUser(
  firebaseUser: FirebaseUser,
  firestoreData?: Partial<User> | null
): User {
  return {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    email: firebaseUser.email || firestoreData?.email || '',
    displayName:
      firestoreData?.displayName ||
      firebaseUser.displayName ||
      (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Colocataire'),
    photoURL: firestoreData?.photoURL ?? firebaseUser.photoURL ?? null,
    groupId: firestoreData?.groupId ?? null,
    fcmToken: firestoreData?.fcmToken ?? null,
    createdAt: firestoreData?.createdAt || firebaseUser.metadata.creationTime || new Date().toISOString(),
    updatedAt: firestoreData?.updatedAt,
    isSuperAdmin: firestoreData?.isSuperAdmin ?? false,
    status: firestoreData?.status ?? 'active',
    suspendedReason: firestoreData?.suspendedReason ?? null,
    suspendedAt: firestoreData?.suspendedAt ?? null,
  };
}

// In-memory demo auth subscribers
const demoAuthSubscribers = new Set<(user: User | null) => void>();

const notifyDemoSubscribers = (user: User | null) => {
  demoAuthSubscribers.forEach((cb) => cb(user));
};

/**
 * Authentication service handling Firebase Auth and Firestore user profile operations.
 */
export const authService = {
  /**
   * Quick demo login with pre-populated roommates and tasks (for demo mode)
   */
  async signInDemo(): Promise<User> {
    const user = await mockStorage.initDemoData();
    notifyDemoSubscribers(user);
    return user;
  },

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    if (isDemoMode()) {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = displayName.trim() || 'Colocataire';
      const newUser: User = {
        id: `user-${Date.now()}`,
        uid: `user-${Date.now()}`,
        email: trimmedEmail,
        displayName: trimmedName,
        createdAt: new Date().toISOString(),
      };
      await mockStorage.setUser(newUser);
      notifyDemoSubscribers(newUser);
      return newUser;
    }

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = displayName.trim() || 'Colocataire';

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );
      const fbUser = userCredential.user;

      await updateProfile(fbUser, { displayName: trimmedName }).catch(() => {});

      const now = new Date().toISOString();
      const newUser: User = {
        id: fbUser.uid,
        uid: fbUser.uid,
        email: trimmedEmail,
        displayName: trimmedName,
        photoURL: fbUser.photoURL ?? null,
        groupId: null,
        fcmToken: null,
        createdAt: now,
        updatedAt: now,
      };

      const userDocRef = doc(db, 'users', fbUser.uid);
      // Attempt firestore save with 2.5s timeout so UI never hangs
      await withTimeout(setDoc(userDocRef, newUser), 2500, null).catch((err) => {
        console.warn('Non-blocking user doc creation warning:', err);
      });

      return newUser;
    } catch (error: any) {
      console.error('Firebase signUp error:', error);
      throw new Error(formatAuthError(error));
    }
  },

  async signIn(email: string, password: string): Promise<User> {
    if (isDemoMode()) {
      let user = await mockStorage.getUser();
      if (!user) {
        user = await mockStorage.initDemoData();
      }
      notifyDemoSubscribers(user);
      return user;
    }

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );
      const fbUser = userCredential.user;

      // Fast Firestore user doc lookup with 2000ms timeout
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDocSnap = await withTimeout(getDoc(userDocRef), 2000, null).catch(() => null);

      if (userDocSnap && userDocSnap.exists()) {
        return userDocSnap.data() as User;
      }
      return mapFirebaseUser(fbUser);
    } catch (error: any) {
      console.error('Firebase signIn error:', error);
      throw new Error(formatAuthError(error));
    }
  },

  async signInWithGoogle(): Promise<User> {
    if (isDemoMode()) {
      return this.signInDemo();
    }
    throw new Error('Google Sign-In nécessite une configuration native');
  },

  async signOut(): Promise<void> {
    if (isDemoMode()) {
      await mockStorage.setUser(null);
      notifyDemoSubscribers(null);
      return;
    }
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.warn('Firebase signOut error:', error);
      await mockStorage.setUser(null);
      notifyDemoSubscribers(null);
    }
  },

  async resetPassword(email: string): Promise<void> {
    if (isDemoMode()) {
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    } catch (error: any) {
      console.error('Error during resetPassword in authService:', error);
      throw new Error(formatAuthError(error));
    }
  },

  async updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
    if (isDemoMode()) {
      const current = await mockStorage.getUser();
      if (current) {
        const updated = { ...current, ...data };
        await mockStorage.setUser(updated);
        notifyDemoSubscribers(updated);
      }
      return;
    }

    try {
      const userDocRef = doc(db, 'users', uid);
      const updatePayload: Record<string, any> = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await withTimeout(updateDoc(userDocRef, updatePayload), 2500, null).catch((err) => {
        console.warn('Non-blocking user doc update warning:', err);
      });

      if (auth.currentUser && auth.currentUser.uid === uid) {
        const authUpdates: { displayName?: string; photoURL?: string | null } = {};
        if (data.displayName !== undefined) authUpdates.displayName = data.displayName;
        if (data.photoURL !== undefined) authUpdates.photoURL = data.photoURL;

        if (Object.keys(authUpdates).length > 0) {
          await updateProfile(auth.currentUser, authUpdates).catch(() => {});
        }
      }

      // Synchronize member doc display name & photo if member of a group
      if (data.displayName !== undefined || data.photoURL !== undefined) {
        try {
          const userSnap = await getDoc(userDocRef);
          const groupId = userSnap.data()?.groupId;
          if (groupId) {
            const memberDocRef = doc(db, 'groups', groupId, 'members', uid);
            const memberUpdates: Record<string, any> = {};
            if (data.displayName !== undefined) memberUpdates.displayName = data.displayName;
            if (data.photoURL !== undefined) memberUpdates.photoURL = data.photoURL;
            await updateDoc(memberDocRef, memberUpdates).catch(() => {});
          }
        } catch (_) {}
      }
    } catch (error: any) {
      console.error(`Error updating profile for user ${uid}:`, error);
      throw error;
    }
  },

  /**
   * Directly fetches the fresh user document from Firestore or mock storage.
   */
  async getUserProfile(uid: string): Promise<User | null> {
    if (isDemoMode()) {
      return mockStorage.getUser();
    }
    try {
      const snap = await withTimeout(getDoc(doc(db, 'users', uid)), 2500, null);
      if (snap && snap.exists()) {
        const data = snap.data();
        const fbUser = auth.currentUser;
        return {
          id: uid,
          uid: uid,
          email: data.email || fbUser?.email || '',
          displayName: data.displayName || fbUser?.displayName || 'Utilisateur',
          photoURL: data.photoURL ?? fbUser?.photoURL ?? null,
          groupId: data.groupId ?? null,
          fcmToken: data.fcmToken ?? null,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
          isSuperAdmin: data.isSuperAdmin ?? false,
          status: data.status || 'active',
          suspendedReason: data.suspendedReason || null,
          suspendedAt: data.suspendedAt || null,
        };
      }
    } catch (e) {
      console.warn('Error fetching user profile:', e);
    }
    return null;
  },

  async updateFcmToken(uid: string, token: string): Promise<void> {
    if (isDemoMode()) return;
    try {
      const userDocRef = doc(db, 'users', uid);
      await withTimeout(
        updateDoc(userDocRef, {
          fcmToken: token,
          updatedAt: new Date().toISOString(),
        }),
        2500,
        null
      ).catch(() => {});
    } catch (error: any) {
      console.error(`Error updating FCM token for user ${uid}:`, error);
    }
  },

  getCurrentUser(): User | null {
    if (isDemoMode()) {
      return null;
    }
    const fbUser = auth.currentUser;
    if (!fbUser) return null;
    return mapFirebaseUser(fbUser);
  },

  /**
   * Listens for Firebase auth state changes.
   * Dispatches the base user IMMEDIATELY (0ms) so UI is responsive,
   * then enriches in background with Firestore doc if available.
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (isDemoMode()) {
      demoAuthSubscribers.add(callback);
      mockStorage.getUser().then((user) => {
        callback(user);
      });
      return () => {
        demoAuthSubscribers.delete(callback);
      };
    }

    return firebaseOnAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        callback(null);
        return;
      }

      // 1. Immediately emit mapped Firebase user (instant 0ms loading resolution)
      const baseUser = mapFirebaseUser(fbUser);
      callback(baseUser);

      // 2. Background enrich from Firestore user doc with timeout
      const userDocRef = doc(db, 'users', fbUser.uid);
      withTimeout(getDoc(userDocRef), 2000, null)
        .then((userDocSnap) => {
          if (userDocSnap && userDocSnap.exists()) {
            const enriched = userDocSnap.data() as User;
            callback({
              ...baseUser,
              ...enriched,
              id: fbUser.uid,
              uid: fbUser.uid,
            });
          }
        })
        .catch(() => {});
    });
  },
};

export default authService;
