import { generateObject, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const triageSchema = z.object({
  score: z.number().min(0).max(100).describe('Match score from 0 to 100'),
  recommendation: z
    .enum(['recommended', 'maybe', 'not_recommended'])
    .describe('Overall recommendation'),
  reasoning: z
    .string()
    .describe(
      'Two to three sentence explanation of why this job does or does not fit the user'
    ),
});

export type TriageResult = z.infer<typeof triageSchema>;

interface TriageInput {
  jobTitle: string;
  company: string;
  description: string;
  location: string | null;
  salaryDisplay: string | null;
  employmentType: string | null;
  userKeywords: string[];
  userLocation: string;
  userQualifications: string | null;
  userPreferences: string | null;
  userSalaryMin: number | null;
}

export async function triageJob(input: TriageInput): Promise<TriageResult> {
  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: triageSchema,
      system: `You are a kind, supportive job matching assistant helping someone find the right role. 
Evaluate the job listing against the user's profile honestly but encouragingly.
- Score 70+ = recommended (good fit, worth applying)
- Score 40-69 = maybe (possible fit with some gaps)
- Score below 40 = not_recommended (significant mismatch)
Consider: role match, location, salary, qualifications, and user preferences.
If the job is clearly outside their field or too senior, be honest but gentle.`,
      prompt: `
**Job Listing:**
- Title: ${input.jobTitle}
- Company: ${input.company}
- Location: ${input.location ?? 'Not specified'}
- Salary: ${input.salaryDisplay ?? 'Not specified'}
- Type: ${input.employmentType ?? 'Not specified'}
- Description: ${input.description.slice(0, 1500)}

**User Profile:**
- Looking for: ${input.userKeywords.join(', ')}
- Location: ${input.userLocation}
- Min salary: ${input.userSalaryMin ? `$${input.userSalaryMin.toLocaleString()}` : 'Flexible'}
- Qualifications: ${input.userQualifications ?? 'Not specified'}
- Preferences: ${input.userPreferences ?? 'Not specified'}

Evaluate this job for the user.`.trim(),
      temperature: 0.3,
      maxTokens: 500,
    });

    return object;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error('AI triage failed to generate valid output:', error.cause);
      return {
        score: 50,
        recommendation: 'maybe',
        reasoning:
          'Could not automatically evaluate this job. Please review it manually.',
      };
    }
    throw error;
  }
}
