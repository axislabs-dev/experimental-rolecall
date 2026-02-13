'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  updateUserJobStatus,
  updateUserJobNotes,
  markJobApplied as markJobAppliedQuery,
  updateUserJobSortOrder,
} from '@jobflow/database/queries/jobs';

async function getAuthUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('Unauthorized');
  return session.user.id;
}

export async function updateJobStatus(userJobId: string, status: string) {
  const userId = await getAuthUserId();
  await updateUserJobStatus(userId, userJobId, status);
  revalidatePath('/jobs');
  revalidatePath('/dashboard');
}

export async function updateJobNotes(userJobId: string, notes: string) {
  const userId = await getAuthUserId();
  await updateUserJobNotes(userId, userJobId, notes);
  revalidatePath(`/jobs/${userJobId}`);
}

export async function markJobApplied(userJobId: string) {
  const userId = await getAuthUserId();
  await markJobAppliedQuery(userId, userJobId);
  revalidatePath('/jobs');
  revalidatePath('/dashboard');
  revalidatePath(`/jobs/${userJobId}`);
}

export async function updateJobSortOrder(
  userJobId: string,
  sortOrder: number,
  newStatus?: string
) {
  const userId = await getAuthUserId();
  await updateUserJobSortOrder(userId, userJobId, sortOrder, newStatus);
  revalidatePath('/jobs');
}
