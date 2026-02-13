import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getSearchProfile } from '@jobflow/database/queries/search-profiles';
import { SearchProfileForm } from '@/components/search-profile-form';
import { updateSearchProfile } from '@/lib/actions/search-profiles';

export default async function EditSearchProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const profile = await getSearchProfile(userId, id);
  if (!profile) notFound();

  const boundAction = updateSearchProfile.bind(null, id);

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/settings/search-profiles"
          className="flex min-h-[48px] min-w-[48px] items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Edit search</h1>
          <p className="text-xs text-muted-foreground">{profile.name}</p>
        </div>
      </div>

      <SearchProfileForm
        action={boundAction}
        defaultValues={{
          name: profile.name,
          keywords: profile.keywords,
          location: profile.location,
          radiusKm: profile.radiusKm,
          employmentTypes: profile.employmentTypes,
          salaryMin: profile.salaryMin,
          salaryMax: profile.salaryMax,
          boards: profile.boards,
          qualifications: profile.qualifications,
          preferences: profile.preferences,
          scrapeIntervalHours: profile.scrapeIntervalHours,
        }}
        submitLabel="Update search"
      />
    </div>
  );
}
