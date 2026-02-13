'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createSearchProfile as createProfileQuery,
  updateSearchProfile as updateProfileQuery,
  deleteSearchProfile as deleteProfileQuery,
} from '@jobflow/database/queries/search-profiles';
import { searchProfileSchema } from '@/lib/validations/search-profile';

async function getAuthUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('Unauthorized');
  return session.user.id;
}

export async function createSearchProfile(formData: FormData) {
  const userId = await getAuthUserId();

  const raw = {
    name: formData.get('name') as string,
    keywords: formData.get('keywords') as string,
    location: formData.get('location') as string,
    radiusKm: Number(formData.get('radiusKm')),
    employmentTypes: formData.getAll('employmentTypes') as string[],
    salaryMin: formData.get('salaryMin') ? Number(formData.get('salaryMin')) : undefined,
    salaryMax: formData.get('salaryMax') ? Number(formData.get('salaryMax')) : undefined,
    boards: formData.getAll('boards') as string[],
    qualifications: (formData.get('qualifications') as string) || undefined,
    preferences: (formData.get('preferences') as string) || undefined,
    scrapeIntervalHours: Number(formData.get('scrapeIntervalHours')),
  };

  const parsed = searchProfileSchema.parse(raw);

  await createProfileQuery({
    userId,
    name: parsed.name,
    keywords: parsed.keywords,
    location: parsed.location,
    radiusKm: parsed.radiusKm,
    employmentTypes: parsed.employmentTypes ?? null,
    salaryMin: parsed.salaryMin ?? null,
    salaryMax: parsed.salaryMax ?? null,
    boards: parsed.boards,
    qualifications: parsed.qualifications ?? null,
    preferences: parsed.preferences ?? null,
    scrapeIntervalHours: parsed.scrapeIntervalHours,
  });

  revalidatePath('/settings/search-profiles');
  redirect('/settings/search-profiles');
}

export async function updateSearchProfile(profileId: string, formData: FormData) {
  const userId = await getAuthUserId();

  const raw = {
    name: formData.get('name') as string,
    keywords: formData.get('keywords') as string,
    location: formData.get('location') as string,
    radiusKm: Number(formData.get('radiusKm')),
    employmentTypes: formData.getAll('employmentTypes') as string[],
    salaryMin: formData.get('salaryMin') ? Number(formData.get('salaryMin')) : undefined,
    salaryMax: formData.get('salaryMax') ? Number(formData.get('salaryMax')) : undefined,
    boards: formData.getAll('boards') as string[],
    qualifications: (formData.get('qualifications') as string) || undefined,
    preferences: (formData.get('preferences') as string) || undefined,
    scrapeIntervalHours: Number(formData.get('scrapeIntervalHours')),
  };

  const parsed = searchProfileSchema.parse(raw);

  await updateProfileQuery(userId, profileId, {
    name: parsed.name,
    keywords: parsed.keywords,
    location: parsed.location,
    radiusKm: parsed.radiusKm,
    employmentTypes: parsed.employmentTypes ?? null,
    salaryMin: parsed.salaryMin ?? null,
    salaryMax: parsed.salaryMax ?? null,
    boards: parsed.boards,
    qualifications: parsed.qualifications ?? null,
    preferences: parsed.preferences ?? null,
    scrapeIntervalHours: parsed.scrapeIntervalHours,
  });

  revalidatePath('/settings/search-profiles');
  redirect('/settings/search-profiles');
}

export async function deleteSearchProfile(profileId: string) {
  const userId = await getAuthUserId();
  await deleteProfileQuery(userId, profileId);
  revalidatePath('/settings/search-profiles');
}

export async function toggleSearchProfileActive(profileId: string, isActive: boolean) {
  const userId = await getAuthUserId();
  await updateProfileQuery(userId, profileId, { isActive });
  revalidatePath('/settings/search-profiles');
}
