
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
