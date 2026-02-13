import { eq, desc, and } from 'drizzle-orm';
import { db } from '../client';
import { scrapeRuns } from '../schema';

/** Create a new scrape run record */
export async function createScrapeRun(
  data: typeof scrapeRuns.$inferInsert
) {
  return db.insert(scrapeRuns).values(data).returning();
}

/** Update a scrape run on completion */
export async function completeScrapeRun(
  runId: string,
  data: {
    status: 'completed' | 'failed';
    jobsFound?: number;
    jobsNew?: number;
    jobsUpdated?: number;
    errorMessage?: string;
  }
) {
  const startedAt = await db
    .select({ startedAt: scrapeRuns.startedAt })
    .from(scrapeRuns)
    .where(eq(scrapeRuns.id, runId))
    .limit(1);

  const durationMs = startedAt[0]
    ? Date.now() - startedAt[0].startedAt.getTime()
    : undefined;

  return db
    .update(scrapeRuns)
    .set({
      ...data,
      completedAt: new Date(),
      durationMs,
    })
    .where(eq(scrapeRuns.id, runId))
    .returning();
}

/** Get recent scrape runs */
export async function getRecentScrapeRuns(limit = 20) {
  return db
    .select()
    .from(scrapeRuns)
    .orderBy(desc(scrapeRuns.startedAt))
    .limit(limit);
}

/** Get scrape runs for a specific board */
export async function getScrapeRunsByBoard(board: string, limit = 10) {
  return db
    .select()
    .from(scrapeRuns)
    .where(eq(scrapeRuns.board, board))
    .orderBy(desc(scrapeRuns.startedAt))
    .limit(limit);
}
