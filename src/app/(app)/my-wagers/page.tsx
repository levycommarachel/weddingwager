
"use client";

import { useState, useEffect } from "react";
import { useBets } from '@/context/BetContext';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Ticket, TrendingUp, TrendingDown, CircleHelp, Trophy, Pencil, Layers, Hourglass, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import type { Bet, Wager, Parlay, ParlayLeg } from '@/types';
import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


function WagerCard({ wager, bet, onEdit }: { wager: Wager, bet: Bet, onEdit: () => void }) {
    if (!bet) return null;

    const isResolved = bet.status === 'resolved';
    const isOpen = bet.status === 'open';

    let StatusPill, ResultIcon, resultColor, resultText;

    if (isResolved && typeof wager.payout === 'number') {
        const isWinner = wager.payout > wager.amount;
        const profit = wager.payout - wager.amount;

        if (isWinner) {
            StatusPill = <Badge className="bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">Won</Badge>;
            ResultIcon = TrendingUp;
            resultColor = 'text-green-500';
            resultText = `+${profit.toLocaleString()} Pts`;
        } else if (wager.payout === wager.amount) {
            StatusPill = <Badge className="bg-sky-100 dark:bg-sky-900 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300">Refund</Badge>;
            ResultIcon = CircleHelp;
            resultColor = 'text-sky-500';
            resultText = `+0 Pts`;
        } else {
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
                    <CardTitle className="font-headline text-xl flex-1">{bet.question}</CardTitle>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {StatusPill}
                        {isOpen && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
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
            {isResolved && ResultIcon && (
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

function ParlayLegStatus({ leg, parlay }: { leg: ParlayLeg, parlay: Parlay }) {
    const legStatus = parlay.resolvedLegs[leg.betId];

    if (!legStatus) {
        return <Hourglass className="h-4 w-4 text-muted-foreground" title="Pending" />;
    }
    if (legStatus === 'won') {
        return <CheckCircle2 className="h-4 w-4 text-green-500" title="Won" />;
    }
    return <XCircle className="h-4 w-4 text-destructive" title="Lost" />;
}

function ParlayCard({ parlay, onEdit }: { parlay: Parlay; onEdit: () => void; }) {
    let StatusPill, ResultIcon, resultColor, resultText;
    const isOpen = parlay.status === 'open';

    if (parlay.status !== 'open' && typeof parlay.payout === 'number') {
        const profit = parlay.payout - parlay.wager;
        if (parlay.status === 'won') {
             StatusPill = <Badge className="bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">Won</Badge>;
            ResultIcon = TrendingUp;
            resultColor = 'text-green-500';
            resultText = `+${profit.toLocaleString()} Pts`;
        } else {
             StatusPill = <Badge variant="destructive">Lost</Badge>;
            ResultIcon = TrendingDown;
            resultColor = 'text-destructive';
            resultText = `${profit.toLocaleString()} Pts`;
        }
    } else {
        StatusPill = <Badge variant="secondary">Open</Badge>;
    }

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start gap-4">
                    <CardTitle className="font-headline text-xl flex items-center gap-2 flex-1">
                        <Layers /> {parlay.legs.length}-Leg Parlay
                    </CardTitle>
                     <div className="flex items-center gap-1 flex-shrink-0">
                        {StatusPill}
                        {isOpen && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <CardDescription>
                    Wager: <span className="font-semibold text-foreground">{parlay.wager.toLocaleString()} Pts</span>
                    <span className="mx-2">|</span>
                    Potential Payout: <span className="font-semibold text-foreground">{parlay.potentialPayout.toLocaleString()} Pts</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Legs</p>
                <ul className="space-y-3">
                    {parlay.legs.map(leg => (
                        <li key={leg.betId} className="flex items-start gap-3 text-sm p-2 rounded-md bg-accent/30 border">
                            <ParlayLegStatus leg={leg} parlay={parlay} />
                            <div className="flex-1">
                                <p className="text-muted-foreground leading-tight">{leg.question}</p>
                                <p>Your Pick: <span className="font-semibold text-foreground">{leg.chosenOutcome}</span></p>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
            {parlay.status !== 'open' && ResultIcon && (
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
    )
}

export default function MyWagersPage() {
    const { myWagers, myParlays, bets, loading: betsLoading, updateWager } = useBets();
    const { user, userData, loading: userLoading } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    
    const [editingWager, setEditingWager] = useState<{ wager: Wager; bet: Bet } | null>(null);
    const [newAmount, setNewAmount] = useState<number | string>('');
    const [newOutcome, setNewOutcome] = useState<string | number>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const loading = betsLoading || userLoading;

    useEffect(() => {
        if (editingWager) {
            setNewAmount(editingWager.wager.amount);
            setNewOutcome(editingWager.wager.outcome);
        }
    }, [editingWager]);

    const handleUpdateWager = async () => {
        if (!editingWager || !userData) return;
        setIsSubmitting(true);

        const numericNewAmount = Number(newAmount);
        if (isNaN(numericNewAmount) || numericNewAmount <= 0) {
            toast({
                variant: "destructive",
                title: "Invalid Bet Amount",
                description: "Please enter a positive number for your bet.",
            });
            setIsSubmitting(false);
            return;
        }

        const amountDifference = numericNewAmount - editingWager.wager.amount;
        if (amountDifference > userData.balance) {
             toast({
                variant: "destructive",
                title: "Insufficient Balance",
                description: `You don't have enough points to increase your wager by that much.`,
            });
            setIsSubmitting(false);
            return;
        }

        try {
            await updateWager(
                editingWager.wager.id,
                editingWager.bet.id,
                editingWager.wager.amount,
                numericNewAmount,
                newOutcome
            );
            toast({
                title: "Wager Updated!",
                description: "Your changes have been saved.",
            });
            setEditingWager(null);
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message || "Could not update your wager.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleEditParlay = (parlayId: string) => {
        router.push(`/parlay-builder?parlayId=${parlayId}`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const wagersWithBetData = myWagers
        .map(wager => ({ wager, bet: bets.find(b => b.id === wager.betId) }))
        .filter((item): item is { wager: Wager; bet: Bet } => !!item.bet);


    return (
        <>
            <div className="container mx-auto py-8 px-4">
                <div className="text-center mb-12">
                    <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">My Wagers</h1>
                    <p className="text-muted-foreground mt-2 text-lg">Track your single bets and parlays.</p>
                </div>
                
                <div className="space-y-12">
                    <section>
                         <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight mb-6 flex items-center gap-3">
                            <Ticket />
                            Single Wagers
                        </h2>
                        {wagersWithBetData.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {wagersWithBetData.map(({ wager, bet }) => (
                                <WagerCard 
                                    key={wager.id} 
                                    wager={wager} 
                                    bet={bet} 
                                    onEdit={() => setEditingWager({ wager, bet })}
                                />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-muted-foreground bg-accent/30 rounded-lg border border-dashed">
                                <p className="text-lg font-medium">You haven't placed any single wagers yet.</p>
                                <p>Head to the "All Wagers" page to get in on the action!</p>
                            </div>
                        )}
                    </section>
                    
                    <section>
                        <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight mb-6 flex items-center gap-3">
                            <Layers />
                            Parlays
                        </h2>
                        {myParlays.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                {myParlays.map((parlay) => (
                                    <ParlayCard 
                                        key={parlay.id} 
                                        parlay={parlay} 
                                        onEdit={() => handleEditParlay(parlay.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-16 text-muted-foreground bg-accent/30 rounded-lg border border-dashed">
                                <p className="text-lg font-medium">You haven't placed any parlays yet.</p>
                                <p>Visit the "Parlay Builder" to create one!</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <Dialog open={!!editingWager} onOpenChange={(open) => !open && setEditingWager(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Wager</DialogTitle>
                        <DialogDescription>{editingWager?.bet.question}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                         <div>
                            <Label className="font-bold text-base">Your Answer</Label>
                            {editingWager?.bet.type === 'range' && editingWager.bet.range && (
                                <div className="flex items-center gap-4 mt-2">
                                <Slider
                                    min={editingWager.bet.range[0]}
                                    max={editingWager.bet.range[1]}
                                    step={1}
                                    value={[Number(newOutcome)]}
                                    onValueChange={(value) => setNewOutcome(value[0])}
                                    className="flex-1"
                                />
                                <span className="font-bold text-lg w-12 text-center">{newOutcome}</span>
                                </div>
                            )}
                            {editingWager?.bet.type === 'options' && editingWager.bet.options && (
                                <RadioGroup
                                value={String(newOutcome)}
                                onValueChange={setNewOutcome}
                                className="mt-2 grid grid-cols-2 gap-2"
                                >
                                {editingWager.bet.options.map((option) => (
                                    <Label key={option} className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent has-[>[data-state=checked]]:bg-accent has-[>[data-state=checked]]:border-primary transition-colors">
                                    <RadioGroupItem value={option} id={`${editingWager.bet.id}-${option}-edit`} />
                                    <span>{option}</span>
                                    </Label>
                                ))}
                                </RadioGroup>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="edit-bet-amount" className="font-bold text-base">Wager Amount</Label>
                             <Input
                                id="edit-bet-amount"
                                type="number"
                                value={newAmount}
                                onChange={(e) => setNewAmount(e.target.value)}
                                min="1"
                                className="mt-2"
                                placeholder="Enter your bet"
                            />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingWager(null)}>Cancel</Button>
                        <Button onClick={handleUpdateWager} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
