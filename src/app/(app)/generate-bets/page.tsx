'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { generateBetQuestions, type GenerateBetQuestionsOutput } from '@/ai/flows/generate-bet-questions'
import { Loader2, Wand2, Lightbulb } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'

const formSchema = z.object({
  weddingTheme: z.string().min(3, 'Theme must be at least 3 characters.').max(100),
  numberOfQuestions: z.coerce.number().min(1, 'Must generate at least 1 question.').max(10, 'Cannot generate more than 10 questions.'),
})

export default function GenerateBetsPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GenerateBetQuestionsOutput | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weddingTheme: 'A rustic barn wedding',
      numberOfQuestions: 4,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    setResults(null)
    try {
      const output = await generateBetQuestions(values)
      setResults(output)
      toast({
        title: "Questions Generated!",
        description: "The AI has worked its magic.",
      })
    } catch (error) {
      console.error("Failed to generate bet questions:", error)
      toast({
        variant: 'destructive',
        title: 'Oh no!',
        description: 'Something went wrong while generating questions. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">AI Bet Generator</h1>
        <p className="text-muted-foreground mt-2 text-lg">Stuck for ideas? Let our AI suggest some fun wedding bets!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Create Bets</CardTitle>
              <CardDescription>Enter a theme and get instant ideas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="weddingTheme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wedding Theme</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., fairytale garden party" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numberOfQuestions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Questions</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Generate Questions
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <h2 className="font-headline text-3xl font-bold mb-4">Suggestions</h2>
          <div className="space-y-4">
            {loading && (
                [...Array(form.getValues("numberOfQuestions"))].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader>
                            <div className="h-6 bg-muted rounded-md w-3/4"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-4 bg-muted rounded-md w-1/2"></div>
                        </CardContent>
                    </Card>
                ))
            )}
            
            {results && results.questions.length > 0 ? (
              results.questions.map((q, index) => (
                <Card key={index} className="bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-start gap-3">
                        <Lightbulb className="h-6 w-6 text-primary mt-1 shrink-0" />
                        <span>{q.question}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Suggested Range: <span className="font-mono font-semibold text-foreground">{q.suggestedRangeStart} - {q.suggestedRangeEnd}</span>
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              !loading && (
                <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-full">
                    <Wand2 className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Your generated bet questions will appear here.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
