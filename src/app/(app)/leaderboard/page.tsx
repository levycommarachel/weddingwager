
'use client'

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Loader2 } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { db, firebaseEnabled } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import type { UserData } from "@/types";
import Image from "next/image";

interface LeaderboardUser extends UserData {
    id: string;
    rank: number;
}

export default function LeaderboardPage() {
    const { user } = useUser();
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firebaseEnabled || !db) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, "users"), orderBy("balance", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData = querySnapshot.docs.map(doc => {
                const data = doc.data() as UserData;
                // Ensure balance is a number, defaulting to 0 if not.
                data.balance = typeof data.balance === 'number' ? data.balance : 0;
                return { id: doc.id, ...data };
            });

            const rankedUsers: LeaderboardUser[] = [];
            let rank = 0;
            let lastBalance = Infinity;
            usersData.forEach((user, index) => {
                if (user.balance < lastBalance) {
                    rank = index + 1;
                }
                rankedUsers.push({ ...user, rank: rank });
                lastBalance = user.balance;
            });
            
            setLeaderboard(rankedUsers);
            setLoading(false);
        }, (error) => {
            console.error("Leaderboard data listener error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

  return (
    <div className="container mx-auto py-8 px-4">
       <div className="text-center mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground mt-2 text-lg">See who's winning the wager war.</p>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Trophy className="text-amber-500" />
                Top Players
            </CardTitle>
            <CardDescription>Current standings based on total points.</CardDescription>
        </Header>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[80px]">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {leaderboard.map((player) => (
                <TableRow key={player.id} className={player.id === user?.uid ? "bg-accent" : ""}>
                    <TableCell className="font-bold text-lg">{player.rank}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                           <Image src={`https://placehold.co/40x40.png`} alt={player.nickname} width={40} height={40} className="rounded-full" data-ai-hint="person avatar" />
                            <span className="font-medium">{player.nickname}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                        {typeof player.balance === 'number' ? player.balance.toLocaleString() : '0'} Pts
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
