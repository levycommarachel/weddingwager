"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
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
import { useToast } from "@/hooks/use-toast";
import { Coins, Users, Clock, CakeSlice, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export type Bet = {
  id: number;
  question: string;
  type: 'range' | 'options';
  range?: [number, number];
  options?: string[];
  pool: number;
  icon: string;
};

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
  const { balance, setBalance } = useUser();
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState<number | string>(100);
  const [betValue, setBetValue] = useState(
    bet.type === 'range' && bet.range ? bet.range[0] : (bet.options ? bet.options[0] : '')
  );

  const handlePlaceBet = () => {
    const numericBetAmount = Number(betAmount);
    if (isNaN(numericBetAmount) || numericBetAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Bet Amount",
        description: "Please enter a positive number for your bet.",
      });
      return;
    }
    if (numericBetAmount > balance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "You don't have enough points for this bet.",
      });
      return;
    }

    setBalance((prev) => prev - numericBetAmount);
    toast({
      title: "Bet Placed!",
      description: `You wagered ${numericBetAmount} points on "${bet.question}". Good luck!`,
      className: "bg-lime-500 text-white"
    });
    // In a real app, this would also update the bet pool and user's bet history on the backend.
  };

  const Icon = iconMap[bet.icon] || Users;

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
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
            max={balance}
            className="mt-2"
            placeholder="Enter your bet"
          />
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 p-4">
        <Button onClick={handlePlaceBet} className="w-full" size="lg">
          Place Bet
        </Button>
      </CardFooter>
    </Card>
  );
}
