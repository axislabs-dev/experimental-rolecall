import { eq, and } from 'drizzle-orm';
import { db } from '../client';
import { searchProfiles } from '../schema';

/** Get all search profiles for a user */
export async function getSearchProfiles(userId: string) {
  return db
    .select()
    .from(searchProfiles)
    .where(eq(searchProfiles.userId, userId))
    .orderBy(searchProfiles.createdAt);
}

/** Get a single search profile */
export async function getSearchProfile(userId: string, profileId: string) {
  const result = await db
    .select()
    .from(searchProfiles)
    .where(
      and(
        eq(searchProfiles.userId, userId),
        eq(searchProfiles.id, profileId)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

/** Create a new search profile */
export async function createSearchProfile(
  data: typeof searchProfiles.$inferInsert
) {
  return db.insert(searchProfiles).values(data).returning();
}

/** Update a search profile */
export async function updateSearchProfile(
  userId: string,
  profileId: string,
  data: Partial<typeof searchProfiles.$inferInsert>
) {
  return db
    .update(searchProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(searchProfiles.userId, userId),
        eq(searchProfiles.id, profileId)
      )
    )
    .returning();
}

/** Delete a search profile */
export async function deleteSearchProfile(
  userId: string,
  profileId: string
) {
  return db
    .delete(searchProfiles)
    .where(
      and(
        eq(searchProfiles.userId, userId),
        eq(searchProfiles.id, profileId)
      )
    )
    .returning();
}

/** Get all active search profiles (for the cron scheduler) */
export async function getActiveSearchProfiles() {
  return db
    .select()
    .from(searchProfiles)
    .where(eq(searchProfiles.isActive, true));
}

/** Mark a profile as last scraped */
export async function markProfileScraped(profileId: string) {
  return db
    .update(searchProfiles)
    .set({ lastScrapedAt: new Date() })
    .where(eq(searchProfiles.id, profileId));
}
