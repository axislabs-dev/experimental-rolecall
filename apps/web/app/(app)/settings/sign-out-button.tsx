'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/');
          router.refresh();
        },
      },
    });
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex w-full min-h-[56px] items-center gap-4 rounded-xl px-4 py-3 text-left transition-all duration-200 active:bg-muted"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
        <LogOut className="h-5 w-5 text-destructive" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-destructive">Sign out</p>
        <p className="text-xs text-muted-foreground">
          Log out of your account
        </p>
      </div>
    </button>
  );
}
