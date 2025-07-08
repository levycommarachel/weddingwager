"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface UserContextType {
  nickname: string;
  setNickname: (name: string) => void;
  balance: number;
  setBalance: (balance: number | ((prevBalance: number) => number)) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [nickname, setNicknameState] = useState<string>('');
  const [balance, setBalance] = useState<number>(1000); // Starting balance
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedNickname = localStorage.getItem('wedding-wager-nickname');
      if (storedNickname) {
        setNicknameState(storedNickname);
      }
      const storedBalance = localStorage.getItem('wedding-wager-balance');
      if (storedBalance) {
        setBalance(Number(storedBalance));
      }
    } catch (error) {
      console.warn("Could not read from local storage.");
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const setNickname = (name: string) => {
    try {
      localStorage.setItem('wedding-wager-nickname', name);
    } catch (error) {
      console.warn("Could not write to local storage.");
    }
    setNicknameState(name);
  };
  
  const setBalanceWithStorage = (newBalance: number | ((prevBalance: number) => number)) => {
    setBalance(prevBalance => {
        const updatedBalance = typeof newBalance === 'function' ? newBalance(prevBalance) : newBalance;
        try {
            localStorage.setItem('wedding-wager-balance', String(updatedBalance));
        } catch (error) {
            console.warn("Could not write to local storage.");
        }
        return updatedBalance;
    });
  }

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return (
    <UserContext.Provider value={{ nickname, setNickname, balance, setBalance: setBalanceWithStorage }}>
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
