"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { auth, db, firebaseEnabled } from '@/lib/firebase';
import { onAuthStateChanged, signInAnonymously, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import type { UserData } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface UserContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  login: (nickname: string) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!firebaseEnabled) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth!, (currentUser) => {
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
    if (user && firebaseEnabled) {
        const userRef = doc(db!, 'users', user.uid);
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

  const login = async (nickname: string) => {
    if (!firebaseEnabled || !auth || !db) {
      toast({
        variant: 'destructive',
        title: 'Offline Mode',
        description: "Firebase is not configured. Cannot log in.",
      });
      throw new Error("Firebase not configured");
    }

    const userCredential = await signInAnonymously(auth);
    const userRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        nickname,
        balance: 1000, // Starting balance
        isAdmin: false,
        lastActive: serverTimestamp(),
      });
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
    <UserContext.Provider value={{ user, userData, loading, login, logout }}>
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
