import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Add a type declaration for our custom window property
declare global {
  interface Window {
    __firebase_config__?: any;
  }
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseEnabled = false;

try {
  // This code only runs in the browser. We read the config that was
  // injected by the root layout.
  if (typeof window !== 'undefined' && window.__firebase_config__) {
    const firebaseConfig = window.__firebase_config__;
    
    if (firebaseConfig.apiKey) {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      auth = getAuth(app);
      db = getFirestore(app);
      firebaseEnabled = true;
    } else {
        console.warn("Firebase config was found but is invalid (missing apiKey).");
    }
  } else if (typeof window !== 'undefined') {
      console.warn("Firebase config was not found on the window object.");
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

if (!firebaseEnabled && typeof window !== 'undefined') {
    console.warn("Firebase is not configured. The app may run in a limited, offline mode.");
}

export { db, auth, firebaseEnabled };
