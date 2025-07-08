
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, firebaseEnabled } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, doc, runTransaction, query, where, writeBatch, getDocs, type Firestore, getDoc, increment, deleteDoc, collectionGroup, queryEqual } from 'firebase/firestore';
import type { Bet, Wager } from '@/types';
import { useUser } from './UserContext';

interface BetContextType {
  bets: Bet[];
  myWagers: Map<string, Wager>; // Key is betId
  loading: boolean;
  addBet: (bet: Omit<Bet, 'id' | 'pool' | 'status' | 'createdAt'>) => Promise<void>;
  placeBet: (betId: string, outcome: string | number, amount: number) => Promise<void>;
  cancelWager: (wagerId: string) => Promise<void>;
  settleBet: (betId: string, winningOutcome: string | number) => Promise<void>;
  seedInitialBets: () => Promise<void>;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

export const BetProvider = ({ children }: { children: ReactNode }) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [myWagers, setMyWagers] = useState<Map<string, Wager>>(new Map());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();
  
  // Listen for all bets
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

        betsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        setBets(betsData);
        setLoading(false);
    }, (error) => {
        console.error("Bet listener error:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Listen for the current user's wagers
  useEffect(() => {
    if (!user || !db) {
        setMyWagers(new Map()); // Clear wagers if user logs out
        return;
    }

    const q = query(collection(db, "wagers"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const wagersData = new Map<string, Wager>();
        snapshot.docs.forEach(doc => {
            const wager = { id: doc.id, ...doc.data() } as Wager;
            wagersData.set(wager.betId, wager);
        });
        setMyWagers(wagersData);
    }, (error) => {
        console.error("Wager listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const showFirebaseDisabledToast = () => {
    toast({ variant: 'destructive', title: 'Feature Disabled', description: 'Firebase is not configured. Please check your setup.' });
  }

  const seedInitialBets = async () => {
    if (!firebaseEnabled || !db) return;
    try {
      const batch = writeBatch(db);
      const betsCollectionRef = collection(db, 'bets');
      
      const bet1Data = {
        question: "Will Michelle wear a veil?",
        type: 'options', options: ['Yes', 'No'], icon: 'Users',
        pool: 0, status: 'open', createdAt: serverTimestamp(),
      };
      batch.set(doc(betsCollectionRef), bet1Data);

      const bet2Data = {
        question: "Will the ceremony be longer than 30 minutes (including the processional and recessional)?",
        type: 'options', options: ['Yes', 'No'], icon: 'Clock',
        pool: 0, status: 'open', createdAt: serverTimestamp(),
      };
      batch.set(doc(betsCollectionRef), bet2Data);

      const bet3Data = {
        question: "Will Adam cry during the ceremony?",
        type: 'options', options: ['Yes', 'No'], icon: 'Mic',
        pool: 0, status: 'open', createdAt: serverTimestamp(),
      };
      batch.set(doc(betsCollectionRef), bet3Data);

      await batch.commit();
      toast({ title: 'Success!', description: 'Initial bets have been seeded.' });
    } catch (error) {
      console.error("Error seeding bets: ", error);
    }
  };


  const addBet = async (betData: Omit<Bet, 'id' | 'pool' | 'status' | 'createdAt'>) => {
    if (!firebaseEnabled || !db) { showFirebaseDisabledToast(); return; }
    try {
      await addDoc(collection(db, 'bets'), {
        ...betData, pool: 0, status: 'open', createdAt: serverTimestamp(),
      });
      toast({ title: "New Bet Added!", description: `"${betData.question}" is now open for wagers.` });
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
    
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const betDoc = await transaction.get(betRef);
        
        if (!betDoc.exists()) throw new Error("Bet does not exist!");
        if (!userDoc.exists()) throw new Error("User data not found.");
        
        const wagersQuery = query(collection(db, "wagers"), where("userId", "==", user.uid), where("betId", "==", betId));
        const existingWagers = await getDocs(wagersQuery);
        const existingWagerDoc = existingWagers.docs[0];

        const oldAmount = existingWagerDoc ? existingWagerDoc.data().amount : 0;
        const amountDifference = amount - oldAmount;
        
        if (userDoc.data().balance < amountDifference) {
            throw new Error("Insufficient balance.");
        }

        // Update balance and pool based on the *difference*
        transaction.update(userRef, { balance: increment(-amountDifference) });
        transaction.update(betRef, { pool: increment(amountDifference) });

        if (existingWagerDoc) {
            // Update existing wager
            transaction.update(existingWagerDoc.ref, { amount, outcome, createdAt: serverTimestamp() });
        } else {
            // Create new wager
            const newWagerRef = doc(collection(db, "wagers"));
            transaction.set(newWagerRef, {
                userId: user.uid,
                nickname: userDoc.data().nickname,
                betId,
                amount,
                outcome,
                createdAt: serverTimestamp(),
            });
        }
    });
  };
  
  const cancelWager = async (wagerId: string) => {
      if (!firebaseEnabled || !db || !user) {
        showFirebaseDisabledToast();
        if (!user) throw new Error("User not authenticated");
        return;
      }
      
      const wagerRef = doc(db, 'wagers', wagerId);
      const userRef = doc(db, 'users', user.uid);
      
      await runTransaction(db, async (transaction) => {
        const wagerDoc = await transaction.get(wagerRef);
        if (!wagerDoc.exists()) throw new Error("Wager not found.");

        const { amount, betId } = wagerDoc.data();
        const betRef = doc(db, 'bets', betId);
        
        // Refund user and decrement pool
        transaction.update(userRef, { balance: increment(amount) });
        transaction.update(betRef, { pool: increment(-amount) });
        
        // Delete wager
        transaction.delete(wagerRef);
      });
  };

  const settleBet = async (betId: string, winningOutcome: string | number) => {
    if (!firebaseEnabled || !db) { showFirebaseDisabledToast(); return; }
    
    try {
      const betRef = doc(db, "bets", betId);
      const wagersQuery = query(collection(db, "wagers"), where("betId", "==", betId));

      const [betDoc, wagersSnapshot] = await Promise.all([
          getDoc(betRef),
          getDocs(wagersQuery)
      ]);

      if (!betDoc.exists() || betDoc.data().status !== 'open') {
        throw new Error("Bet is not open or does not exist.");
      }

      const betPool = betDoc.data().pool;
      const wagers = wagersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wager));
      
      const winningWagers = wagers.filter(wager => wager.outcome == winningOutcome);
      const totalWinningWagerAmount = winningWagers.reduce((sum, wager) => sum + wager.amount, 0);

      const batch = writeBatch(db);

      batch.update(betRef, {
        status: "resolved", winningOutcome, resolvedAt: serverTimestamp(),
      });

      if (winningWagers.length > 0 && totalWinningWagerAmount > 0) {
        const payoutRatio = betPool / totalWinningWagerAmount;
        
        for (const wager of winningWagers) {
          const userRef = doc(db, "users", wager.userId);
          const payout = Math.floor(wager.amount * payoutRatio);
          batch.update(userRef, { balance: increment(payout) });
        }
      }
      await batch.commit();

      if (winningWagers.length > 0) {
        toast({ title: "Bet Settled!", description: `Payouts distributed to ${winningWagers.length} winner(s).` });
      } else {
        toast({ title: "Bet Settled!", description: "There were no winners. The pool remains." });
      }
    } catch (error) {
      console.error("Error settling bet: ", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ variant: 'destructive', title: 'Error Settling Bet', description: errorMessage });
    }
  };

  return (
    <BetContext.Provider value={{ bets, myWagers, loading, addBet, placeBet, cancelWager, settleBet, seedInitialBets }}>
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
