
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from "@/components/header";
import { useUser } from '@/context/UserContext';
import { Loader2 } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userData, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not loading and there's no user or user data.
    if (!loading && (!user || !userData)) {
      router.replace('/');
    }
  }, [user, userData, loading, router]);
  
  // Show loader until user and userData are fully loaded.
  if (loading || !user || !userData) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
