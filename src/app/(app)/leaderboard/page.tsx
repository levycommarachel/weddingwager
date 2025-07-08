'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useUser } from "@/context/UserContext";
import Image from "next/image";

// In a real application, this data would come from a backend that tracks all users.
// For this prototype, we'll mock it and include the current user.
const mockLeaderboardData = [
  { rank: 1, nickname: "MaidOfHonor", balance: 12500, icon: "https://placehold.co/40x40.png", dataAiHint: "woman smiling" },
  { rank: 2, nickname: "BestMan4Ever", balance: 11800, icon: "https://placehold.co/40x40.png", dataAiHint: "man laughing" },
  { rank: 4, nickname: "GroovyAunt", balance: 9200, icon: "https://placehold.co/40x40.png", dataAiHint: "older woman" },
  { rank: 5, nickname: "DJ Jazzy", balance: 8500, icon: "https://placehold.co/40x40.png", dataAiHint: "person headphones" },
];


export default function LeaderboardPage() {
    // We'll use the current user's data to make the leaderboard feel more alive.
    const { nickname: currentUserNickname, balance: currentUserBalance } = useUser();

    // Combine mock data with current user and sort by balance
    const combinedData = [
        ...mockLeaderboardData.filter(u => u.nickname !== currentUserNickname),
        { rank: 0, nickname: currentUserNickname, balance: currentUserBalance, icon: "https://placehold.co/40x40.png", dataAiHint: "person avatar" },
    ].sort((a, b) => b.balance - a.balance)
     .map((user, index) => ({ ...user, rank: index + 1 }));

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
        </CardHeader>
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
                {combinedData.map((player) => (
                <TableRow key={player.nickname} className={player.nickname === currentUserNickname ? "bg-accent" : ""}>
                    <TableCell className="font-bold text-lg">{player.rank}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                           <Image src={player.icon} alt={player.nickname} width={40} height={40} className="rounded-full" data-ai-hint={player.dataAiHint} />
                            <span className="font-medium">{player.nickname}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">{player.balance.toLocaleString()} Pts</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
