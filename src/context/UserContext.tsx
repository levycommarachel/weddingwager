
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { auth, db, firebaseEnabled } from '@/lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import type { UserData } from '@/types';

interface UserContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let unsubscribeFirestore: () => void;
    if (user && firebaseEnabled && db) {
        const userRef = doc(db, 'users', user.uid);
        unsubscribeFirestore = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                setUserData(doc.data() as UserData);
            }
            setLoading(false);
        });
    } else {
        setLoading(false);
    }
    return () => {
        if (unsubscribeFirestore) {
            unsubscribeFirestore();
        }
    };
  }, [user]);

  const signInWithGoogle = async (): Promise<{ isNewUser: boolean }> => {
    if (!firebaseEnabled || !auth || !db) {
      throw new Error("Firebase not configured");
    }
    
    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const loggedInUser = userCredential.user;
        const userRef = doc(db, 'users', loggedInUser.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          await setDoc(userRef, {
            nickname: loggedInUser.displayName || 'New Player',
            photoURL: loggedInUser.photoURL,
            balance: 1000, // Starting balance
            isAdmin: false,
            lastActive: serverTimestamp(),
          });
          return { isNewUser: true };
        }
        return { isNewUser: false };
    } catch (error: any) {
        console.error("Google Sign-In error:", error);
        throw error; // re-throw to be caught by the UI form
    }
  };

  const logout = async () => {
      if (!firebaseEnabled || !auth) {
        setUser(null);
        setUserData(null);
        return;
      }
      await auth.signOut();
      setUser(null);
      setUserData(null);
  }

  return (
    <UserContext.Provider value={{ user, userData, loading, signInWithGoogle, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
