'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useBets, type Bet } from '@/context/BetContext';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, Shield, ListCollapse, Loader2, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const betFormSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters.'),
  icon: z.string().min(2, 'Icon name is required.'),
  type: z.enum(['range', 'options']),
  range: z.object({
    start: z.coerce.number(),
    end: z.coerce.number(),
  }).optional(),
  options: z.array(z.object({ value: z.string().min(1, 'Option cannot be empty.') })).optional(),
}).refine(data => {
    if (data.type === 'range') {
        return data.range && data.range.start < data.range.end;
    }
    return true;
}, {
    message: "Range start must be less than range end.",
    path: ["range"],
}).refine(data => {
    if (data.type === 'options') {
        return data.options && data.options.length >= 2;
    }
    return true;
}, {
    message: "You must provide at least two options.",
    path: ["options"],
});


export default function AdminPage() {
    const { bets, addBet, settleBet, purgeAndReseedDatabase } = useBets();
    const { logout } = useUser();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [betToSettle, setBetToSettle] = useState<Bet | null>(null);
    const [winningOutcome, setWinningOutcome] = useState<string | number>('');
    const [isPurging, setIsPurging] = useState(false);
    const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);
    
    const form = useForm<z.infer<typeof betFormSchema>>({
        resolver: zodResolver(betFormSchema),
        defaultValues: {
            question: '',
            icon: 'Users',
            type: 'range',
            range: { start: 1, end: 10 },
            options: [{value: ''}, {value: ''}],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "options"
    });

    const betType = form.watch('type');

    async function onSubmit(values: z.infer<typeof betFormSchema>) {
        setIsSubmitting(true);
        const newBetData: any = {
            question: values.question,
            icon: values.icon,
            type: values.type,
        };

        if (values.type === 'range' && values.range) {
            newBetData.range = [values.range.start, values.range.end];
        } else if (values.type === 'options' && values.options) {
            newBetData.options = values.options.map(o => o.value);
        }
        
        await addBet(newBetData);
        form.reset();
        setIsSubmitting(false);
    }
    
    const handleSettleBet = async () => {
        if (betToSettle && winningOutcome !== '') {
            await settleBet(betToSettle.id, winningOutcome);
            setBetToSettle(null);
            setWinningOutcome('');
        }
    }

    const handlePurge = async () => {
        setPurgeConfirmOpen(false);
        setIsPurging(true);
        try {
            await purgeAndReseedDatabase();
            toast({
                title: 'Database Purged!',
                description: 'The database has been reset. Logging you out.',
            });
            await logout();
        } catch (error) {
            console.error("Failed to purge database:", error);
            toast({
                variant: 'destructive',
                title: 'Purge Failed',
                description: 'Something went wrong while resetting the database. Check the console for details.',
            });
            setIsPurging(false);
        }
    };

    const activeBets = bets.filter(b => b.status === 'open');

    return (
        <>
            <div className="container mx-auto py-8 px-4">
                <div className="text-center mb-12">
                    <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">Admin Panel</h1>
                    <p className="text-muted-foreground mt-2 text-lg">Manage the wagers for the big day.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                                    <PlusCircle />
                                    Add New Bet
                                </CardTitle>
                                <CardDescription>Create a new wager for guests to bet on.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                        <FormField control={form.control} name="question" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Question</FormLabel>
                                                <FormControl><Input placeholder="e.g., How many speeches?" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="icon" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Icon Name</FormLabel>
                                                <FormControl><Input placeholder="e.g., Mic (from lucide-react)" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="type" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bet Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a bet type" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="range">Numerical Range</SelectItem>
                                                        <SelectItem value="options">Multiple Choice</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        
                                        {betType === 'range' && (
                                            <div className="flex gap-4">
                                                <FormField control={form.control} name="range.start" render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel>Range Start</FormLabel>
                                                        <FormControl><Input type="number" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="range.end" render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel>Range End</FormLabel>
                                                        <FormControl><Input type="number" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>
                                        )}

                                        {betType === 'options' && (
                                            <div className="space-y-3">
                                                <FormLabel>Options</FormLabel>
                                                {fields.map((field, index) => (
                                                    <div key={field.id} className="flex items-center gap-2">
                                                        <FormField control={form.control} name={`options.${index}.value`} render={({ field }) => (
                                                            <FormItem className="flex-1">
                                                                <FormControl><Input {...field} placeholder={`Option ${index + 1}`} /></FormControl>
                                                                <FormMessage/>
                                                            </FormItem>
                                                        )} />
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button type="button" variant="outline" size="sm" onClick={() => append({value: ''})}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                                                </Button>
                                            </div>
                                        )}
                                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="animate-spin" />}
                                            Create Bet
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <h2 className="font-headline text-3xl font-bold mb-4 flex items-center gap-2">
                            <ListCollapse />
                            Active Bets
                        </h2>
                        <Card>
                            <CardContent className="p-0">
                                <div className="space-y-0">
                                {activeBets.map((bet, index) => (
                                    <React.Fragment key={bet.id}>
                                        <div className="flex items-center justify-between p-4">
                                            <div className="font-medium">{bet.question}</div>
                                            <Button variant="destructive" size="sm" onClick={() => setBetToSettle(bet)}>
                                                <Shield className="mr-2 h-4 w-4" /> Settle
                                            </Button>
                                        </div>
                                        {index < activeBets.length - 1 && <Separator />}
                                    </React.Fragment>
                                ))}
                                {activeBets.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">No active bets.</div>
                                )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-3 mt-8">
                        <Card className="border-destructive">
                            <CardHeader>
                                <CardTitle className="text-destructive flex items-center gap-2">
                                    <AlertTriangle />
                                    Danger Zone
                                </CardTitle>
                                <CardDescription>
                                    This action is irreversible and will log you out.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="destructive" onClick={() => setPurgeConfirmOpen(true)} disabled={isPurging}>
                                    {isPurging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Purge & Reseed Database
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            
            <AlertDialog open={!!betToSettle} onOpenChange={(open) => !open && setBetToSettle(null)}>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Settle Bet: {betToSettle?.question}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Select the winning outcome. This will close the bet and is irreversible.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="py-4">
                         {betToSettle?.type === 'range' && (
                            <div>
                                <Label htmlFor="winning-outcome">Winning Number</Label>
                                <Input 
                                    id="winning-outcome" 
                                    type="number" 
                                    value={winningOutcome as number}
                                    onChange={(e) => setWinningOutcome(Number(e.target.value))}
                                />
                            </div>
                        )}
                        {betToSettle?.type === 'options' && betToSettle.options && (
                            <Select onValueChange={(value) => setWinningOutcome(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a winning option" />
                                </SelectTrigger>
                                <SelectContent>
                                    {betToSettle.options.map(option => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setBetToSettle(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSettleBet}>Settle Bet</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={purgeConfirmOpen} onOpenChange={setPurgeConfirmOpen}>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all bets, wagers, and user data from the database. You will be logged out.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurge} className={buttonVariants({ variant: "destructive" })}>Confirm Purge</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
