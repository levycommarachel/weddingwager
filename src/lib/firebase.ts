import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseEnabled = false;

// This function runs on the client and reads the config injected by the server layout
function getFirebaseConfig(): FirebaseOptions | null {
  // Ensure this code only runs in the browser
  if (typeof window === 'undefined') {
    return null;
  }

  const configElement = document.getElementById('firebase-config');
  if (!configElement?.textContent) {
    console.warn("Firebase config script not found. Firebase will be disabled.");
    return null;
  }

  try {
    return JSON.parse(configElement.textContent);
  } catch (e) {
    console.error("Failed to parse Firebase config:", e);
    return null;
  }
}

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase if the config was successfully loaded
if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebaseEnabled = true;
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    firebaseEnabled = false;
  }
} else {
  if (typeof window !== 'undefined') {
    // Only log this warning in the browser
    console.warn("Firebase is not configured. The app may run in a limited, offline mode.");
  }
}

export { db, auth, firebaseEnabled };
