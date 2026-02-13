import { Queue, Worker, type Job } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { processScrapeJob } from './processors/scrape-processor';
import { processTriageJob } from './processors/triage-processor';

function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
  };
}

function getRedisOptions(): RedisOptions {
  return parseRedisUrl(process.env.REDIS_URL!);
}

export const scrapeQueue = new Queue('scrape', {
  connection: getRedisOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export function createScrapeWorker() {
  return new Worker('scrape', processScrapeJob, {
    connection: getRedisOptions(),
    concurrency: 2,
    limiter: {
      max: 1,
      duration: 10_000,
    },
  });
}

export const triageQueue = new Queue('triage', {
  connection: getRedisOptions(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 50 },
  },
});

export function createTriageWorker() {
  return new Worker('triage', processTriageJob, {
    connection: getRedisOptions(),
    concurrency: 5,
  });
}

// ─── Schedule recurring scrapes ─────────────────────────────────────────────

export async function scheduleProfileScrape(
  profileId: string,
  boards: string[],
  intervalHours: number
) {
  const cronPattern = intervalHoursToCron(intervalHours);

  for (const board of boards) {
    const jobId = `scrape:${profileId}:${board}`;

    // Remove existing repeatable job if any
    await scrapeQueue.removeRepeatableByKey(jobId);

    // Add new repeatable job
    await scrapeQueue.add(
      'scrape-board',
      { profileId, board },
      {
        repeat: { pattern: cronPattern },
        jobId,
      }
    );
  }
}

/** Convert interval hours to a reasonable cron pattern */
function intervalHoursToCron(hours: number): string {
  if (hours <= 6) return '0 */6 * * *'; // Every 6 hours
  if (hours <= 12) return '0 */12 * * *'; // Every 12 hours
  if (hours <= 24) return '0 6 * * *'; // Daily at 6am
  if (hours <= 48) return '0 6 */2 * *'; // Every 2 days at 6am
  if (hours <= 72) return '0 6 */3 * *'; // Every 3 days at 6am
  return '0 6 * * 1'; // Weekly on Monday at 6am
}
