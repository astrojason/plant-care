import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

/**
 * This app only ever calls Firebase from the browser (client-side auth
 * guard, client-side Firestore/Storage — see plan). But "use client"
 * component modules still get evaluated during Next's server-side
 * prerendering, and getAuth()/getFirestore()/getStorage() throw immediately
 * without a real config. Guard on `window` so nothing initializes
 * server-side, where these exports are never actually called into.
 */
const isBrowser = typeof window !== "undefined";

export const firebaseApp: FirebaseApp | null = isBrowser
  ? getApps().length
    ? getApp()
    : initializeApp(
        useEmulator ? { ...firebaseConfig, apiKey: "demo-key", projectId: "demo-plant-care" } : firebaseConfig
      )
  : null;

export const auth: Auth = isBrowser ? getAuth(firebaseApp!) : (null as unknown as Auth);
export const db: Firestore = isBrowser ? getFirestore(firebaseApp!) : (null as unknown as Firestore);
export const storage: FirebaseStorage = isBrowser
  ? getStorage(firebaseApp!)
  : (null as unknown as FirebaseStorage);

// E2E tests only (NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true) — points the client
// SDK at the Firebase Local Emulator Suite instead of a real project.
if (isBrowser && useEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}
