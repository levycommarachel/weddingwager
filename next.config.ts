import type {NextConfig} from 'next';

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
    // Pass the entire config object as a single JSON string.
    // This is read in src/lib/firebase.ts
    NEXT_PUBLIC_FIREBASE_CONFIG: process.env.FIREBASE_WEBAPP_CONFIG || '',
  }
};

export default nextConfig;
