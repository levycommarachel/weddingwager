"use client";

import BetCard from "@/components/bet-card";
import { useBets } from "@/context/BetContext";

export default function BettingPage() {
  const { bets } = useBets();
  const activeBets = bets.filter(bet => bet.status === 'open');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">Active Wagers</h1>
        <p className="text-muted-foreground mt-2 text-lg">The odds are in! Place your bets now.</p>
      </div>
      
      {activeBets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {activeBets.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p>No active bets at the moment.</p>
          <p>Check back soon!</p>
        </div>
      )}
    </div>
  );
}
