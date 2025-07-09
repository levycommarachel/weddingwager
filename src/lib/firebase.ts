import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// This client-side code reads the public environment variables that were
// embedded by the Next.js build process in next.config.ts.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Determine if Firebase is enabled by checking for the essential config values.
const firebaseEnabled = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

if (firebaseEnabled) {
  try {
    // Initialize Firebase only if it hasn't been initialized yet.
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase initialization failed:", e);
  }
} else {
    // This warning will appear in the browser console if the environment
    // variables were not properly set during the build.
    console.warn("Firebase is not configured. The app may run in a limited, offline mode. Check your build configuration and environment variables.");
}

export { db, auth, firebaseEnabled };
