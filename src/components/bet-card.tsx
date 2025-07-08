
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { useUser } from "@/context/UserContext";
import { useBets, type Bet } from "@/context/BetContext";
import { useToast } from "@/hooks/use-toast";
import { Coins, Users, Clock, CakeSlice, Mic, Loader2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BetCardProps {
  bet: Bet;
}

const iconMap: { [key: string]: React.ElementType } = {
  Clock,
  CakeSlice,
  Mic,
  Users,
};

export default function BetCard({ bet }: BetCardProps) {
  const { userData } = useUser();
  const { placeBet } = useBets();
  const { toast } = useToast();
  
  const [betAmount, setBetAmount] = useState<number | string>(100);
  const [betValue, setBetValue] = useState(
      bet.type === 'range' && bet.range ? bet.range[0] : (bet.options ? bet.options[0] : '')
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isClosed = bet.status !== 'open';

  const handlePlaceBet = async () => {
    if (!userData) return;
    setIsSubmitting(true);
    
    const numericBetAmount = Number(betAmount);
    if (isNaN(numericBetAmount) || numericBetAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Bet Amount",
        description: "Please enter a positive number for your bet.",
      });
      setIsSubmitting(false);
      return;
    }
    
    if (numericBetAmount > userData.balance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: `You don't have enough points for this bet.`,
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await placeBet(bet.id, betValue, numericBetAmount);
      toast({
        title: `Bet Placed!`,
        description: `You wagered ${numericBetAmount} points on "${bet.question}". Good luck!`,
      });
    } catch(error: any) {
       toast({
        variant: "destructive",
        title: "Bet Failed",
        description: error.message || "There was an error placing your bet. You may have already placed a wager on this.",
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const Icon = iconMap[bet.icon] || Users;

  if (isClosed) {
    return (
       <Card className="overflow-hidden shadow-lg bg-muted/30 border-dashed">
            <CardHeader className="p-4 border-b">
                 <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                         <div className="bg-primary/20 p-3 rounded-full">
                            <Icon className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="font-headline text-xl leading-tight">{bet.question}</CardTitle>
                        </div>
                    </div>
                     <Badge variant="secondary">Closed</Badge>
                </div>
                 <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                    <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4" />
                        <span>{bet.pool.toLocaleString()} Points Pooled</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="space-y-2">
                    <Label className="font-bold text-base text-muted-foreground">Winning Outcome</Label>
                    <div className="flex items-center gap-3 bg-background p-4 rounded-md border">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                        <p className="text-xl font-bold text-foreground">
                            {bet.winningOutcome}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <>
    <Card className={`overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300`}>
      <CardHeader className="bg-accent/50 p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-3 rounded-full">
             <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="font-headline text-xl">{bet.question}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                    <Coins className="h-4 w-4" />
                    <span>{bet.pool.toLocaleString()} Points Pooled</span>
                </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div>
          <Label className="font-bold text-base">Your Answer</Label>
          {bet.type === 'range' && bet.range && (
            <div className="flex items-center gap-4 mt-2">
              <Slider
                min={bet.range[0]}
                max={bet.range[1]}
                step={1}
                value={[Number(betValue)]}
                onValueChange={(value) => setBetValue(value[0])}
                className="flex-1"
              />
              <span className="font-bold text-lg w-12 text-center">{betValue}</span>
            </div>
          )}
          {bet.type === 'options' && bet.options && (
            <RadioGroup
              value={String(betValue)}
              onValueChange={setBetValue}
              className="mt-2 grid grid-cols-2 gap-2"
            >
              {bet.options.map((option) => (
                <Label key={option} className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent has-[>[data-state=checked]]:bg-accent has-[>[data-state=checked]]:border-primary transition-colors">
                  <RadioGroupItem value={option} id={`${bet.id}-${option}`} />
                  <span>{option}</span>
                </Label>
              ))}
            </RadioGroup>
          )}
        </div>
        <div>
          <Label htmlFor={`bet-amount-${bet.id}`} className="font-bold text-base">Wager Amount</Label>
          <Input
            id={`bet-amount-${bet.id}`}
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min="1"
            className="mt-2"
            placeholder="Enter your bet"
          />
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 p-4 flex gap-2">
        <Button onClick={handlePlaceBet} className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : "Place Bet"}
        </Button>
      </CardFooter>
    </Card>
    </>
  );
}
