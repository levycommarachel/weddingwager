
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, firebaseEnabled } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, doc, runTransaction, query, where, writeBatch, getDocs, type Firestore, getDoc, increment, deleteDoc, collectionGroup, FieldValue } from 'firebase/firestore';
import type { Bet, Wager, Parlay, ParlayLeg, Timestamp } from '@/types';
import { useUser } from './UserContext';

interface BetContextType {
  bets: Bet[];
  myWagers: Wager[];
  myParlays: Parlay[];
  loading: boolean;
  addBet: (bet: Omit<Bet, 'id' | 'pool' | 'status' | 'createdAt'>) => Promise<void>;
  placeBet: (betId: string, outcome: string | number, amount: number) => Promise<void>;
  placeParlay: (legs: ParlayLeg[], wager: number, payoutMultiplier: number, potentialPayout: number) => Promise<void>;
  settleBet: (betId: string, winningOutcome: string | number) => Promise<void>;
  seedInitialBets: () => Promise<void>;
  updateWager: (wagerId: string, betId: string, oldAmount: number, newAmount: number, newOutcome: string | number) => Promise<void>;
  updateParlay: (parlayId: string, newLegs: ParlayLeg[], newWager: number) => Promise<void>;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

export const BetProvider = ({ children }: { children: ReactNode }) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [myWagers, setMyWagers] = useState<Wager[]>([]);
  const [myParlays, setMyParlays] = useState<Parlay[]>([]);
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

  // Listen for user's parlays
    useEffect(() => {
        if (!firebaseEnabled || !db || !user) {
            setMyParlays([]);
            return;
        }
        const q = query(collection(db, "parlays"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const parlaysData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Parlay));
            parlaysData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
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
    if (!db) {
        showFirebaseDisabledToast();
        return;
    }
    try {
      const betsCollectionRef = collection(db, 'bets');
      const querySnapshot = await getDocs(query(betsCollectionRef));
      
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
    if (!db) {
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
    if (!db) {
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

  const placeParlay = async (legs: ParlayLeg[], wager: number, payoutMultiplier: number, potentialPayout: number) => {
    if (!user) throw new Error("User not authenticated.");
    if (!db) {
      showFirebaseDisabledToast();
      throw new Error("Firebase is not configured.");
    }

    const userRef = doc(db, "users", user.uid);
    const parlayRef = doc(collection(db, "parlays"));

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User data not found.");
        
        const currentBalance = userDoc.data().balance;
        if (currentBalance < wager) throw new Error("Insufficient balance.");

        transaction.update(userRef, { balance: increment(-wager) });

        const newParlayData = {
            userId: user.uid,
            nickname: userDoc.data().nickname,
            wager,
            legs,
            legIds: legs.map(l => l.betId),
            payoutMultiplier,
            potentialPayout,
            status: 'open',
            resolvedLegs: {},
            createdAt: serverTimestamp(),
        };
        transaction.set(parlayRef, newParlayData);
    });
  }

  const updateWager = async (wagerId: string, betId: string, oldAmount: number, newAmount: number, newOutcome: string | number) => {
    if (!user) throw new Error("User not authenticated");
    if (!db) {
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

  const updateParlay = async (parlayId: string, newLegs: ParlayLeg[], newWager: number) => {
    if (!user) throw new Error("User not authenticated.");
    if (!db) {
        showFirebaseDisabledToast();
        throw new Error("Firebase is not configured.");
    }

    const parlayRef = doc(db, "parlays", parlayId);
    const userRef = doc(db, "users", user.uid);

    await runTransaction(db, async (transaction) => {
        const [parlayDoc, userDoc] = await Promise.all([
            transaction.get(parlayRef),
            transaction.get(userRef),
        ]);

        if (!userDoc.exists()) {
            throw new Error("User data not found.");
        }
        if (!parlayDoc.exists() || parlayDoc.data().userId !== user.uid) {
            throw new Error("Parlay not found or you don't have permission to edit it.");
        }

        const parlayData = parlayDoc.data() as Parlay;

        if (parlayData.status !== 'open') {
            throw new Error("This parlay is no longer open for changes.");
        }

        const oldWager = parlayData.wager;
        const wagerDifference = newWager - oldWager;
        const currentBalance = userDoc.data().balance;

        if (currentBalance < wagerDifference) {
            throw new Error("Insufficient balance to increase your wager.");
        }
        
        const getPayoutMultiplier = (legCount: number): number => {
            if (legCount < 2) return 0;
            if (legCount === 2) return 2.5;
            if (legCount === 3) return 5;
            if (legCount === 4) return 10;
            return 15;
        }

        const newMultiplier = getPayoutMultiplier(newLegs.length);
        const newPotentialPayout = Math.floor(newWager * newMultiplier);

        if (wagerDifference !== 0) {
             transaction.update(userRef, { balance: increment(-wagerDifference) });
        }

        transaction.update(parlayRef, {
            wager: newWager,
            legs: newLegs,
            legIds: newLegs.map(l => l.betId),
            payoutMultiplier: newMultiplier,
            potentialPayout: newPotentialPayout,
            updatedAt: serverTimestamp(),
        });
    });
  };

  const settleBet = async (betId: string, winningOutcome: string | number) => {
    if (!db) {
        showFirebaseDisabledToast();
        return;
    }
    
    // Settle single wagers
    await settleSingleWagers(betId, winningOutcome, db);

    // Settle relevant parlays
    await checkAndSettleParlays(betId, winningOutcome, db);
  };

  const settleSingleWagers = async (betId: string, winningOutcome: string | number, db: Firestore) => {
     try {
      const betRef = doc(db, "bets", betId);
      const wagersQuery = query(collection(db, "wagers"), where("betId", "==", betId));

      await runTransaction(db, async (transaction) => {
        const betDoc = await transaction.get(betRef);
        if (!betDoc.exists() || betDoc.data().status !== 'open') {
            throw new Error("Bet is not open or does not exist.");
        }
        
        const wagersSnapshot = await getDocs(wagersQuery);

        const betPool = betDoc.data()!.pool;
        const wagers = wagersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wager));
        
        const winningWagers = wagers.filter(wager => String(wager.outcome) === String(winningOutcome));
        const losingWagers = wagers.filter(wager => String(wager.outcome) !== String(winningOutcome));
        const totalWinningWagerAmount = winningWagers.reduce((sum, wager) => sum + wager.amount, 0);

        transaction.update(betRef, {
          status: "resolved", winningOutcome, resolvedAt: serverTimestamp(),
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
          // No winners, so refund all wagers.
          for (const wager of wagers) {
              const userRef = doc(db, "users", wager.userId);
              const wagerRef = doc(db, "wagers", wager.id);
              const refundAmount = wager.amount;
              transaction.update(userRef, { balance: increment(refundAmount) });
              transaction.update(wagerRef, { payout: refundAmount });
          }
        }
      });
      toast({ title: "Bet Settled!", description: `Payouts distributed for single wagers.` });
    } catch (error) {
      console.error("Error settling single wagers: ", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ variant: 'destructive', title: 'Error Settling Wagers', description: errorMessage });
    }
  }

  const checkAndSettleParlays = async (settledBetId: string, winningOutcome: string | number, db: Firestore) => {
      const parlaysQuery = query(collection(db, "parlays"), where("status", "==", "open"), where("legIds", "array-contains", settledBetId));
      const parlaysSnapshot = await getDocs(parlaysQuery);

      if (parlaysSnapshot.empty) return;

      for (const parlayDoc of parlaysSnapshot.docs) {
          const parlayRef = doc(db, "parlays", parlayDoc.id);
          try {
              await runTransaction(db, async (transaction) => {
                  const freshParlayDoc = await transaction.get(parlayRef);
                  if (!freshParlayDoc.exists()) return;

                  const parlay = freshParlayDoc.data() as Parlay;
                  const legToResolve = parlay.legs.find(l => l.betId === settledBetId);

                  if (!legToResolve) return;

                  const updatedResolvedLegs = { ...parlay.resolvedLegs };
                  const legResult = String(legToResolve.chosenOutcome) === String(winningOutcome) ? 'won' : 'lost';
                  updatedResolvedLegs[settledBetId] = legResult;

                  let parlayStatus = parlay.status;
                  let finalPayout: number | undefined = undefined;

                  const allLegsResolved = parlay.legs.length === Object.keys(updatedResolvedLegs).length;

                  if (legResult === 'lost') {
                      parlayStatus = 'lost';
                      finalPayout = 0;
                  } else if (allLegsResolved) {
                      const allWon = Object.values(updatedResolvedLegs).every(r => r === 'won');
                      if (allWon) {
                          parlayStatus = 'won';
                          finalPayout = parlay.potentialPayout;
                          const userRef = doc(db, "users", parlay.userId);
                          transaction.update(userRef, { balance: increment(finalPayout) });
                      } else {
                          // This case should be covered by the legResult === 'lost' check, but as a safeguard
                          parlayStatus = 'lost';
                          finalPayout = 0;
                      }
                  }

                  const updateData: Partial<Parlay> & { resolvedAt?: FieldValue } = { resolvedLegs: updatedResolvedLegs };

                  if (parlayStatus !== parlay.status) {
                      updateData.status = parlayStatus;
                      updateData.resolvedAt = serverTimestamp();
                      updateData.payout = finalPayout;
                  }
                  
                  transaction.update(parlayRef, updateData);
              });
          } catch (error) {
              console.error(`Error settling parlay ${parlayDoc.id}:`, error);
          }
      }
      toast({ title: "Parlays Updated", description: "Affected parlays have been checked and updated." });
  }

  return (
    <BetContext.Provider value={{ bets, myWagers, myParlays, loading, addBet, placeBet, placeParlay, updateWager, settleBet, seedInitialBets, updateParlay }}>
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

    