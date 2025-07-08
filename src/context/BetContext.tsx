"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, auth, firebaseEnabled } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, doc, runTransaction, query, where, writeBatch, getDocs } from 'firebase/firestore';
import type { Bet } from '@/types';
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

    const initializeBets = async () => {
      const betsCollection = collection(db, 'bets');
      
      try {
        const existingBets = await getDocs(betsCollection);
        if (existingBets.empty) {
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
        }
      } catch (error) {
        console.error("Error seeding bets: ", error);
        toast({ variant: 'destructive', title: 'Error Seeding Data', description: 'Could not add initial bets.' });
      }

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

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;
    initializeBets().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

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
    const wagerColRef = collection(db, "wagers");

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists() || userDoc.data().balance < amount) {
        throw new Error("Insufficient balance.");
      }
      
      const newBalance = userDoc.data().balance - amount;
      transaction.update(userRef, { balance: newBalance });

      const betDoc = await transaction.get(betRef);
      if (!betDoc.exists()) {
        throw new Error("Bet does not exist!");
      }
      const newPool = betDoc.data().pool + amount;
      transaction.update(betRef, { pool: newPool });
      
      transaction.set(doc(wagerColRef), {
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
        const betRef = doc(db, "bets", betId);
        await runTransaction(db, async (transaction) => {
            const betDoc = await transaction.get(betRef);
            if (!betDoc.exists() || betDoc.data().status !== 'open') {
                throw new Error("Bet is not open or does not exist.");
            }
            transaction.update(betRef, {
                status: "resolved",
                winningOutcome: winningOutcome,
                resolvedAt: serverTimestamp(),
            });

            // Payout logic would go here, ideally in a Cloud Function for security.
            // This example will not distribute winnings.
        });
        
        toast({
            title: "Bet Settled",
            description: "The bet has been resolved. Winnings are not distributed in this demo.",
        });

    } catch (error) {
        console.error("Error settling bet: ", error);
        toast({ variant: 'destructive', title: 'Error', description: `Could not settle bet. ${error}` });
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
