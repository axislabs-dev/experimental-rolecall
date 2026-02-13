import { headers } from 'next/headers';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getUserJobs } from '@jobflow/database/queries/jobs';
import { JobKanban } from '@/components/job-kanban';

export default async function JobsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const rawJobs = await getUserJobs(userId);

  const jobs = rawJobs.map((row) => ({
    id: row.userJob.id,
    title: row.listing.title,
    company: row.listing.company,
    location: row.listing.locationRaw,
    salaryDisplay: row.listing.salaryDisplay,
    status: row.userJob.status,
    aiScore: row.userJob.aiScore,
    aiRecommendation: row.userJob.aiRecommendation,
    sourceBoard: row.listing.sourceBoard,
    datePosted: row.listing.datePosted,
    sortOrder: row.userJob.sortOrder,
  }));

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Search className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">No jobs yet</h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
          Set up a search profile and we&apos;ll start finding jobs that match
          your skills.
        </p>
        <Link
          href="/settings/search-profiles/new"
          className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground active:scale-[0.98]"
        >
          Create a search
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">My Jobs</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {jobs.length} total
        </span>
      </div>
      <JobKanban initialJobs={jobs} />
    </div>
  );
}
