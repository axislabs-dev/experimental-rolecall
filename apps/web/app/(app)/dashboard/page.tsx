import { headers } from 'next/headers';
import Link from 'next/link';
import {
  Briefcase,
  Send,
  MessageSquare,
  Trophy,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { getPipelineStats, getUpcomingReminders } from '@jobflow/database/queries/jobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JOB_STATUS_LABELS, type JobStatus } from '@jobflow/shared/constants';

const statConfig: {
  key: string;
  label: string;
  icon: typeof Briefcase;
  className: string;
}[] = [
  {
    key: 'recommended',
    label: 'Recommended',
    icon: Briefcase,
    className: 'bg-primary/10 text-primary',
  },
  {
    key: 'applied',
    label: 'Applied',
    icon: Send,
    className: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'interview',
    label: 'Interview',
    icon: MessageSquare,
    className: 'bg-violet-100 text-violet-700',
  },
  {
    key: 'offer',
    label: 'Offer',
    icon: Trophy,
    className: 'bg-emerald-100 text-emerald-700',
  },
];

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const [stats, reminders] = await Promise.all([
    getPipelineStats(userId),
    getUpcomingReminders(userId),
  ]);

  const totalJobs = Object.values(stats).reduce((sum, n) => sum + n, 0);
  const firstName = session!.user.name?.split(' ')[0] ?? 'there';

  return (
    <div className="px-4 py-6">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Hi {firstName}!
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {totalJobs === 0
            ? 'Your job pipeline is empty. Set up a search to get started!'
            : `You have ${totalJobs} job${totalJobs === 1 ? '' : 's'} in your pipeline.`}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {statConfig.map((item) => {
          const Icon = item.icon;
          const count = stats[item.key] ?? 0;
          return (
            <Card key={item.key} className="overflow-hidden shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.className}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{count}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="mt-6">
        <Link
          href="/jobs"
          className="flex min-h-[48px] items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 active:bg-muted"
        >
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">View your job pipeline</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Upcoming reminders */}
      {reminders.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Upcoming reminders
          </h2>
          <div className="flex flex-col gap-2">
            {reminders.slice(0, 5).map((item) => (
              <Link
                key={item.userJob.id}
                href={`/jobs/${item.userJob.id}`}
                className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 active:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.listing.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.listing.company}
                  </p>
                </div>
                <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {JOB_STATUS_LABELS[item.userJob.status as JobStatus] ??
                      item.userJob.status}
                  </Badge>
                  {item.userJob.nextActionDate && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.userJob.nextActionDate).toLocaleDateString(
                        'en-AU',
                        { day: 'numeric', month: 'short' }
                      )}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state prompt */}
      {totalJobs === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-2xl border-2 border-dashed border-muted-foreground/20 p-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-sm font-semibold">No jobs yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a search profile in Settings to start finding jobs.
          </p>
          <Link
            href="/settings/search-profiles/new"
            className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground active:scale-[0.98]"
          >
            Create your first search
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
