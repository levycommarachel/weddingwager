"use client";

import BetCard from "@/components/bet-card";
import { useBets } from "@/context/BetContext";
import { Archive, Gem } from "lucide-react";

export default function BettingPage() {
  const { bets } = useBets();
  const activeBets = bets.filter(bet => bet.status === 'open');
  const closedBets = bets.filter(bet => bet.status !== 'open');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">All Wagers</h1>
        <p className="text-muted-foreground mt-2 text-lg">Place your bets on active wagers or review past results.</p>
      </div>

      <div className="space-y-16">
        <section>
          <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight mb-6 flex items-center gap-3">
            <Gem className="text-accent-foreground" />
            Active Wagers
          </h2>
          {activeBets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {activeBets.map((bet) => (
                <BetCard key={bet.id} bet={bet} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground bg-accent/30 rounded-lg border border-dashed">
              <p className="text-lg font-medium">No active wagers at the moment.</p>
              <p>Please check back soon!</p>
            </div>
          )}
        </section>
        
        {closedBets.length > 0 && (
          <section>
             <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight mb-6 flex items-center gap-3">
                <Archive />
                Past Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {closedBets.map((bet) => (
                <BetCard key={bet.id} bet={bet} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
