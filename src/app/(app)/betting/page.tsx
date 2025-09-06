
"use client";

import { useState, useMemo } from 'react';
import BetCard from "@/components/bet-card";
import { useBets } from "@/context/BetContext";
import { Archive, Gem, SlidersHorizontal, XCircle } from "lucide-react";
import { iconOptions } from '@/lib/bet-categories';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export default function BettingPage() {
  const { bets } = useBets();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  const activeBets = useMemo(() => {
    return bets.filter(bet => bet.status === 'open' && (selectedCategory === 'all' || bet.icon === selectedCategory));
  }, [bets, selectedCategory]);

  const closedBets = useMemo(() => {
    return bets.filter(bet => bet.status !== 'open' && (selectedCategory === 'all' || bet.icon === selectedCategory));
  }, [bets, selectedCategory]);
  
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setIsPopoverOpen(false); // Close popover on selection
  };

  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategory === 'all') return 'All Categories';
    return iconOptions.find(opt => opt.value === selectedCategory)?.label || 'All Categories';
  }, [selectedCategory]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-6">
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">All Wagers</h1>
        <p className="text-muted-foreground mt-2 text-lg">Place your bets on active wagers or review past results.</p>
      </div>
      
      <div className="flex justify-center items-center gap-4 mb-8">
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filter by Category
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="center">
             <div className="grid grid-cols-1 gap-1">
                <Button 
                    variant={selectedCategory === 'all' ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleCategorySelect('all')}>
                    All Categories
                </Button>
              {iconOptions.map(option => (
                <Button 
                  key={option.value}
                  variant={selectedCategory === option.value ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleCategorySelect(option.value)}>
                    <option.icon className="mr-2 h-4 w-4" />
                    {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {selectedCategory !== 'all' && (
            <Badge variant="outline" className="text-sm py-1 px-3 border-dashed">
                Filtering by: <span className="font-semibold ml-1">{selectedCategoryLabel}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => setSelectedCategory('all')}>
                    <XCircle className="h-4 w-4"/>
                </Button>
            </Badge>
        )}
      </div>

      <div className="space-y-16">
        <section>
          <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight mb-6 flex items-center gap-3">
            <Gem className="text-accent-foreground" />
            Active Wagers
          </h2>
          {activeBets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {activeBets.map((bet) => (
                <BetCard key={bet.id} bet={bet} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground bg-accent/30 rounded-lg border border-dashed">
              <p className="text-lg font-medium">No active wagers match the selected category.</p>
              <p>Please select another category or check back soon!</p>
            </div>
          )}
        </section>
        
        {closedBets.length > 0 && (
          <section>
             <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight mb-6 flex items-center gap-3">
                <Archive />
                Past Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {closedBets.map((bet) => (
                <BetCard key={bet.id} bet={bet} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
