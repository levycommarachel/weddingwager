
'use client';

import { useState, useMemo } from 'react';
import { useBets } from '@/context/BetContext';
import { useUser } from '@/context/UserContext';
import type { Bet, ParlayLeg } from '@/types';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Layers, X, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

function ParlayBetSelector({ 
    bet, 
    onSelectLeg, 
    selectedOutcome 
}: { 
    bet: Bet, 
    onSelectLeg: (leg: ParlayLeg | null) => void, 
    selectedOutcome?: string | number 
}) {
  const [betValue, setBetValue] = useState<string | number | undefined>(selectedOutcome);

  const handleSelection = (value: string | number) => {
    // If the user re-selects the same option, deselect it.
    if (value === betValue) {
        setBetValue(undefined);
        onSelectLeg(null);
    } else {
        setBetValue(value);
        onSelectLeg({
            betId: bet.id,
            question: bet.question,
            outcome: value,
        });
    }
  }

  // Use a different component for range to handle single selection properly
  if (bet.type === 'number') {
    const isSelected = betValue !== undefined;
    return (
      <Card className={`transition-all ${isSelected ? 'border-primary-foreground/50 shadow-lg' : ''}`}>
        <CardHeader>
            <CardTitle>{bet.question}</CardTitle>
        </CardHeader>
        <CardContent>
            <Input
                type="number"
                step="1"
                placeholder="Enter a whole number"
                value={betValue ?? ''}
                onChange={(e) => setBetValue(e.target.value)}
            />
        </CardContent>
        <CardFooter>
            <Button className="w-full" onClick={() => handleSelection(betValue ?? 0)} disabled={betValue === undefined}>
                {isSelected ? 'Update Selection' : 'Add to Parlay'}
            </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Component for options
  return (
    <Card className={betValue !== undefined ? 'border-primary-foreground/50 shadow-lg' : ''}>
        <CardHeader>
            <CardTitle>{bet.question}</CardTitle>
        </CardHeader>
        <CardContent>
             <RadioGroup
                value={String(betValue)}
                onValueChange={handleSelection}
                className="mt-2 grid grid-cols-2 gap-2"
            >
                {bet.options?.map((option) => (
                    <Label key={option} className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent has-[>[data-state=checked]]:bg-accent has-[>[data-state=checked]]:border-primary-foreground/50 transition-colors cursor-pointer">
                        <RadioGroupItem value={option} id={`${bet.id}-${option}`} />
                        <span>{option}</span>
                    </Label>
                ))}
            </RadioGroup>
        </CardContent>
    </Card>
  )
}


export default function ParlayBuilderPage() {
  const { bets, createParlay } = useBets();
  const { userData } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedLegs, setSelectedLegs] = useState<Record<string, ParlayLeg>>({});
  const [wagerAmount, setWagerAmount] = useState<number | string>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const legsArray = useMemo(() => Object.values(selectedLegs), [selectedLegs]);
  const potentialPayout = useMemo(() => {
    const amount = Number(wagerAmount);
    if (isNaN(amount) || amount <= 0 || legsArray.length < 2) return 0;
    // Using a simple 2^n multiplier for odds
    return Math.floor(amount * Math.pow(2, legsArray.length));
  }, [wagerAmount, legsArray.length]);


  const handleSelectLeg = (leg: ParlayLeg | null) => {
    if (leg === null || leg.betId === undefined) return;
    
    setSelectedLegs(prev => {
      const newLegs = {...prev};
      if (newLegs[leg.betId] && newLegs[leg.betId].outcome === leg.outcome) {
        // Deselect if same outcome is clicked again
        delete newLegs[leg.betId];
      } else {
        newLegs[leg.betId] = leg;
      }
      return newLegs;
    });
  };

  const handleRemoveLeg = (betId: string) => {
    setSelectedLegs(prev => {
        const newLegs = {...prev};
        delete newLegs[betId];
        return newLegs;
    });
  };
  
  const handleSubmitParlay = async () => {
     if (!userData) return;
     setIsSubmitting(true);
     const numericWagerAmount = Number(wagerAmount);

     try {
        if (legsArray.length < 2) throw new Error("A parlay must include at least 2 bets.");
        if (isNaN(numericWagerAmount) || numericWagerAmount <= 0) throw new Error("Please enter a valid wager amount.");
        if (numericWagerAmount > userData.balance) throw new Error("Insufficient balance.");
        
        await createParlay(legsArray, numericWagerAmount);
        
        toast({
            title: "Parlay Placed!",
            description: `Your ${legsArray.length}-leg parlay has been submitted. Good luck!`
        });
        router.push('/my-wagers');

     } catch(e: any) {
        toast({ variant: 'destructive', title: "Error Placing Parlay", description: e.message });
     } finally {
        setIsSubmitting(false);
     }
  }

  const activeBets = bets.filter(b => b.status === 'open');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">Parlay Builder</h1>
        <p className="text-muted-foreground mt-2 text-lg">Combine multiple bets for a higher payout.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Bet Selection Area */}
        <div className="lg:col-span-2 space-y-6">
            <h2 className="font-headline text-3xl font-bold">1. Select Your Bets</h2>
            {activeBets.length > 0 ? (
                <div className="space-y-4">
                    {activeBets.map(bet => (
                        <ParlayBetSelector 
                            key={bet.id} 
                            bet={bet}
                            onSelectLeg={handleSelectLeg}
                            selectedOutcome={selectedLegs[bet.id]?.outcome}
                        />
                    ))}
                </div>
            ) : (
                <Card className="text-center p-8 text-muted-foreground border-dashed">No active bets are available to create a parlay.</Card>
            )}
        </div>

        {/* Parlay Slip */}
        <div className="lg:col-span-1 sticky top-24 space-y-4">
            <Card className="shadow-2xl">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Layers />
                        Parlay Slip
                    </CardTitle>
                    <CardDescription>Your combined bets.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {legsArray.length === 0 ? (
                        <div className="text-center text-muted-foreground p-8 border border-dashed rounded-md">Select bets to build your parlay.</div>
                    ) : (
                         <div className="space-y-2">
                            {legsArray.map(leg => (
                                <div key={leg.betId} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-md">
                                    <div>
                                        <p className="font-semibold truncate w-48">{leg.question}</p>
                                        <p className="text-muted-foreground">Pick: {String(leg.outcome)}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveLeg(leg.betId)}>
                                        <X className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {legsArray.length > 1 && <Separator />}

                     {legsArray.length > 0 && (
                        <div>
                            <Label htmlFor="parlay-wager" className="font-bold">2. Set Wager Amount</Label>
                            <Input 
                                id="parlay-wager"
                                type="number"
                                value={wagerAmount}
                                onChange={(e) => setWagerAmount(e.target.value)}
                                min="1"
                                className="mt-2"
                                disabled={legsArray.length < 2}
                            />
                        </div>
                     )}
                    
                    {legsArray.length > 1 && (
                        <div className="text-right bg-accent/50 p-4 rounded-md">
                            <p className="text-muted-foreground">Potential Payout:</p>
                            <p className="font-bold text-2xl text-accent-foreground">{potentialPayout.toLocaleString()} Pts</p>
                        </div>
                    )}

                </CardContent>
                {legsArray.length > 1 && (
                    <CardFooter>
                        <Button 
                            className="w-full" 
                            size="lg"
                            disabled={isSubmitting || Number(wagerAmount) <= 0}
                            onClick={handleSubmitParlay}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : `Place ${legsArray.length}-Leg Parlay`}
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>

      </div>
    </div>
  );
}
