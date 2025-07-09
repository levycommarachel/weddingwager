
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, firebaseEnabled } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, doc, runTransaction, query, where, writeBatch, getDocs, type Firestore, getDoc, increment } from 'firebase/firestore';
import type { Bet, Wager, Timestamp } from '@/types';
import { useUser } from './UserContext';

interface BetContextType {
  bets: Bet[];
  myWagers: Wager[];
  loading: boolean;
  addBet: (bet: Omit<Bet, 'id' | 'pool' | 'status' | 'createdAt'>) => Promise<void>;
  placeBet: (betId: string, outcome: string | number, amount: number) => Promise<void>;
  settleBet: (betId: string, winningOutcome: string | number) => Promise<void>;
  seedInitialBets: () => Promise<void>;
  updateWager: (wagerId: string, betId: string, oldAmount: number, newAmount: number, newOutcome: string | number) => Promise<void>;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

export const BetProvider = ({ children }: { children: ReactNode }) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [myWagers, setMyWagers] = useState<Wager[]>([]);
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

  // Listen for user's wagers
  useEffect(() => {
    if (!firebaseEnabled || !db || !user) {
        setMyWagers([]);
        return;
    }
    const q = query(collection(db, "wagers"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const wagersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Wager));
        wagersData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
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
    const currentDb = db;
    if (!currentDb) {
        showFirebaseDisabledToast();
        return;
    }
    try {
      const betsCollectionRef = collection(currentDb, 'bets');
      const querySnapshot = await getDocs(query(betsCollectionRef));
      
      if (!querySnapshot.empty) {
        return; // Don't seed if bets already exist
      }
      
      const batch = writeBatch(currentDb);
      
      const bet1Data = {
        question: "Will Michelle wear a veil?",
        type: 'options', options: ['Yes', 'No'], icon: 'Heart',
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
        type: 'options', options: ['Yes', 'No'], icon: 'Users',
        pool: 0, status: 'open', createdAt: serverTimestamp(),
      };
      batch.set(doc(betsCollectionRef), bet3Data);
      
      const bet4Data = {
        question: "How many speeches will there be during the reception?",
        type: 'range', range: [1, 8], icon: 'Mic',
        pool: 0, status: 'open', createdAt: serverTimestamp(),
      };
      batch.set(doc(betsCollectionRef), bet4Data);

      await batch.commit();
      toast({ title: 'Success!', description: 'Initial bets have been seeded.' });
    } catch (error) {
      console.error("Error seeding bets: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not seed initial bets.' });
    }
  };


  const addBet = async (betData: Omit<Bet, 'id' | 'pool' | 'status' | 'createdAt'>) => {
    const currentDb = db;
    if (!currentDb) {
        showFirebaseDisabledToast();
        throw new Error("Firebase is not configured.");
    }
    try {
      await addDoc(collection(currentDb, 'bets'), {
        ...betData, pool: 0, status: 'open', createdAt: serverTimestamp(),
      });
      toast({ title: "New Bet Added!", description: `"${betData.question}" is now open for wagers.` });
    } catch (error) {
      console.error("Error adding bet: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add new bet.' });
    }
  };

  const placeBet = async (betId: string, outcome: string | number, amount: number) => {
    if (!user) throw new Error("User not authenticated.");
    const currentDb = db;
    if (!currentDb) {
        showFirebaseDisabledToast();
        throw new Error("Firebase is not configured.");
    }

    const wagerId = `${user.uid}_${betId}`;
    const wagerRef = doc(currentDb, "wagers", wagerId);
    const userRef = doc(currentDb, "users", user.uid);
    const betRef = doc(currentDb, "bets", betId);
    
    await runTransaction(currentDb, async (transaction) => {
        const [wagerDoc, userDoc, betDoc] = await Promise.all([
            transaction.get(wagerRef),
            transaction.get(userRef),
            transaction.get(betRef)
        ]);
        
        if (wagerDoc.exists()) {
            throw new Error("You have already placed a wager on this bet.");
        }
        if (!betDoc.exists()) {
            throw new Error("Bet does not exist!");
        }
        if (!userDoc.exists()) {
            throw new Error("User data not found.");
        }

        const currentBalance = userDoc.data().balance;
        if (currentBalance < amount) {
            throw new Error("Insufficient balance.");
        }

        transaction.update(userRef, { balance: increment(-amount) });
        transaction.update(betRef, { pool: increment(amount) });
        transaction.set(wagerRef, {
            userId: user.uid,
            nickname: userDoc.data().nickname,
            betId,
            amount,
            outcome,
            createdAt: serverTimestamp(),
        });
    });
  };

  const updateWager = async (wagerId: string, betId: string, oldAmount: number, newAmount: number, newOutcome: string | number) => {
    if (!user) throw new Error("User not authenticated");
    const currentDb = db;
    if (!currentDb) {
        showFirebaseDisabledToast();
        throw new Error("Firebase is not configured.");
    }

    const wagerRef = doc(currentDb, "wagers", wagerId);
    const userRef = doc(currentDb, "users", user.uid);
    const betRef = doc(currentDb, "bets", betId);

    await runTransaction(currentDb, async (transaction) => {
        const [userDoc, betDoc] = await Promise.all([
            transaction.get(userRef),
            transaction.get(betRef)
        ]);

        if (!betDoc.exists() || betDoc.data().status !== 'open') {
            throw new Error("This bet is no longer open for changes.");
        }
        if (!userDoc.exists()) {
            throw new Error("User data not found.");
        }

        const currentBalance = userDoc.data().balance;
        const amountDifference = newAmount - oldAmount;

        if (currentBalance < amountDifference) {
            throw new Error("Insufficient balance for this change.");
        }

        transaction.update(userRef, { balance: increment(-amountDifference) });
        transaction.update(betRef, { pool: increment(amountDifference) });
        transaction.update(wagerRef, {
            amount: newAmount,
            outcome: newOutcome,
            updatedAt: serverTimestamp()
        });
    });
  };

  const settleBet = async (betId: string, winningOutcome: string | number) => {
    const currentDb = db;
    if (!currentDb) {
      showFirebaseDisabledToast();
      return;
    }

    try {
      // Query for all wagers related to the bet *before* the transaction.
      const wagersQuery = query(collection(currentDb, "wagers"), where("betId", "==", betId));
      const wagersSnapshot = await getDocs(wagersQuery);
      const wagers = wagersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wager));

      const betRef = doc(currentDb, "bets", betId);
      
      await runTransaction(currentDb, async (transaction) => {
        // Read the bet document *inside* the transaction to ensure atomicity.
        const betDoc = await transaction.get(betRef);
        if (!betDoc.exists() || betDoc.data().status !== 'open') {
          throw new Error("Bet is not open or does not exist.");
        }

        const betPool = betDoc.data()!.pool;

        // Process wagers with the data fetched before the transaction.
        const winningWagers = wagers.filter(wager => String(wager.outcome) === String(winningOutcome));
        const losingWagers = wagers.filter(wager => String(wager.outcome) !== String(winningOutcome));
        const totalWinningWagerAmount = winningWagers.reduce((sum, wager) => sum + wager.amount, 0);
        
        // Update the bet status.
        transaction.update(betRef, {
          status: "resolved", 
          winningOutcome: String(winningOutcome),
          resolvedAt: serverTimestamp(),
        });

        if (winningWagers.length > 0 && totalWinningWagerAmount > 0) {
          const payoutRatio = betPool / totalWinningWagerAmount;
          
          // Update winning wagers and user balances.
          for (const wager of winningWagers) {
            const userRef = doc(currentDb, "users", wager.userId);
            const wagerRef = doc(currentDb, "wagers", wager.id);
            const payout = Math.floor(wager.amount * payoutRatio);
            transaction.update(userRef, { balance: increment(payout) });
            transaction.update(wagerRef, { payout });
          }

          // Update losing wagers.
          for (const wager of losingWagers) {
            const wagerRef = doc(currentDb, "wagers", wager.id);
            transaction.update(wagerRef, { payout: 0 });
          }
          
        } else {
          // No winners, so refund all wagers.
          for (const wager of wagers) {
              const userRef = doc(currentDb, "users", wager.userId);
              const wagerRef = doc(currentDb, "wagers", wager.id);
              const refundAmount = wager.amount;
              transaction.update(userRef, { balance: increment(refundAmount) });
              transaction.update(wagerRef, { payout: refundAmount });
          }
        }
      });

      toast({ title: "Bet Settled!", description: `Payouts have been distributed.` });

    } catch (error) {
      console.error("Error settling wagers: ", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ variant: 'destructive', title: 'Error Settling Wagers', description: errorMessage });
    }
  };


  return (
    <BetContext.Provider value={{ bets, myWagers, loading, addBet, placeBet, updateWager, settleBet, seedInitialBets }}>
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
