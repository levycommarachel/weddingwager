
import type { Timestamp } from "firebase/firestore";

// Stored in /users/{uid}
export interface UserData {
  nickname: string;
  photoURL?: string;
  balance: number;
  isAdmin: boolean;
  lastActive: Timestamp;
}

// Stored in /bets/{betId}
export interface Bet {
  id: string; // Firestore document ID
  question: string;
  type: 'range' | 'options';
  range?: [number, number];
  options?: string[];
  pool: number;
  icon: string;
  status: 'open' | 'closed' | 'resolved';
  winningOutcome?: string | number; // Admin sets this
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
}

// Stored in /wagers/{wagerId}
export interface Wager {
    id: string; // Firestore doc ID
    userId: string;
    nickname: string;
    betId: string;
    amount: number;
    outcome: string | number; // What the user bet on
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    payout?: number; // Calculated on settlement
}

// A single bet within a parlay
export interface ParlayLeg {
  betId: string;
  question: string;
  chosenOutcome: string | number;
  type: 'range' | 'options';
  options?: string[];
  range?: [number, number];
  icon: string;
}

// Stored in /parlays/{parlayId}
export interface Parlay {
  id: string; // Firestore document ID
  userId: string;
  nickname: string;
  wager: number;
  legs: ParlayLeg[];
  legIds: string[]; // For querying
  payoutMultiplier: number;
  potentialPayout: number;
  status: 'open' | 'won' | 'lost';
  // Keep track of resolved legs to determine overall status
  resolvedLegs: Record<string, 'won' | 'lost'>;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
  updatedAt?: Timestamp;
  payout?: number; // Final payout amount
}
