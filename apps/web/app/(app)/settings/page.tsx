import { headers } from 'next/headers';
import Link from 'next/link';
import {
  Search,
  User,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { Separator } from '@/components/ui/separator';
import { SignOutButton } from './sign-out-button';

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session!.user;

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Settings</h1>

      {/* User info card */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Settings links */}
      <div className="flex flex-col gap-1">
        <Link
          href="/settings/search-profiles"
          className="flex min-h-[56px] items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200 active:bg-muted"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Search profiles</p>
            <p className="text-xs text-muted-foreground">
              Configure what jobs to find
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>

        <Separator />

        <SignOutButton />
      </div>
    </div>
  );
}
