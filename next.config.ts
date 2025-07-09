
import type {NextConfig} from 'next';

// Parse the Firebase config from the build environment
let firebaseConfig = {};
if (process.env.FIREBASE_WEBAPP_CONFIG) {
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
  } catch (e) {
    console.error('Failed to parse FIREBASE_WEBAPP_CONFIG', e);
  }
}

const nextConfig: NextConfig = {
  // Expose the parsed Firebase config as public environment variables
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: (firebaseConfig as any).apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: (firebaseConfig as any).authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: (firebaseConfig as any).projectId,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: (firebaseConfig as any).storageBucket,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: (firebaseConfig as any).messagingSenderId,
    NEXT_PUBLIC_FIREBASE_APP_ID: (firebaseConfig as any).appId,
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
