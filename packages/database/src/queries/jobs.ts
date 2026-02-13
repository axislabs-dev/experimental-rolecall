import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../client';
import { jobListings, userJobs, communications } from '../schema';

/** Get all jobs in a user's pipeline, optionally filtered by status */
export async function getUserJobs(userId: string, status?: string) {
  const conditions = [eq(userJobs.userId, userId)];
  if (status) {
    conditions.push(eq(userJobs.status, status));
  }

  return db
    .select({
      userJob: userJobs,
      listing: jobListings,
    })
    .from(userJobs)
    .innerJoin(jobListings, eq(userJobs.jobListingId, jobListings.id))
    .where(and(...conditions))
    .orderBy(desc(userJobs.updatedAt));
}

/** Get a single user job with its listing */
export async function getUserJob(userId: string, userJobId: string) {
  const result = await db
    .select({
      userJob: userJobs,
      listing: jobListings,
    })
    .from(userJobs)
    .innerJoin(jobListings, eq(userJobs.jobListingId, jobListings.id))
    .where(and(eq(userJobs.userId, userId), eq(userJobs.id, userJobId)))
    .limit(1);

  return result[0] ?? null;
}

/** Update a user job's status */
export async function updateUserJobStatus(
  userId: string,
  userJobId: string,
  status: string
) {
  return db
    .update(userJobs)
    .set({ status, statusChangedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(userJobs.id, userJobId), eq(userJobs.userId, userId)))
    .returning();
}

/** Update sort order for kanban drag-and-drop */
export async function updateUserJobSortOrder(
  userId: string,
  userJobId: string,
  sortOrder: number,
  newStatus?: string
) {
  const updates: Record<string, unknown> = { sortOrder, updatedAt: new Date() };
  if (newStatus) {
    updates.status = newStatus;
    updates.statusChangedAt = new Date();
  }
  return db
    .update(userJobs)
    .set(updates)
    .where(and(eq(userJobs.id, userJobId), eq(userJobs.userId, userId)))
    .returning();
}

/** Update user job notes */
export async function updateUserJobNotes(
  userId: string,
  userJobId: string,
  notes: string
) {
  return db
    .update(userJobs)
    .set({ notes, updatedAt: new Date() })
    .where(and(eq(userJobs.id, userJobId), eq(userJobs.userId, userId)))
    .returning();
}

/** Mark a job as applied */
export async function markJobApplied(userId: string, userJobId: string) {
  return db
    .update(userJobs)
    .set({
      status: 'applied',
      statusChangedAt: new Date(),
      dateApplied: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(userJobs.id, userJobId), eq(userJobs.userId, userId)))
    .returning();
}

/** Insert or update a scraped job listing (upsert by source URL) */
export async function upsertJobListing(
  data: typeof jobListings.$inferInsert
) {
  return db
    .insert(jobListings)
    .values(data)
    .onConflictDoUpdate({
      target: jobListings.sourceUrl,
      set: { updatedAt: new Date() },
    })
    .returning();
}

/** Create a user job entry (AI triage result) */
export async function createUserJob(
  data: typeof userJobs.$inferInsert
) {
  return db
    .insert(userJobs)
    .values(data)
    .onConflictDoNothing({
      target: [userJobs.userId, userJobs.jobListingId],
    })
    .returning();
}

/** Get communications for a user job */
export async function getCommunications(userJobId: string) {
  return db
    .select()
    .from(communications)
    .where(eq(communications.userJobId, userJobId))
    .orderBy(desc(communications.occurredAt));
}

/** Add a communication entry */
export async function addCommunication(
  data: typeof communications.$inferInsert
) {
  return db.insert(communications).values(data).returning();
}

/** Get pipeline stats for a user */
export async function getPipelineStats(userId: string) {
  const result = await db
    .select({
      status: userJobs.status,
      count: sql<number>`count(*)::int`,
    })
    .from(userJobs)
    .where(eq(userJobs.userId, userId))
    .groupBy(userJobs.status);

  return result.reduce(
    (acc, row) => {
      acc[row.status] = row.count;
      return acc;
    },
    {} as Record<string, number>
  );
}

/** Get jobs with upcoming follow-up reminders */
export async function getUpcomingReminders(userId: string) {
  return db
    .select({ userJob: userJobs, listing: jobListings })
    .from(userJobs)
    .innerJoin(jobListings, eq(userJobs.jobListingId, jobListings.id))
    .where(
      and(
        eq(userJobs.userId, userId),
        sql`${userJobs.nextActionDate} IS NOT NULL`,
        sql`${userJobs.nextActionDate} <= NOW() + INTERVAL '7 days'`
      )
    )
    .orderBy(userJobs.nextActionDate);
}

/** Check if a job listing already exists by content hash */
export async function findByContentHash(contentHash: string) {
  return db
    .select()
    .from(jobListings)
    .where(eq(jobListings.contentHash, contentHash))
    .limit(1);
}
