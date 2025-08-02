

'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useBets } from '@/context/BetContext';
import type { Bet } from '@/types';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { iconOptions } from '@/lib/bet-categories';

const betFormSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('number'),
        question: z.string().min(10, { message: 'Question must be at least 10 characters.' }),
        icon: z.string().min(2, { message: 'Icon name is required.' }),
    }),
    z.object({
        type: z.literal('options'),
        question: z.string().min(10, { message: 'Question must be at least 10 characters.' }),
        icon: z.string().min(2, { message: 'Icon name is required.' }),
        options: z.array(z.object({ 
            value: z.string().min(1, 'Option cannot be empty.')
        })).min(2, 'At least two options are required.'),
    })
]);


type BetFormValues = z.infer<typeof betFormSchema>;

export default function AdminPage() {
    const { bets, addBet, settleBet } = useBets();
    const { userData, loading: userLoading } = useUser();
    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [betToSettle, setBetToSettle] = useState<Bet | null>(null);
    const [winningOutcome, setWinningOutcome] = useState<string | number>('');
    
    const form = useForm<BetFormValues>({
        resolver: zodResolver(betFormSchema),
        defaultValues: {
            question: '',
            icon: 'Users',
            type: 'number',
        },
        // Re-evaluate the entire form when type changes
        shouldUnregister: false, 
    });
    
    // When switching to 'options' type, ensure default options are present
    const betType = form.watch('type');
    React.useEffect(() => {
        if (betType === 'options') {
            const options = form.getValues('options');
            if (!options || options.length < 2) {
                form.setValue('options', [{value: ''}, {value: ''}]);
            }
        }
    }, [betType, form]);


    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "options"
    });

    async function onSubmit(values: BetFormValues) {
        setIsSubmitting(true);
        try {
            const newBetData: any = {
                question: values.question,
                icon: values.icon,
                type: values.type,
            };

            if (values.type === 'options' && values.options) {
                newBetData.options = values.options.map(o => o.value);
            }
            
            await addBet(newBetData);
            form.reset({
                question: '',
                icon: 'Users',
                type: 'number',
            });
        } catch (error) {
            console.error("Failed to add bet:", error);
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: 'Could not create the bet. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleSettleBet = async () => {
        if (betToSettle && winningOutcome !== '') {
            await settleBet(betToSettle.id, winningOutcome);
            setBetToSettle(null);
            setWinningOutcome('');
        }
    }
    
    if (userLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!userData?.isAdmin) {
        return (
            <div className="container mx-auto py-16 px-4">
                <Card className="max-w-md mx-auto">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl text-destructive flex items-center justify-center gap-2">
                            <AlertTriangle />
                            Access Denied
                        </CardTitle>
                        <CardDescription>You must be an administrator to access this page.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground text-center">
                            Please log in with an administrator account to continue.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const activeBets = bets.filter(b => b.status === 'open');

    return (
        <>
            <div className="container mx-auto py-8 px-4">
                <div className="text-center mb-12">
                    <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">Admin Panel</h1>
                    <p className="text-muted-foreground mt-2 text-lg">Manage the wagers for the big day.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
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
                                                <FormLabel>Category</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a category" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {iconOptions.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value}>
                                                                <div className="flex items-center gap-2">
                                                                    <opt.icon className="h-4 w-4" />
                                                                    {opt.label}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="type" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bet Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a bet type" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="number">Numerical</SelectItem>
                                                        <SelectItem value="options">Multiple Choice</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        
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
                                                <FormField name="options" render={() => <FormMessage />} />
                                            </div>
                                        )}
                                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Create Bet"}
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
                                            <Button variant="secondary" size="sm" onClick={() => setBetToSettle(bet)}>
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
                         {betToSettle?.type === 'number' && (
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
        </>
    );
}
