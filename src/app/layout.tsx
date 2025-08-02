
import type { Metadata } from 'next';
import './globals.css';
import { UserProvider } from '@/context/UserContext';
import { BetProvider } from '@/context/BetContext';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Wedding Wager',
  description: 'Place your bets on the big day!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <UserProvider>
          <BetProvider>
            {children}
            <Toaster />
          </BetProvider>
        </UserProvider>
      </body>
    </html>
  );
}
