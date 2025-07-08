
"use client";

import { useBets } from "@/context/BetContext";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Ticket, Archive, Loader2, Trophy, Minus, CheckCircle2, XCircle, Coins } from "lucide-react";
import type { Bet, Wager } from "@/types";

export default function MyWagersPage() {
    const { user, userData } = useUser();
    const { bets, myWagers, loading: betsLoading } = useBets();

    if (betsLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    const betsById = new Map(bets.map(b => [b.id, b]));

    const wagersWithBetInfo = Array.from(myWagers.values()).map(wager => ({
        ...wager,
        bet: betsById.get(wager.betId)
    })).filter(w => w.bet); // Filter out wagers where bet info is missing

    const activeWagers = wagersWithBetInfo.filter(w => w.bet?.status === 'open');
    const resolvedWagers = wagersWithBetInfo.filter(w => w.bet?.status !== 'open');

    const getWagerStatus = (wager: { bet?: Bet; outcome: string | number }) => {
        if (!wager.bet || wager.bet.status !== 'resolved') return { text: 'Pending', color: 'secondary' as const, icon: <Minus className="h-4 w-4" /> };
        
        if (wager.outcome == wager.bet.winningOutcome) {
            return { text: 'Won', color: 'default' as const, icon: <Trophy className="h-4 w-4 text-amber-400" /> };
        } else {
            return { text: 'Lost', color: 'destructive' as const, icon: <XCircle className="h-4 w-4" /> };
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="text-center mb-12">
                <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">My Wagers</h1>
                <p className="text-muted-foreground mt-2 text-lg">Keep track of your active bets and past glories.</p>
            </div>
            
            <div className="space-y-12">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline text-3xl">
                            <Ticket className="text-primary" /> Active Wagers
                        </CardTitle>
                        <CardDescription>These are your ongoing bets. You can change or cancel them from the 'All Wagers' page.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Question</TableHead>
                                    <TableHead>Your Answer</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeWagers.length > 0 ? activeWagers.map(wager => (
                                    <TableRow key={wager.id}>
                                        <TableCell className="font-medium">{wager.bet?.question}</TableCell>
                                        <TableCell>{wager.outcome}</TableCell>
                                        <TableCell className="text-right font-mono flex items-center justify-end gap-2">
                                            <Coins className="h-4 w-4 text-muted-foreground" />
                                            {wager.amount.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">You have no active wagers.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline text-3xl">
                            <Archive /> Resolved Wagers
                        </CardTitle>
                        <CardDescription>Results from past bets.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Question</TableHead>
                                    <TableHead>Your Answer</TableHead>
                                    <TableHead>Winning Answer</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead className="text-right">Result</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {resolvedWagers.length > 0 ? resolvedWagers.map(wager => {
                                    const status = getWagerStatus(wager);
                                    return (
                                        <TableRow key={wager.id}>
                                            <TableCell className="font-medium">{wager.bet?.question}</TableCell>
                                            <TableCell>{wager.outcome}</TableCell>
                                            <TableCell className="font-bold flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500"/>
                                                {wager.bet?.winningOutcome}
                                            </TableCell>
                                            <TableCell className="font-mono">{wager.amount.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={status.color} className="flex items-center gap-1.5 w-fit ml-auto">
                                                    {status.icon}
                                                    {status.text}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No resolved wagers to show yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
