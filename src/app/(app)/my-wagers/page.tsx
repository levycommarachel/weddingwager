
"use client";

import { useBets } from '@/context/BetContext';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Ticket, TrendingUp, TrendingDown, CircleHelp, Trophy } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import type { Bet, Wager } from '@/types';
import { Separator } from '@/components/ui/separator';

function WagerCard({ wager, bet }: { wager: Wager, bet: Bet }) {
    if (!bet) return null;

    const isResolved = bet.status === 'resolved';
    const hasPayoutInfo = wager.payout !== undefined;

    let StatusPill, ResultIcon, resultColor, resultText;

    if (isResolved && hasPayoutInfo) {
        const isWinner = bet.winningOutcome !== undefined && String(bet.winningOutcome) === String(wager.outcome);
        const profit = (wager.payout ?? 0) - wager.amount;

        if (isWinner) {
            StatusPill = <Badge className="bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">Won</Badge>;
            ResultIcon = TrendingUp;
            resultColor = 'text-green-500';
            resultText = `+${profit.toLocaleString()} Pts`;
        } else if (profit === 0) { // Not a winner, but got stake back -> Refund.
            StatusPill = <Badge className="bg-sky-100 dark:bg-sky-900 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300">Refund</Badge>;
            ResultIcon = CircleHelp;
            resultColor = 'text-sky-500';
            resultText = `+0 Pts`;
        } else { // Not a winner, and payout is 0 -> Loss.
            StatusPill = <Badge variant="destructive">Lost</Badge>;
            ResultIcon = TrendingDown;
            resultColor = 'text-destructive';
            resultText = `${profit.toLocaleString()} Pts`;
        }
    } else if (isResolved) {
        StatusPill = <Badge variant="outline">Resolved</Badge>;
    } else {
        StatusPill = <Badge variant="secondary">Open</Badge>;
    }


    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start gap-4">
                    <CardTitle className="font-headline text-xl">{bet.question}</CardTitle>
                    {StatusPill}
                </div>
                <CardDescription>
                    Your Answer: <span className="font-semibold text-foreground">{wager.outcome}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <div className="text-sm text-muted-foreground">
                    Wagered: <span className="font-semibold text-foreground">{wager.amount.toLocaleString()} Pts</span>
                </div>
                {isResolved && (
                     <div>
                        <p className="text-sm text-muted-foreground mb-1">Winning Outcome</p>
                        <div className="flex items-center gap-2 bg-accent/50 p-2 rounded-md border">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            <p className="font-bold text-foreground">{bet.winningOutcome}</p>
                        </div>
                    </div>
                )}
            </CardContent>
            {isResolved && hasPayoutInfo && (
                <>
                <Separator />
                <CardFooter className="p-4 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <ResultIcon className={`h-5 w-5 ${resultColor}`} />
                        <span className={`font-bold text-lg ${resultColor}`}>{resultText}</span>
                    </div>
                </CardFooter>
                </>
            )}
        </Card>
    );
}


export default function MyWagersPage() {
    const { myWagers, bets, loading: betsLoading } = useBets();
    const { loading: userLoading } = useUser();
    
    const loading = betsLoading || userLoading;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const wagersWithBetData = myWagers
        .map(wager => ({ wager, bet: bets.find(b => b.id === wager.betId) }))
        .filter(item => item.bet); // Filter out wagers where the bet might have been deleted

    return (
        <div className="container mx-auto py-8 px-4">
             <div className="text-center mb-12">
                <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">My Wagers</h1>
                <p className="text-muted-foreground mt-2 text-lg">Track your bets and see your results.</p>
            </div>
            
            {wagersWithBetData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                   {wagersWithBetData.map(({ wager, bet }) => (
                       <WagerCard key={wager.id} wager={wager} bet={bet!} />
                    ))}
                </div>
            ) : (
                 <div className="text-center py-16 text-muted-foreground bg-accent/30 rounded-lg border border-dashed">
                    <Ticket className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">You haven't placed any wagers yet.</p>
                    <p>Head to the "All Wagers" page to get in on the action!</p>
                </div>
            )}
        </div>
    );
}
