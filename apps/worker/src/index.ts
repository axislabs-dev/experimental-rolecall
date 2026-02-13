import { createScrapeWorker, createTriageWorker, scrapeQueue, scheduleProfileScrape } from './queues/scrape-queue';
import { getActiveSearchProfiles } from '@jobflow/database/queries/search-profiles';

console.log('[worker] Starting JobFlow worker...');

// ─── Start workers ──────────────────────────────────────────────────────────

const scrapeWorker = createScrapeWorker();
const triageWorker = createTriageWorker();

scrapeWorker.on('completed', (job) => {
  console.log(`[scrape] Job ${job.id} completed`);
});

scrapeWorker.on('failed', (job, err) => {
  console.error(`[scrape] Job ${job?.id} failed:`, err.message);
});

triageWorker.on('completed', (job) => {
  console.log(`[triage] Job ${job.id} completed`);
});

triageWorker.on('failed', (job, err) => {
  console.error(`[triage] Job ${job?.id} failed:`, err.message);
});

console.log('[worker] Scrape and triage workers started');

// ─── Schedule recurring scrapes from active profiles ────────────────────────

async function initializeSchedules() {
  try {
    const profiles = await getActiveSearchProfiles();
    console.log(`[worker] Found ${profiles.length} active search profile(s)`);

    for (const profile of profiles) {
      await scheduleProfileScrape(
        profile.id,
        profile.boards,
        profile.scrapeIntervalHours
      );
      console.log(
        `[worker] Scheduled scrape for "${profile.name}" every ${profile.scrapeIntervalHours}h across ${profile.boards.length} board(s)`
      );
    }

    // Also fire an immediate scrape for any profile that hasn't been scraped yet
    for (const profile of profiles) {
      if (!profile.lastScrapedAt) {
        for (const board of profile.boards) {
          await scrapeQueue.add('scrape-board', {
            profileId: profile.id,
            board,
          });
        }
        console.log(
          `[worker] Queued initial scrape for "${profile.name}" (never scraped)`
        );
      }
    }
  } catch (error) {
    console.error('[worker] Failed to initialize schedules:', error);
  }
}

initializeSchedules();

// ─── Graceful shutdown ──────────────────────────────────────────────────────

async function shutdown(signal: string) {
  console.log(`[worker] Received ${signal}, shutting down gracefully...`);

  await scrapeWorker.close();
  await triageWorker.close();
  await scrapeQueue.close();

  console.log('[worker] Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

console.log('[worker] Ready and waiting for jobs');
