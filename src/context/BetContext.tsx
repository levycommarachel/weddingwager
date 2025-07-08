
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, auth, firebaseEnabled } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, doc, runTransaction, query, where, writeBatch, getDocs, type Firestore } from 'firebase/firestore';
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
  purgeAndReseedDatabase: () => Promise<void>;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

async function seedInitialBets(db: Firestore) {
  const betsCollection = collection(db, 'bets');
  try {
    const existingBets = await getDocs(betsCollection);
    if (!existingBets.empty) {
      console.log("Bets collection is not empty, skipping seed.");
      return;
    }

    console.log("Seeding initial bets...");
    const batch = writeBatch(db);
    
    const bet1Ref = doc(betsCollection);
    batch.set(bet1Ref, {
      question: "How long will the ceremony be (in minutes)?",
      type: 'range',
      range: [20, 45],
      icon: 'Clock',
      pool: 0,
      status: 'open',
      createdAt: serverTimestamp(),
    });

    const bet2Ref = doc(betsCollection);
    batch.set(bet2Ref, {
      question: "Will Michelle wear a veil?",
      type: 'options',
      options: ['Yes', 'No'],
      icon: 'Users',
      pool: 0,
      status: 'open',
      createdAt: serverTimestamp(),
    });

    const bet3Ref = doc(betsCollection);
    batch.set(bet3Ref, {
      question: "Will Adam cry during the vows?",
      type: 'options',
      options: ['Yes', 'No'],
      icon: 'Mic',
      pool: 0,
      status: 'open',
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    console.error("Error seeding bets: ", error);
    throw new Error('Could not add initial bets.');
  }
};

export const BetProvider = ({ children }: { children: ReactNode }) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();
  const hasSeeded = React.useRef(false);

  useEffect(() => {
    if (!firebaseEnabled || !db) {
      setLoading(false);
      return;
    }

    const runInitialSeed = async () => {
      if (process.env.NODE_ENV === 'development' && hasSeeded.current) return;
        try {
            await seedInitialBets(db);
            hasSeeded.current = true;
        } catch (error) {
            console.error("Failed to run initial seed:", error);
            toast({ variant: 'destructive', title: 'Seeding Error', description: 'Could not create initial bets.' });
        }
    }
    runInitialSeed();
    
    const unsubscribe = onSnapshot(collection(db, "bets"), (snapshot) => {
        const betsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
        } as Bet));
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
      // Step 1: Query for all wagers on this bet outside the transaction.
      const wagersQuery = query(collection(db, "wagers"), where("betId", "==", betId));
      const wagersSnapshot = await getDocs(wagersQuery);
      const wagers = wagersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wager));
      
      // Step 2: Identify winning wagers and calculate total amount wagered by winners.
      const winningWagers = wagers.filter(wager => wager.outcome == winningOutcome);
      const totalWinningWagerAmount = winningWagers.reduce((sum, wager) => sum + wager.amount, 0);

      // Step 3: Run the transaction to update all documents atomically.
      const betRef = doc(db, "bets", betId);
      await runTransaction(db, async (transaction) => {
        // Read the bet document inside the transaction.
        const betDoc = await transaction.get(betRef);
        if (!betDoc.exists() || betDoc.data().status !== 'open') {
          throw new Error("Bet is not open or does not exist.");
        }
        const betPool = betDoc.data().pool;

        // Payout logic
        if (winningWagers.length > 0 && totalWinningWagerAmount > 0) {
          const payoutRatio = betPool / totalWinningWagerAmount;
          
          // To update winner balances, we must read their documents inside the transaction first.
          const winnerRefs = winningWagers.map(wager => doc(db, "users", wager.userId));
          const winnerDocs = await Promise.all(winnerRefs.map(ref => transaction.get(ref)));

          // Now, perform the writes for each winner.
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
        
        // Mark the bet as resolved.
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

  const purgeAndReseedDatabase = async () => {
    if (!firebaseEnabled || !db || !user) {
      throw new Error("Firebase not configured or user not logged in");
    }
    const adminUid = user.uid;
  
    const collectionsToDelete = ['wagers', 'bets', 'users'];
    for (const collectionName of collectionsToDelete) {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, collectionName));
      snapshot.docs.forEach((doc) => {
        if (collectionName === 'users' && doc.id === adminUid) {
          return; // Skip deleting the admin's own user document
        }
        batch.delete(doc.ref);
      });
      await batch.commit(); // Commit one batch per collection
    }
  
    // Resetting the hasSeeded flag so initial bets are re-seeded
    hasSeeded.current = false;
    await seedInitialBets(db);
  };


  return (
    <BetContext.Provider value={{ bets, loading, addBet, placeBet, settleBet, purgeAndReseedDatabase }}>
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
