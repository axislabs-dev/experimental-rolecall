import { eq } from 'drizzle-orm';
import { db } from '../client';
import { user } from '../schema';

/** Get a user by ID */
export async function getUserById(userId: string) {
  const result = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return result[0] ?? null;
}

/** Get a user by email */
export async function getUserByEmail(email: string) {
  const result = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  return result[0] ?? null;
}
