
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, firebaseEnabled } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, doc, runTransaction, query, where, writeBatch, getDocs, type Firestore, getDoc, increment, orderBy } from 'firebase/firestore';
import type { Bet, Wager, Parlay, ParlayLeg, Timestamp } from '@/types';
import { useUser } from './UserContext';

interface BetContextType {
  bets: Bet[];
  myWagers: Wager[];
  myParlays: Parlay[];
  loading: boolean;
  addBet: (bet: Omit<Bet, 'id' | 'pool' | 'status' | 'createdAt'>) => Promise<void>;
  placeBet: (betId: string, outcome: string | number, amount: number) => Promise<void>;
  settleBet: (betId: string, winningOutcome: string | number) => Promise<void>;
  seedInitialBets: () => Promise<void>;
  updateWager: (wagerId: string, betId: string, oldAmount: number, newAmount: number, newOutcome: string | number) => Promise<void>;
  createParlay: (legs: ParlayLeg[], amount: number) => Promise<void>;
  updateParlay: (parlayId: string, newAmount: number) => Promise<void>;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

export const BetProvider = ({ children }: { children: ReactNode }) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [myWagers, setMyWagers] = useState<Wager[]>([]);
  const [myParlays, setMyParlays] = useState<Parlay[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, userData } = useUser();
  
  // Listen for all bets
  useEffect(() => {
    if (!firebaseEnabled || !db) {
      setLoading(false);
      return;
    }
    
    const q = query(collection(db, "bets"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const betsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
        } as Bet));

        setBets(betsData);
        setLoading(false);
    }, (error) => {
        console.error("Bet listener error:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for user's wagers
  useEffect(() => {
    if (!firebaseEnabled || !user) {
        setMyWagers([]);
        return;
    }
    // Remove orderBy from query to avoid needing a composite index
    const q = query(collection(db, "wagers"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const wagersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Wager));
        
        // Sort on the client-side
        wagersData.sort((a, b) => {
            const dateA = a.createdAt?.toMillis() || 0;
            const dateB = b.createdAt?.toMillis() || 0;
            return dateB - dateA; // descending
        });

        setMyWagers(wagersData);
    }, (error) => {
        console.error("Wager listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for user's parlays
  useEffect(() => {
    if (!firebaseEnabled || !user) {
        setMyParlays([]);
        return;
    }
    const parlaysCollectionRef = collection(db, `users/${user.uid}/parlays`);
    const q = query(parlaysCollectionRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const parlaysData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Parlay));
        setMyParlays(parlaysData);
    }, (error) => {
        console.error("Parlay listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const showFirebaseDisabledToast = () => {
    toast({ variant: 'destructive', title: 'Feature Disabled', description: 'Firebase is not configured. Please check your setup.' });
  }

  const seedInitialBets = async () => {
    if (!firebaseEnabled || !db) {
        showFirebaseDisabledToast();
        return;
    }
    try {
      const betsCollectionRef = collection(db, 'bets');
      let querySnapshot = await getDocs(query(betsCollectionRef));
      
      if (!querySnapshot.empty) {
        return; // Don't seed if bets already exist
      }
      
      const batch = writeBatch(db);
      
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
        type: 'number', icon: 'Mic',
        pool: 0, status: 'open', createdAt: serverTimestamp(),
      };
      batch.set(doc(betsCollectionRef), bet4Data);

      await batch.commit();

      // Re-fetch bets after seeding
      querySnapshot = await getDocs(query(betsCollectionRef, orderBy("createdAt", "desc")));
      const betsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      } as Bet));
      setBets(betsData);

      toast({ title: 'Success!', description: 'Initial bets have been seeded.' });
    } catch (error) {
      console.error("Error seeding bets: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not seed initial bets.' });
    }
  };


  const addBet = async (betData: Omit<Bet, 'id' | 'pool' | 'status' | 'createdAt'>) => {
    if (!firebaseEnabled || !db) {
        showFirebaseDisabledToast();
        throw new Error("Firebase is not configured.");
    }
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
    if (!user) throw new Error("User not authenticated.");
    if (!firebaseEnabled || !db) {
        showFirebaseDisabledToast();
        throw new Error("Firebase is not configured.");
    }

    const wagerId = `${user.uid}_${betId}`;
    const wagerRef = doc(db, "wagers", wagerId);
    const userRef = doc(db, "users", user.uid);
    const betRef = doc(db, "bets", betId);
    
    await runTransaction(db, async (transaction) => {
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

  const createParlay = async (legs: ParlayLeg[], amount: number) => {
    if (!user || !userData) throw new Error("User not authenticated.");
    if (!firebaseEnabled || !db) {
      showFirebaseDisabledToast();
      throw new Error("Firebase is not configured.");
    }

    if (legs.length < 2) {
      throw new Error("A parlay must have at least 2 legs.");
    }
    if (amount <= 0) {
      throw new Error("Wager amount must be positive.");
    }

    const userRef = doc(db, "users", user.uid);
    const parlaysRef = collection(db, `users/${user.uid}/parlays`);

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists() || userDoc.data().balance < amount) {
        throw new Error("Insufficient balance.");
      }
      
      const potentialPayout = Math.floor(amount * Math.pow(2, legs.length));

      transaction.update(userRef, { balance: increment(-amount) });
      
      const newParlayRef = doc(parlaysRef);
      transaction.set(newParlayRef, {
        userId: user.uid,
        nickname: userData.nickname,
        legs,
        amount,
        potentialPayout,
        status: 'open',
        resolvedLegs: {},
        createdAt: serverTimestamp(),
      });
    });
  };

  const updateWager = async (wagerId: string, betId: string, oldAmount: number, newAmount: number, newOutcome: string | number) => {
    if (!user) throw new Error("User not authenticated");
    if (!firebaseEnabled || !db) {
        showFirebaseDisabledToast();
        throw new Error("Firebase is not configured.");
    }

    const wagerRef = doc(db, "wagers", wagerId);
    const userRef = doc(db, "users", user.uid);
    const betRef = doc(db, "bets", betId);

    await runTransaction(db, async (transaction) => {
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

  const updateParlay = async (parlayId: string, newAmount: number) => {
    if (!user) throw new Error("User not authenticated");
    if (!firebaseEnabled || !db) {
        showFirebaseDisabledToast();
        throw new Error("Firebase is not configured.");
    }

    const userRef = doc(db, "users", user.uid);
    const parlayRef = doc(db, `users/${user.uid}/parlays`, parlayId);

    await runTransaction(db, async (transaction) => {
        const [userDoc, parlayDoc] = await Promise.all([
            transaction.get(userRef),
            transaction.get(parlayRef)
        ]);

        if (!parlayDoc.exists() || parlayDoc.data().status !== 'open') {
            throw new Error("This parlay is no longer open for changes.");
        }
        if (!userDoc.exists()) {
            throw new Error("User data not found.");
        }

        const parlayData = parlayDoc.data() as Parlay;
        const oldAmount = parlayData.amount;
        const amountDifference = newAmount - oldAmount;

        const currentBalance = userDoc.data().balance;
        if (currentBalance < amountDifference) {
            throw new Error("Insufficient balance for this change.");
        }
        
        const newPotentialPayout = Math.floor(newAmount * Math.pow(2, parlayData.legs.length));

        transaction.update(userRef, { balance: increment(-amountDifference) });
        transaction.update(parlayRef, {
            amount: newAmount,
            potentialPayout: newPotentialPayout,
            updatedAt: serverTimestamp()
        });
    });
  };

  const settleBet = async (betId: string, winningOutcome: string | number) => {
    if (!firebaseEnabled || !db) {
      showFirebaseDisabledToast();
      return;
    }

    try {
      const betRef = doc(db, "bets", betId);
      
      await runTransaction(db, async (transaction) => {
        const betDoc = await transaction.get(betRef);
        if (!betDoc.exists() || betDoc.data().status !== 'open') {
          throw new Error("Bet is not open or does not exist.");
        }

        const betData = betDoc.data();
        if (!betData) throw new Error("Bet data is missing.");
        
        const betPool = betData.pool;
        
        const wagersQuery = query(collection(db, "wagers"), where("betId", "==", betId));
        // Use getDocs without transaction for reads outside of transaction scope if needed
        const wagersSnapshot = await getDocs(wagersQuery); 
        const wagers = wagersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wager));

        const winningWagers = wagers.filter(wager => String(wager.outcome) === String(winningOutcome));
        const losingWagers = wagers.filter(wager => String(wager.outcome) !== String(winningOutcome));
        const totalWinningWagerAmount = winningWagers.reduce((sum, wager) => sum + wager.amount, 0);
        
        transaction.update(betRef, {
          status: "resolved", 
          winningOutcome: String(winningOutcome),
          resolvedAt: serverTimestamp(),
        });

        if (winningWagers.length > 0 && totalWinningWagerAmount > 0) {
          const payoutRatio = betPool / totalWinningWagerAmount;
          
          for (const wager of winningWagers) {
            const userRef = doc(db, "users", wager.userId);
            const wagerRef = doc(db, "wagers", wager.id);
            const payout = Math.floor(wager.amount * payoutRatio);
            transaction.update(userRef, { balance: increment(payout) });
            transaction.update(wagerRef, { payout });
          }

          for (const wager of losingWagers) {
            const wagerRef = doc(db, "wagers", wager.id);
            transaction.update(wagerRef, { payout: 0 });
          }
          
        } else {
          // If there are no winners, refund everyone
          for (const wager of wagers) {
              const userRef = doc(db, "users", wager.userId);
              const wagerRef = doc(db, "wagers", wager.id);
              const refundAmount = wager.amount;
              transaction.update(userRef, { balance: increment(refundAmount) });
              transaction.update(wagerRef, { payout: refundAmount });
          }
        }
        // TODO: Add logic here to check for and update any parlays that include this bet.
      });

      toast({ title: "Bet Settled!", description: `Payouts have been distributed.` });

    } catch (error) {
      console.error("Error settling wagers: ", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ variant: 'destructive', title: 'Error Settling Wagers', description: errorMessage });
    }
  };


  return (
    <BetContext.Provider value={{ bets, myWagers, myParlays, loading, addBet, placeBet, updateWager, settleBet, seedInitialBets, createParlay, updateParlay }}>
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

    