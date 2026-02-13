import type { Job } from 'bullmq';
import { createUserJob } from '@jobflow/database/queries/jobs';
import { triageJob } from '../../lib/ai-triage';

export interface TriageJobData {
  jobListingId: string;
  profileId: string;
  userId: string;
}

export async function processTriageJob(job: Job<TriageJobData>) {
  const { jobListingId, profileId, userId } = job.data;

  console.log(`[triage] Evaluating job ${jobListingId} for user ${userId}`);

  // Fetch job listing and search profile
  const { db } = await import('@jobflow/database/client');
  const { jobListings, searchProfiles } = await import(
    '@jobflow/database/schema'
  );
  const { eq } = await import('drizzle-orm');

  const [listing] = await db
    .select()
    .from(jobListings)
    .where(eq(jobListings.id, jobListingId))
    .limit(1);

  const [profile] = await db
    .select()
    .from(searchProfiles)
    .where(eq(searchProfiles.id, profileId))
    .limit(1);

  if (!listing || !profile) {
    console.warn(`[triage] Missing listing or profile, skipping`);
    return;
  }

  // Run AI triage
  const result = await triageJob({
    jobTitle: listing.title,
    company: listing.company,
    description: listing.description ?? '',
    location: listing.locationRaw,
    salaryDisplay: listing.salaryDisplay,
    employmentType: listing.employmentType,
    userKeywords: profile.keywords,
    userLocation: profile.location,
    userQualifications: profile.qualifications,
    userPreferences: profile.preferences,
    userSalaryMin: profile.salaryMin,
  });

  // Determine status based on AI recommendation
  const status =
    result.recommendation === 'recommended'
      ? 'recommended'
      : 'backlog';

  // Create user job entry with AI data
  await createUserJob({
    userId,
    jobListingId,
    searchProfileId: profileId,
    status,
    aiScore: result.score,
    aiRecommendation: result.recommendation,
    aiReasoning: result.reasoning,
    aiTriagedAt: new Date(),
  });

  console.log(
    `[triage] Job ${listing.title} @ ${listing.company}: score=${result.score}, status=${status}`
  );
}
