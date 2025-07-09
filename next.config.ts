import type {NextConfig} from 'next';

// This is the config for the Firebase WEB app
let firebaseConfig: any = {};

// On App Hosting, we can get the config from an environment variable.
// This is automatically set by App Hosting.
if (process.env.FIREBASE_WEBAPP_CONFIG) {
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
  } catch (e) {
    console.error("Failed to parse FIREBASE_WEBAPP_CONFIG", e);
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Expose the Firebase config to the client-side
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey || '',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain || '',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId || '',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket || '',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId || '',
    NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId || '',
  }
};

export default nextConfig;
