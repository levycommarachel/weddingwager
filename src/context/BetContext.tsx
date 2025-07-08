"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export type Bet = {
  id: number;
  question: string;
  type: 'range' | 'options';
  range?: [number, number];
  options?: string[];
  pool: number;
  icon: string;
  isSettled?: boolean;
};

const initialBets: Bet[] = [
  { id: 1, question: "How long will the main ceremony last (in minutes)?", type: 'range', range: [20, 45], pool: 12500, icon: "Clock", isSettled: false },
  { id: 2, question: "How many tiers will the wedding cake have?", type: 'options', options: ['2 tiers', '3 tiers', '4 tiers', '5+ tiers'], pool: 21300, icon: "CakeSlice", isSettled: false },
  { id: 3, question: "What will be the length of the best man's speech (in minutes)?", type: 'range', range: [3, 10], pool: 5400, icon: "Mic", isSettled: false },
  { id: 4, question: "How many guests will be on the dance floor during the first song?", type: 'range', range: [0, 50], pool: 18750, icon: "Users", isSettled: false },
];


interface BetContextType {
  bets: Bet[];
  addBet: (bet: Omit<Bet, 'id' | 'pool' | 'isSettled'>) => void;
  updateBetPool: (betId: number, amount: number) => void;
  settleBet: (betId: number) => void;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

export const BetProvider = ({ children }: { children: ReactNode }) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedBets = localStorage.getItem('wedding-wager-bets');
      if (storedBets) {
        setBets(JSON.parse(storedBets));
      } else {
        setBets(initialBets);
      }
    } catch (error) {
      console.warn("Could not read bets from local storage, using initial data.");
      setBets(initialBets);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('wedding-wager-bets', JSON.stringify(bets));
      } catch (error) {
        console.warn("Could not write bets to local storage.");
      }
    }
  }, [bets, isInitialized]);

  const addBet = (bet: Omit<Bet, 'id' | 'pool' | 'isSettled'>) => {
    setBets(prev => {
        const newBet: Bet = {
            ...bet,
            id: prev.length > 0 ? Math.max(...prev.map(b => b.id)) + 1 : 1,
            pool: 0,
            isSettled: false,
        };
        return [...prev, newBet];
    });
    toast({
        title: "New Bet Added!",
        description: `"${bet.question}" is now open for wagers.`,
    });
  };

  const updateBetPool = (betId: number, amount: number) => {
    setBets(prev => prev.map(b => b.id === betId ? { ...b, pool: b.pool + amount } : b));
  };
  
  const settleBet = (betId: number) => {
    setBets(prev => prev.map(b => b.id === betId ? { ...b, isSettled: true } : b));
    toast({
        title: "Bet Settled",
        description: "The bet is now closed. In a real app, winnings would be distributed.",
    });
  };

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return (
    <BetContext.Provider value={{ bets, addBet, updateBetPool, settleBet }}>
      {children}
    </BetContext.Provider>
  );
};

export const useBets = () => {
  const context = useContext(BetContext);
  if (context === undefined) {
    throw new Error('useBets must be used within a BetProvider');
  }
  return context;
};
