import type { Job } from 'bullmq';
import { getSearchProfile } from '@jobflow/database/queries/search-profiles';
import {
  createScrapeRun,
  completeScrapeRun,
} from '@jobflow/database/queries/scrape-runs';
import {
  upsertJobListing,
  findByContentHash,
} from '@jobflow/database/queries/jobs';
import { markProfileScraped } from '@jobflow/database/queries/search-profiles';
import { generateContentHash } from '@jobflow/shared/utils';
import { scraperRegistry } from '../../scrapers/registry';
import { triageQueue } from '../scrape-queue';
import type { ScrapedJob } from '@jobflow/shared/types';

export interface ScrapeJobData {
  profileId: string;
  board: string;
}

export async function processScrapeJob(job: Job<ScrapeJobData>) {
  const { profileId, board } = job.data;

  console.log(`[scrape] Starting ${board} for profile ${profileId}`);

  // Fetch search profile
  // We need to get profile without userId check for worker context
  const { db } = await import('@jobflow/database/client');
  const { searchProfiles } = await import('@jobflow/database/schema');
  const { eq } = await import('drizzle-orm');
  const profiles = await db
    .select()
    .from(searchProfiles)
    .where(eq(searchProfiles.id, profileId))
    .limit(1);

  const profile = profiles[0];
  if (!profile) {
    throw new Error(`Search profile ${profileId} not found`);
  }

  // Create scrape run record
  const [run] = await createScrapeRun({
    board,
    searchProfileId: profileId,
    status: 'running',
  });

  const scraper = scraperRegistry.get(board);
  if (!scraper) {
    await completeScrapeRun(run.id, {
      status: 'failed',
      errorMessage: `No scraper registered for board: ${board}`,
    });
    throw new Error(`No scraper for board: ${board}`);
  }

  try {
    // Run the scraper
    const scrapedJobs = await scraper.scrape({
      keywords: profile.keywords,
      location: profile.location,
      radiusKm: profile.radiusKm,
    });

    let jobsNew = 0;
    let jobsUpdated = 0;

    for (const scraped of scrapedJobs) {
      const contentHash = generateContentHash(
        scraped.title,
        scraped.company,
        scraped.description
      );

      // Check cross-board dedup
      const existing = await findByContentHash(contentHash);
      if (existing.length > 0) {
        jobsUpdated++;
        continue;
      }

      // Upsert job listing
      const [listing] = await upsertJobListing({
        externalId: scraped.externalId,
        sourceBoard: scraped.sourceBoard,
        sourceUrl: scraped.sourceUrl,
        title: scraped.title,
        company: scraped.company,
        description: scraped.description,
        locationRaw: scraped.locationRaw,
        salaryDisplay: scraped.salaryDisplay,
        salaryMin: scraped.salaryMin,
        salaryMax: scraped.salaryMax,
        salaryType: scraped.salaryType,
        employmentType: scraped.employmentType,
        category: scraped.category,
        datePosted: scraped.datePosted,
        expiresAt: scraped.expiresAt,
        contentHash,
      });

      if (listing) {
        jobsNew++;

        // Queue AI triage for this new job
        await triageQueue.add('triage-job', {
          jobListingId: listing.id,
          profileId,
          userId: profile.userId,
        });
      }
    }

    // Mark run as complete
    await completeScrapeRun(run.id, {
      status: 'completed',
      jobsFound: scrapedJobs.length,
      jobsNew,
      jobsUpdated,
    });

    // Update profile last scraped time
    await markProfileScraped(profileId);

    console.log(
      `[scrape] ${board}: found=${scrapedJobs.length}, new=${jobsNew}, updated=${jobsUpdated}`
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    await completeScrapeRun(run.id, {
      status: 'failed',
      errorMessage,
    });
    throw error;
  }
}
