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
  };
}

// In-memory demo auth subscribers
const demoAuthSubscribers = new Set<(user: User | null) => void>();

const notifyDemoSubscribers = (user: User | null) => {
  demoAuthSubscribers.forEach((cb) => cb(user));
};

/**
 * Authentication service handling Firebase Auth and Firestore user profile operations.
 * Seamlessly falls back to mock/localStorage in demo mode.
 */
export const authService = {
  /**
   * Quick demo login with pre-populated roommates and tasks
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
      const trimmedName = displayName.trim();

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );
      const fbUser = userCredential.user;

      await updateProfile(fbUser, { displayName: trimmedName });

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
      await setDoc(userDocRef, newUser);

      return newUser;
    } catch (error: any) {
      console.warn('Firebase error, falling back to demo mode:', error.message);
      return this.signUp(email, password, displayName);
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
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      const fbUser = userCredential.user;

      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        return userDocSnap.data() as User;
      }
      return mapFirebaseUser(fbUser);
    } catch (error: any) {
      console.warn('Firebase signIn failed, falling back to demo mode:', error.message);
      return this.signInDemo();
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
      throw error;
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

      await updateDoc(userDocRef, updatePayload);

      if (auth.currentUser && auth.currentUser.uid === uid) {
        const authUpdates: { displayName?: string; photoURL?: string | null } = {};
        if (data.displayName !== undefined) authUpdates.displayName = data.displayName;
        if (data.photoURL !== undefined) authUpdates.photoURL = data.photoURL;

        if (Object.keys(authUpdates).length > 0) {
          await updateProfile(auth.currentUser, authUpdates);
        }
      }
    } catch (error: any) {
      console.error(`Error updating profile for user ${uid}:`, error);
      throw error;
    }
  },

  async updateFcmToken(uid: string, token: string): Promise<void> {
    if (isDemoMode()) return;
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        fcmToken: token,
        updatedAt: new Date().toISOString(),
      });
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

    return firebaseOnAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        callback(null);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          callback(userDocSnap.data() as User);
        } else {
          callback(mapFirebaseUser(fbUser));
        }
      } catch (error) {
        console.error('Error fetching user document in onAuthStateChanged:', error);
        callback(mapFirebaseUser(fbUser));
      }
    });
  },
};

export default authService;
