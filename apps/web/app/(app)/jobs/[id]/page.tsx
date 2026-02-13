import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  Sparkles,
  DollarSign,
  Clock,
  Briefcase,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { getUserJob, getCommunications } from '@jobflow/database/queries/jobs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  JOB_STATUS_LABELS,
  JOB_BOARD_LABELS,
  type JobStatus,
  type JobBoard,
} from '@jobflow/shared/constants';
import { JobDetailActions } from './job-detail-actions';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const result = await getUserJob(userId, id);
  if (!result) notFound();

  const { userJob, listing } = result;
  const communications = await getCommunications(userJob.id);

  const statusLabel =
    JOB_STATUS_LABELS[userJob.status as JobStatus] ?? userJob.status;
  const boardLabel =
    JOB_BOARD_LABELS[listing.sourceBoard as JobBoard] ?? listing.sourceBoard;

  function getScoreDescription(score: number): string {
    if (score >= 80) return 'Strong match';
    if (score >= 60) return 'Good match';
    if (score >= 40) return 'Possible match';
    return 'Low match';
  }

  return (
    <div className="px-4 py-6">
      {/* Back button */}
      <Link
        href="/jobs"
        className="mb-4 inline-flex min-h-[48px] items-center gap-2 text-sm text-muted-foreground active:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold leading-tight tracking-tight">
          {listing.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            {listing.company}
          </span>
          {listing.locationRaw && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {listing.locationRaw}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            {boardLabel}
          </span>
        </div>
      </div>

      {/* Status + score row */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge className="text-xs">{statusLabel}</Badge>
        {listing.salaryDisplay && (
          <Badge variant="outline" className="gap-1 text-xs">
            <DollarSign className="h-3 w-3" />
            {listing.salaryDisplay}
          </Badge>
        )}
        {listing.employmentType && (
          <Badge variant="secondary" className="text-xs">
            {listing.employmentType}
          </Badge>
        )}
        {listing.datePosted && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            {new Date(listing.datePosted).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Badge>
        )}
      </div>

      {/* AI Score card */}
      {userJob.aiScore != null && (
        <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums">
                  {userJob.aiScore}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {getScoreDescription(userJob.aiScore)}
              </p>
            </div>
          </div>
          {userJob.aiReasoning && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {userJob.aiReasoning}
            </p>
          )}
        </div>
      )}

      {/* Actions — client component */}
      <JobDetailActions
        userJobId={userJob.id}
        currentStatus={userJob.status}
        currentNotes={userJob.notes ?? ''}
        sourceUrl={listing.sourceUrl}
      />

      <Separator className="my-6" />

      {/* Job description */}
      {listing.description && (
        <div className="mb-6">
          <h2 className="mb-3 text-base font-semibold">About this role</h2>
          <div className="prose prose-sm max-w-none text-sm leading-relaxed text-muted-foreground">
            {listing.description.split('\n').map((paragraph, i) => (
              <p key={i} className="mb-2">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* External link */}
      <a
        href={listing.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-6 flex min-h-[48px] items-center justify-center gap-2 rounded-xl border bg-card p-4 text-sm font-medium text-primary shadow-sm transition-all duration-200 active:bg-muted"
      >
        View original listing
        <ExternalLink className="h-4 w-4" />
      </a>

      {/* Communication log */}
      {communications.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-base font-semibold">
            Communication log
          </h2>
          <div className="flex flex-col gap-3">
            {communications.map((comm) => (
              <div
                key={comm.id}
                className="rounded-xl border bg-card p-3"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {comm.type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(comm.occurredAt).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {comm.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next action reminder */}
      {userJob.nextAction && (
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-primary">Next step</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {userJob.nextAction}
          </p>
          {userJob.nextActionDate && (
            <p className="mt-1 text-xs text-muted-foreground">
              Due:{' '}
              {new Date(userJob.nextActionDate).toLocaleDateString('en-AU', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
