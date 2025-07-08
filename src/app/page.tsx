
"use client";

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Gem, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { collection, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  nickname: z.string().min(3, { message: 'Nickname must be at least 3 characters long.' }).max(20, { message: 'Nickname must be 20 characters or less.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { nickname: '' },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsSubmitting(true);
    try {
      await login(values.nickname);

      if (db) {
        const betsCollectionRef = collection(db, 'bets');
        const betsSnapshot = await getDocs(betsCollectionRef);

        if (betsSnapshot.empty) {
          console.log("No bets found. Seeding initial bets...");
          const batch = writeBatch(db);
          
          const bet1Data = {
            question: "Will Michelle wear a veil?",
            type: 'options',
            options: ['Yes', 'No'],
            icon: 'Users',
            pool: 0,
            status: 'open',
            createdAt: serverTimestamp(),
          };
          batch.set(doc(betsCollectionRef), bet1Data);
      
          const bet2Data = {
            question: "Will the ceremony be longer than 30 minutes (including the processional and recessional)?",
            type: 'options',
            options: ['Yes', 'No'],
            icon: 'Clock',
            pool: 0,
            status: 'open',
            createdAt: serverTimestamp(),
          };
          batch.set(doc(betsCollectionRef), bet2Data);
      
          const bet3Data = {
            question: "Will Adam cry during the ceremony?",
            type: 'options',
            options: ['Yes', 'No'],
            icon: 'Mic',
            pool: 0,
            status: 'open',
            createdAt: serverTimestamp(),
          };
          batch.set(doc(betsCollectionRef), bet3Data);
      
          await batch.commit();
          console.log("Initial bets seeded successfully.");
        }
      }

      toast({
        title: `Welcome, ${values.nickname}!`,
        description: "Let the games begin. Good luck!",
      });
      router.push('/betting');
    } catch (error: any) {
       if (error?.code === 'auth/configuration-not-found') {
            toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: 'Anonymous sign-in is not enabled. Please enable it in your Firebase project settings.',
                duration: 9000,
            });
        } else if (error.message?.includes('client is offline')) {
            toast({
                variant: 'destructive',
                title: 'Database Error',
                description: 'Could not connect to the database. Please enable Firestore in your Firebase project settings.',
                duration: 9000,
            });
        } else {
            toast({
                variant: 'destructive',
                title: `Login Failed`,
                description: error.message || "Could not log in. Please try again.",
            });
        }
      console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <Gem className="h-12 w-12 text-primary" />
        <h1 className="font-headline text-5xl font-bold mt-4">Wedding Wager</h1>
        <p className="text-muted-foreground mt-2 text-lg">Place your bets on the big day!</p>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Join the Fun</CardTitle>
          <CardDescription>Enter a nickname to start playing.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Nickname</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., BestMan4Ever" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Let's Go!"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
