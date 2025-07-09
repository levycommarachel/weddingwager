import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseEnabled = false;

try {
  const firebaseConfigStr = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  
  if (firebaseConfigStr) {
    const firebaseConfig = JSON.parse(firebaseConfigStr);
    
    // Check for a key property to ensure the config is valid
    if (firebaseConfig.apiKey) {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      auth = getAuth(app);
      db = getFirestore(app);
      firebaseEnabled = true;
    } else {
        // This case can happen if the env var is an empty object string like "{}"
        console.warn("Firebase config is present but invalid (missing apiKey).");
    }
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

if (!firebaseEnabled) {
    console.warn("Firebase is not configured. The app may run in a limited, offline mode. Ensure FIREBASE_WEBAPP_CONFIG is set correctly in your hosting environment.");
}

export { db, auth, firebaseEnabled };
