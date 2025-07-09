
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
  // This is a server component, so it has access to the hosting environment's variables.
  // We grab the config and inject it into a script tag for the client to use.
  const config = process.env.FIREBASE_WEBAPP_CONFIG;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        {config && <script
          dangerouslySetInnerHTML={{
            __html: `window.__firebase_config__ = ${config};`,
          }}
        />}
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
