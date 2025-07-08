"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from "@/components/header";
import { useUser } from '@/context/UserContext';
import { BetProvider } from '@/context/BetContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { nickname } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!nickname) {
      router.replace('/');
    }
  }, [nickname, router]);
  
  if (!nickname) {
    return null; // or a loading spinner
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
