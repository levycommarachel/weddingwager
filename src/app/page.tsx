
"use client";

import { useRouter } from 'next/navigation';
import { Gem, Loader2, Mail, Lock, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useBets } from '@/context/BetContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from '@/components/ui/separator';

const signUpSchema = z.object({
  nickname: z.string().min(2, { message: "Nickname must be at least 2 characters." }).max(50),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const signInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;
type SignInFormValues = z.infer<typeof signInSchema>;


const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        <path d="M1 1h22v22H1z" fill="none"/>
    </svg>
);


export default function LoginPage() {
  const router = useRouter();
  const { user, userData, signInWithGoogle, signInWithEmail, signUpWithEmail, loading: userLoading } = useUser();
  const { seedInitialBets } = useBets();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const signUpForm = useForm<SignUpFormValues>({ resolver: zodResolver(signUpSchema), defaultValues: { nickname: '', email: '', password: '' }});
  const signInForm = useForm<SignInFormValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' }});

  // Redirect if user and their data are fully loaded.
  useEffect(() => {
    if (!userLoading && user && userData) {
      router.replace('/betting');
    }
  }, [user, userData, userLoading, router]);

  async function handleGoogleSignIn() {
    setIsGoogleSubmitting(true);
    try {
      const { isNewUser } = await signInWithGoogle();
      if (isNewUser) {
        await seedInitialBets();
        toast({
            title: `Welcome!`,
            description: "You've been given 1,000 points to start. Good luck!",
        });
      } else {
         toast({
            title: `Welcome back!`,
            description: "Let the games continue. Good luck!",
        });
      }
    } catch (error: any) {
       handleAuthError(error);
    } finally {
        setIsGoogleSubmitting(false);
    }
  }

  async function onSignUp(values: SignUpFormValues) {
    setIsSubmitting(true);
    try {
      await signUpWithEmail(values.email, values.password, values.nickname);
      await seedInitialBets();
      toast({
          title: `Welcome, ${values.nickname}!`,
          description: "Your account has been created. You have 1,000 points to start. Good luck!",
      });
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsSubmitting(false);
    }
  }
  
  async function onSignIn(values: SignInFormValues) {
      setIsSubmitting(true);
      try {
          await signInWithEmail(values.email, values.password);
          toast({
              title: `Welcome back!`,
              description: "Let the games continue. Good luck!",
          });
      } catch (error: any) {
          handleAuthError(error);
      } finally {
          setIsSubmitting(false);
      }
  }

  function handleAuthError(error: any) {
    let title = 'Authentication Failed';
    let description = error.message || "An unknown error occurred. Please try again.";

    switch (error.code) {
      case 'auth/popup-closed-by-user':
        title = 'Sign-in Cancelled';
        description = 'You closed the sign-in window. Please try again.';
        break;
      case 'auth/unauthorized-domain':
        const hostname = window.location.hostname;
        title = 'Action Required: Authorize Your Domain';
        description = `Firebase has blocked login from this URL. To fix this, you must add "${hostname}" to the "Authorized domains" list in your Firebase project's Authentication settings.`;
        break;
      case 'auth/configuration-not-found':
        title = 'Authentication Error';
        description = 'An authentication provider is not enabled. Please enable one in your Firebase project settings.';
        break;
      case 'auth/email-already-in-use':
        title = 'Email Taken';
        description = 'This email is already registered. Please sign in or use a different email.';
        break;
      case 'auth/invalid-credential':
        title = 'Invalid Credentials';
        description = 'The email or password you entered is incorrect. Please try again.';
        break;
      case 'auth/weak-password':
        title = 'Weak Password';
        description = 'The password must be at least 6 characters long.';
        break;
      case 'client-offline':
        title = 'Database Error';
        description = 'Could not connect to the database. Please enable Firestore in your Firebase project settings.';
        break;
    }
     toast({ variant: 'destructive', title, description, duration: 9000 });
     console.error("Authentication Error:", error);
  }

  // Show a loader while checking auth state or if user is already logged in
  if (userLoading || (user && userData)) {
     return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <Gem className="h-12 w-12 text-accent-foreground" />
        <h1 className="font-headline text-5xl font-bold mt-4">Wedding Wager</h1>
        <p className="text-muted-foreground mt-2 text-lg">Place your bets on the big day!</p>
      </div>
      <Card className="w-full max-w-sm">
        <Tabs defaultValue="signin">
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="signin">
                <Form {...signInForm}>
                    <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                        <FormField control={signInForm.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={signInForm.control} name="password" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Sign In"}
                        </Button>
                    </form>
                </Form>
            </TabsContent>
            <TabsContent value="signup">
               <Form {...signUpForm}>
                    <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                         <FormField control={signUpForm.control} name="nickname" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nickname</FormLabel>
                                <FormControl><Input placeholder="Your Name" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={signUpForm.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={signUpForm.control} name="password" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Create Account"}
                        </Button>
                    </form>
                </Form>
            </TabsContent>
             <Separator className="my-6" />
              <Button onClick={handleGoogleSignIn} className="w-full" variant="outline" disabled={isGoogleSubmitting}>
                {isGoogleSubmitting ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <>
                        <GoogleIcon />
                        <span className="ml-2">Sign in with Google</span>
                    </>
                )}
            </Button>
          </CardContent>
        </Tabs>
      </Card>
    </main>
  );
}

    