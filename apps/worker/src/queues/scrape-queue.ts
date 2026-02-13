import { Queue, Worker, type Job } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { processScrapeJob } from './processors/scrape-processor';
import { processTriageJob } from './processors/triage-processor';

function getRedisOptions(): RedisOptions {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      'REDIS_URL is not set. The worker requires Redis to function.\n' +
        'Set REDIS_URL in your .env file (e.g. redis://localhost:6379).\n' +
        'Start Redis locally: docker run -d -p 6379:6379 redis:7-alpine'
    );
  }

  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
  };
}

let _scrapeQueue: Queue | null = null;
let _triageQueue: Queue | null = null;

export function getScrapeQueue(): Queue {
  if (!_scrapeQueue) {
    _scrapeQueue = new Queue('scrape', {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return _scrapeQueue;
}

export function getTriageQueue(): Queue {
  if (!_triageQueue) {
    _triageQueue = new Queue('triage', {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return _triageQueue;
}

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
    await getScrapeQueue().removeRepeatableByKey(jobId);

    await getScrapeQueue().add(
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
