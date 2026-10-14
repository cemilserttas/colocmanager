import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase project configuration for ColocManager (colocmanager-30703)
 */
export const firebaseConfig = {
  apiKey: "AIzaSyB1GO-ZZcEo2ksOZBbuLnSqeW1AxEPTc9E",
  authDomain: "colocmanager-30703.firebaseapp.com",
  projectId: "colocmanager-30703",
  storageBucket: "colocmanager-30703.firebasestorage.app",
  messagingSenderId: "644112243143",
  appId: "1:644112243143:web:bfe84047ba8455f36b21e2",
  measurementId: "G-M3PR661NFX"
};

// Initialize Firebase app as a singleton
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

export default app;
