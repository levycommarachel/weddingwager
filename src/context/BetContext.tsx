
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, auth, firebaseEnabled } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, doc, runTransaction, query, where, writeBatch, getDocs, orderBy, type Firestore } from 'firebase/firestore';
import type { Bet, Wager } from '@/types';
import { useUser } from './UserContext';


// Define the raw bet type from Firestore to handle Timestamps
type FirestoreBet = Omit<Bet, 'id'> & {
  id?: string;
};

interface BetContextType {
  bets: Bet[];
  loading: boolean;
  addBet: (bet: Omit<Bet, 'id' | 'pool' | 'status' | 'createdAt'>) => Promise<void>;
  placeBet: (betId: string, outcome: string | number, amount: number) => Promise<void>;
  settleBet: (betId: string, winningOutcome: string | number) => Promise<void>;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

export const BetProvider = ({ children }: { children: ReactNode }) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();
  
  useEffect(() => {
    if (!firebaseEnabled || !db) {
      setLoading(false);
      return;
    }
    
    const q = query(collection(db, "bets"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const betsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
        } as Bet));

        // Sort on the client-side instead
        betsData.sort((a, b) => {
            const timeA = a.createdAt?.toMillis() || 0;
            const timeB = b.createdAt?.toMillis() || 0;
            return timeB - timeA;
        });

        setBets(betsData);
        setLoading(false);
    }, (error) => {
        console.error("Bet listener error:", error);
        setLoading(false);
        toast({ variant: 'destructive', title: 'Network Error', description: 'Could not connect to bets data.' });
    });

    return () => unsubscribe();
  }, [toast]);

  const showFirebaseDisabledToast = () => {
    toast({ variant: 'destructive', title: 'Feature Disabled', description: 'Firebase is not configured. Please check your setup.' });
  }

  const addBet = async (betData: Omit<Bet, 'id' | 'pool' | 'status' | 'createdAt'>) => {
    if (!firebaseEnabled || !db) {
      showFirebaseDisabledToast();
      return;
    }
    try {
      await addDoc(collection(db, 'bets'), {
        ...betData,
        pool: 0,
        status: 'open',
        createdAt: serverTimestamp(),
      });
      toast({
        title: "New Bet Added!",
        description: `"${betData.question}" is now open for wagers.`,
      });
    } catch (error) {
      console.error("Error adding bet: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add new bet.' });
    }
  };

  const placeBet = async (betId: string, outcome: string | number, amount: number) => {
    if (!firebaseEnabled || !db || !user) {
      showFirebaseDisabledToast();
      if (!user) throw new Error("User not authenticated");
      return;
    }

    const betRef = doc(db, "bets", betId);
    const userRef = doc(db, "users", user.uid);
    const wagersCollectionRef = collection(db, "wagers");

    await runTransaction(db, async (transaction) => {
      // 1. Read all documents first to respect Firestore transaction rules
      const userDoc = await transaction.get(userRef);
      const betDoc = await transaction.get(betRef);
      
      // 2. Perform validation checks
      if (!betDoc.exists()) {
        throw new Error("Bet does not exist!");
      }
      if (!userDoc.exists() || userDoc.data().balance < amount) {
        throw new Error("Insufficient balance.");
      }
      
      // 3. Prepare and perform all write operations
      const newBalance = userDoc.data().balance - amount;
      transaction.update(userRef, { balance: newBalance });
      
      const newPool = betDoc.data().pool + amount;
      transaction.update(betRef, { pool: newPool });
      
      // Create a reference for the new wager document
      const newWagerRef = doc(wagersCollectionRef);
      transaction.set(newWagerRef, {
          userId: user.uid,
          nickname: userDoc.data().nickname,
          betId: betId,
          amount: amount,
          outcome: outcome,
          createdAt: serverTimestamp()
      });
    });
  };

  const settleBet = async (betId: string, winningOutcome: string | number) => {
    if (!firebaseEnabled || !db) {
      showFirebaseDisabledToast();
      return;
    }
    
    try {
      const wagersQuery = query(collection(db, "wagers"), where("betId", "==", betId));
      const wagersSnapshot = await getDocs(wagersQuery);
      const wagers = wagersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wager));
      
      const winningWagers = wagers.filter(wager => wager.outcome == winningOutcome);
      const totalWinningWagerAmount = winningWagers.reduce((sum, wager) => sum + wager.amount, 0);

      const betRef = doc(db, "bets", betId);
      await runTransaction(db, async (transaction) => {
        const betDoc = await transaction.get(betRef);
        if (!betDoc.exists() || betDoc.data().status !== 'open') {
          throw new Error("Bet is not open or does not exist.");
        }
        const betPool = betDoc.data().pool;

        if (winningWagers.length > 0 && totalWinningWagerAmount > 0) {
          const payoutRatio = betPool / totalWinningWagerAmount;
          
          const winnerRefs = winningWagers.map(wager => doc(db, "users", wager.userId));
          const winnerDocs = await Promise.all(winnerRefs.map(ref => transaction.get(ref)));

          winnerDocs.forEach((userDoc, index) => {
            if (userDoc.exists()) {
              const wager = winningWagers[index];
              const userRef = userDoc.ref;
              const currentBalance = userDoc.data().balance;
              const payout = Math.floor(wager.amount * payoutRatio);
              const newBalance = currentBalance + payout;
              transaction.update(userRef, { balance: newBalance });
            }
          });
        }
        
        transaction.update(betRef, {
          status: "resolved",
          winningOutcome: winningOutcome,
          resolvedAt: serverTimestamp(),
        });
      });
      
      if (winningWagers.length > 0) {
        toast({
          title: "Bet Settled!",
          description: `Payouts distributed to ${winningWagers.length} winner(s).`,
        });
      } else {
        toast({
          title: "Bet Settled!",
          description: "There were no winners. The pool remains.",
        });
      }

    } catch (error) {
      console.error("Error settling bet: ", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ variant: 'destructive', title: 'Error Settling Bet', description: errorMessage });
    }
  };

  return (
    <BetContext.Provider value={{ bets, loading, addBet, placeBet, settleBet }}>
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
