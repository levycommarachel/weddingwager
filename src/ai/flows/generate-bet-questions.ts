'use server';

/**
 * @fileOverview Generates wedding-appropriate bet questions with suggested numerical ranges.
 *
 * - generateBetQuestions - A function to generate bet questions.
 * - GenerateBetQuestionsInput - The input type for the generateBetQuestions function.
 * - GenerateBetQuestionsOutput - The output type for the generateBetQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBetQuestionsInputSchema = z.object({
  weddingTheme: z.string().describe('The theme or style of the wedding.'),
  numberOfQuestions: z.number().describe('The number of bet questions to generate.'),
});
export type GenerateBetQuestionsInput = z.infer<typeof GenerateBetQuestionsInputSchema>;

const GenerateBetQuestionsOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The generated bet question.'),
      suggestedRangeStart: z.number().describe('The suggested starting value for the numerical range.'),
      suggestedRangeEnd: z.number().describe('The suggested ending value for the numerical range.'),
    })
  ).describe('An array of generated bet questions with suggested numerical ranges.'),
});
export type GenerateBetQuestionsOutput = z.infer<typeof GenerateBetQuestionsOutputSchema>;

export async function generateBetQuestions(input: GenerateBetQuestionsInput): Promise<GenerateBetQuestionsOutput> {
  return generateBetQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBetQuestionsPrompt',
  input: {schema: GenerateBetQuestionsInputSchema},
  output: {schema: GenerateBetQuestionsOutputSchema},
  prompt: `You are an AI assistant specialized in generating creative and engaging bet questions suitable for a wedding reception.

  Based on the wedding's theme: {{{weddingTheme}}}, generate {{{numberOfQuestions}}} different bet questions with suggested numerical ranges that wedding guests can bet on.

  Each question should be unique and appropriate for a wedding celebration.

  Format the output as a JSON object containing an array of questions, each with a question, suggestedRangeStart, and suggestedRangeEnd.
  `,
});

const generateBetQuestionsFlow = ai.defineFlow(
  {
    name: 'generateBetQuestionsFlow',
    inputSchema: GenerateBetQuestionsInputSchema,
    outputSchema: GenerateBetQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
