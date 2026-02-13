import { headers } from 'next/headers';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  MapPin,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { getSearchProfiles } from '@jobflow/database/queries/search-profiles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  deleteSearchProfile,
  toggleSearchProfileActive,
} from '@/lib/actions/search-profiles';
import { JOB_BOARD_LABELS, type JobBoard } from '@jobflow/shared/constants';

export default async function SearchProfilesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const profiles = await getSearchProfiles(userId);

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex min-h-[48px] min-w-[48px] items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Search profiles</h1>
        </div>
        <Link href="/settings/search-profiles/new">
          <Button size="sm" className="gap-1.5 active:scale-[0.98]">
            <Plus className="h-4 w-4" />
            New
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {profiles.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-muted-foreground/20 p-8 text-center">
          <h3 className="text-sm font-semibold">No search profiles yet</h3>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Create a search profile to tell us what kind of jobs you&apos;re
            looking for. We&apos;ll scan the boards and find matches.
          </p>
          <Link
            href="/settings/search-profiles/new"
            className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Create your first search
          </Link>
        </div>
      )}

      {/* Profiles list */}
      <div className="flex flex-col gap-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="rounded-xl border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">
                    {profile.name}
                  </h3>
                  <Badge
                    variant={profile.isActive ? 'default' : 'outline'}
                    className="shrink-0 text-[10px]"
                  >
                    {profile.isActive ? 'Active' : 'Paused'}
                  </Badge>
                </div>

                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {profile.keywords.join(', ')}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {profile.location} ({profile.radiusKm}km)
                  </span>
                  {profile.lastScrapedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last checked{' '}
                      {new Date(profile.lastScrapedAt).toLocaleDateString(
                        'en-AU',
                        { day: 'numeric', month: 'short' }
                      )}
                    </span>
                  )}
                </div>

                {/* Boards */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {profile.boards.map((board) => (
                    <Badge
                      key={board}
                      variant="secondary"
                      className="text-[10px]"
                    >
                      {JOB_BOARD_LABELS[board as JobBoard] ?? board}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2 border-t pt-3">
              <form
                action={toggleSearchProfileActive.bind(
                  null,
                  profile.id,
                  !profile.isActive
                )}
              >
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="min-h-[40px] text-xs"
                >
                  {profile.isActive ? 'Pause' : 'Resume'}
                </Button>
              </form>

              <Link href={`/settings/search-profiles/${profile.id}`}>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>

              <form action={deleteSearchProfile.bind(null, profile.id)}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
