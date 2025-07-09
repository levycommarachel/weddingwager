import type {NextConfig} from 'next';

// This file is executed in a Node.js environment during the build process,
// where it has access to the environment variables provided by App Hosting.

// Parse the Firebase config from the single environment variable.
const firebaseConfigStr = process.env.FIREBASE_WEBAPP_CONFIG;
const firebaseConfig = firebaseConfigStr ? JSON.parse(firebaseConfigStr) : {};

const nextConfig: NextConfig = {
  // Use the `env` key to expose these public-safe variables to the client-side.
  // The Next.js build process will replace `process.env.NEXT_PUBLIC_*` with
  // these values in the browser code.
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey || '',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain || '',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId || '',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket || '',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId || '',
    NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId || '',
  },
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
};

export default nextConfig;
