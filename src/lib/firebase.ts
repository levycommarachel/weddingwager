import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseEnabled = false;

try {
  const firebaseConfigStr = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  
  // Ensure the string is not null, undefined, or an empty object string before trying to parse.
  if (firebaseConfigStr && firebaseConfigStr.trim() !== '{}' && firebaseConfigStr.length > 2) {
    const firebaseConfig = JSON.parse(firebaseConfigStr);
    
    // Check for a key property to ensure the config is valid
    if (firebaseConfig.apiKey) {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      auth = getAuth(app);
      db = getFirestore(app);
      firebaseEnabled = true;
    } else {
        console.warn("Firebase config was parsed but is invalid (missing apiKey).");
    }
  } else {
      console.warn("Firebase config environment variable is not set or is empty.");
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

if (!firebaseEnabled) {
    console.warn("Firebase is not configured. The app may run in a limited, offline mode. Ensure FIREBASE_WEBAPP_CONFIG is set correctly in your hosting environment.");
}

export { db, auth, firebaseEnabled };
