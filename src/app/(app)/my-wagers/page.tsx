
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function MyWagersPage() {
    // This page is temporarily disabled.
    return (
        <div className="container mx-auto py-8 px-4">
             <div className="text-center mb-12">
                <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">My Wagers</h1>
                <p className="text-muted-foreground mt-2 text-lg">This page is temporarily unavailable.</p>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                        This feature is being reworked. Please check back later.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
