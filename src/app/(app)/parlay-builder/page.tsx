
import { Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ParlayBuilderPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">Parlay Builder</h1>
        <p className="text-muted-foreground mt-2 text-lg">Combine multiple bets for a higher payout.</p>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers />
            Feature Under Construction
          </CardTitle>
          <CardDescription>
            The ability to build and place parlays is coming soon. Please check back later!
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center py-16 text-muted-foreground bg-accent/30 rounded-lg border border-dashed">
              <p className="text-lg font-medium">Coming Soon!</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
