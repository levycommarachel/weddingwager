
"use client";

import { useState, useMemo } from 'react';
import { useBets } from '@/context/BetContext';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Layers, Trash2, Coins } from 'lucide-react';
import type { Bet, ParlayLeg } from '@/types';
import {
  Users, Clock, CakeSlice, Mic, Gift, Heart, Music, Camera, GlassWater, Mail, Sun, CloudRain
} from 'lucide-react';

const iconMap: { [key: string]: React.ElementType } = {
  Clock, CakeSlice, Mic, Users, Gift, Heart, Music, Camera, GlassWater, Mail, Sun, CloudRain,
};

function getPayoutMultiplier(legCount: number): number {
    if (legCount < 2) return 0;
    if (legCount === 2) return 2.5;
    if (legCount === 3) return 5;
    if (legCount === 4) return 10;
    return 15;
}

function ParlayBetCard({ bet, onSelectLeg, selectedOutcome }: { bet: Bet, onSelectLeg: (leg: ParlayLeg) => void, selectedOutcome?: string | number }) {
    const [outcome, setOutcome] = useState<string | number>(selectedOutcome || (bet.type === 'range' && bet.range ? bet.range[0] : (bet.options ? bet.options[0] : '')));

    const handleSelection = (newOutcome: string | number) => {
        setOutcome(newOutcome);
        onSelectLeg({
            betId: bet.id,
            question: bet.question,
            chosenOutcome: newOutcome,
            type: bet.type,
            icon: bet.icon,
            ...(bet.options && { options: bet.options }),
            ...(bet.range && { range: bet.range }),
        });
    };
    
    const Icon = iconMap[bet.icon] || Users;

    return (
        <Card className={`transition-all ${selectedOutcome !== undefined ? 'border-primary ring-2 ring-primary' : ''}`}>
             <CardHeader>
                 <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-3 rounded-full">
                        <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <CardTitle className="font-headline text-lg flex-1">{bet.question}</CardTitle>
                 </div>
            </CardHeader>
            <CardContent>
                 {bet.type === 'range' && bet.range && (
                    <div className="flex items-center gap-4 mt-2">
                        <Slider
                            min={bet.range[0]}
                            max={bet.range[1]}
                            step={1}
                            value={[Number(outcome)]}
                            onValueChange={(value) => handleSelection(value[0])}
                            className="flex-1"
                        />
                        <span className="font-bold text-lg w-12 text-center">{outcome}</span>
                    </div>
                )}
                {bet.type === 'options' && bet.options && (
                    <RadioGroup
                        value={String(outcome)}
                        onValueChange={handleSelection}
                        className="mt-2 grid grid-cols-2 gap-2"
                    >
                        {bet.options.map((option) => (
                            <Label key={option} className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent has-[>[data-state=checked]]:bg-accent has-[>[data-state=checked]]:border-primary transition-colors">
                            <RadioGroupItem value={option} id={`${bet.id}-${option}-parlay`} />
                            <span>{option}</span>
                            </Label>
                        ))}
                    </RadioGroup>
                )}
            </CardContent>
        </Card>
    );
}


export default function ParlayBuilderPage() {
    const { bets, placeParlay } = useBets();
    const { userData } = useUser();
    const { toast } = useToast();
    
    const [slip, setSlip] = useState<ParlayLeg[]>([]);
    const [wager, setWager] = useState<number | string>(100);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const activeBets = bets.filter(bet => bet.status === 'open');

    const handleSelectLeg = (leg: ParlayLeg) => {
        setSlip(currentSlip => {
            const existingIndex = currentSlip.findIndex(l => l.betId === leg.betId);
            if (existingIndex > -1) {
                // Update existing leg
                const newSlip = [...currentSlip];
                newSlip[existingIndex] = leg;
                return newSlip;
            } else {
                // Add new leg
                return [...currentSlip, leg];
            }
        });
    };
    
    const handleRemoveLeg = (betId: string) => {
        setSlip(currentSlip => currentSlip.filter(l => l.betId !== betId));
    };
    
    const clearSlip = () => {
        setSlip([]);
    }
    
    const multiplier = useMemo(() => getPayoutMultiplier(slip.length), [slip.length]);
    const potentialPayout = useMemo(() => {
        const numericWager = Number(wager);
        if (isNaN(numericWager) || numericWager <= 0) return 0;
        return Math.floor(numericWager * multiplier);
    }, [wager, multiplier]);
    
    
    const handlePlaceParlay = async () => {
         if (!userData) return;
        setIsSubmitting(true);
        
        const numericWager = Number(wager);
        if (isNaN(numericWager) || numericWager <= 0) {
            toast({ variant: "destructive", title: "Invalid Wager", description: "Please enter a positive number." });
            setIsSubmitting(false);
            return;
        }

        if (slip.length < 2) {
             toast({ variant: "destructive", title: "Not Enough Legs", description: "A parlay must have at least 2 legs." });
            setIsSubmitting(false);
            return;
        }

        if (numericWager > userData.balance) {
            toast({ variant: "destructive", title: "Insufficient Balance" });
            setIsSubmitting(false);
            return;
        }

        try {
            await placeParlay(slip, numericWager, multiplier, potentialPayout);
            toast({ title: "Parlay Placed!", description: `Your ${slip.length}-leg parlay is in. Good luck!` });
            setSlip([]);
            setWager(100);
        } catch (error: any) {
             toast({ variant: "destructive", title: "Failed to Place Parlay", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="text-center mb-12">
                <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">Parlay Builder</h1>
                <p className="text-muted-foreground mt-2 text-lg">Combine multiple bets for a bigger payout. All legs must win.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {activeBets.length > 0 ? (
                        activeBets.map(bet => (
                             <ParlayBetCard 
                                key={bet.id} 
                                bet={bet} 
                                onSelectLeg={handleSelectLeg}
                                selectedOutcome={slip.find(l => l.betId === bet.id)?.chosenOutcome}
                            />
                        ))
                    ) : (
                         <div className="text-center py-16 text-muted-foreground bg-accent/30 rounded-lg border border-dashed">
                            <p className="text-lg font-medium">No active wagers to build a parlay from.</p>
                        </div>
                    )}
                </div>

                <aside className="lg:col-span-1">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2"><Layers /> Parlay Slip</span>
                                <Badge variant={slip.length > 1 ? "default" : "secondary"}>{slip.length} Legs</Badge>
                            </CardTitle>
                            <CardDescription>Select outcomes from the bets on the left.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {slip.length > 0 ? (
                                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                                    {slip.map(leg => (
                                        <div key={leg.betId} className="text-sm p-2 rounded-md bg-accent/50 border flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="text-muted-foreground leading-tight text-xs">{leg.question}</p>
                                                <p>Pick: <span className="font-semibold text-foreground">{leg.chosenOutcome}</span></p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveLeg(leg.betId)}>
                                                <Trash2 className="h-3 w-3"/>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-sm text-muted-foreground py-8">Your slip is empty.</div>
                            )}

                            {slip.length > 0 && <Separator />}

                            <div className="space-y-2">
                                <Label htmlFor="parlay-wager">Wager Amount</Label>
                                <Input
                                    id="parlay-wager"
                                    type="number"
                                    value={wager}
                                    onChange={(e) => setWager(e.target.value)}
                                    min="1"
                                    disabled={slip.length < 2}
                                />
                            </div>

                            <div className="text-sm space-y-1 bg-muted/50 p-3 rounded-md">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Multiplier</span>
                                    <span className="font-bold">{multiplier}x</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Potential Payout</span>
                                    <span className="font-bold text-lg text-primary-foreground flex items-center gap-1">
                                        <Coins className="h-4 w-4" />
                                        {potentialPayout.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button variant="outline" onClick={clearSlip} className="w-full" disabled={slip.length === 0}>Clear</Button>
                            <Button className="w-full" disabled={isSubmitting || slip.length < 2} onClick={handlePlaceParlay}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "Place Parlay"}
                            </Button>
                        </CardFooter>
                    </Card>
                </aside>
            </div>
        </div>
    );
}

