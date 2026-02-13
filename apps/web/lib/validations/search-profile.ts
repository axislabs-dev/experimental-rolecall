import { z } from 'zod';
import { JOB_BOARDS, EMPLOYMENT_TYPES } from '@jobflow/shared/constants';

export const searchProfileSchema = z.object({
  name: z.string().min(1, 'Give your search a name').max(100),
  keywords: z
    .string()
    .min(1, 'Add at least one search term')
    .transform((val) =>
      val
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    ),
  location: z.string().min(1, 'Where should we look?'),
  radiusKm: z.coerce.number().min(1).max(200).default(20),
  employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)).optional(),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  boards: z
    .array(z.string())
    .min(1, 'Select at least one job board'),
  qualifications: z.string().optional(),
  preferences: z.string().optional(),
  scrapeIntervalHours: z.coerce.number().min(1).max(168).default(48),
});

export type SearchProfileInput = z.infer<typeof searchProfileSchema>;
