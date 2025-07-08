import BetCard, { type Bet } from "@/components/bet-card";

// Mock data representing active bets
const mockBets: Bet[] = [
  { 
    id: 1, 
    question: "How long will the main ceremony last (in minutes)?", 
    type: 'range', 
    range: [20, 45], 
    pool: 12500,
    icon: "Clock"
  },
  { 
    id: 2, 
    question: "How many tiers will the wedding cake have?", 
    type: 'options', 
    options: ['2 tiers', '3 tiers', '4 tiers', '5+ tiers'], 
    pool: 21300,
    icon: "CakeSlice"
  },
  { 
    id: 3, 
    question: "What will be the length of the best man's speech (in minutes)?", 
    type: 'range', 
    range: [3, 10], 
    pool: 5400,
    icon: "Mic"
  },
    { 
    id: 4, 
    question: "How many guests will be on the dance floor during the first song?", 
    type: 'range', 
    range: [0, 50], 
    pool: 18750,
    icon: "Users"
  },
];

export default function BettingPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">Active Wagers</h1>
        <p className="text-muted-foreground mt-2 text-lg">The odds are in! Place your bets now.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {mockBets.map((bet) => (
          <BetCard key={bet.id} bet={bet} />
        ))}
      </div>
    </div>
  );
}
