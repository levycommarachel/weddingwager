"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from "@/components/header";
import { useUser } from '@/context/UserContext';
import { BetProvider } from '@/context/BetContext';
import { Loader2 } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);
  
  if (loading || !user) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <BetProvider>
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </BetProvider>
  );
}
