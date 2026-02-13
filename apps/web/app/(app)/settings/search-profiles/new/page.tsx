import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SearchProfileForm } from '@/components/search-profile-form';
import { createSearchProfile } from '@/lib/actions/search-profiles';

export default function NewSearchProfilePage() {
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
          <h1 className="text-xl font-bold tracking-tight">New search</h1>
          <p className="text-xs text-muted-foreground">
            Tell us what you&apos;re looking for
          </p>
        </div>
      </div>

      <SearchProfileForm
        action={createSearchProfile}
        submitLabel="Create search"
      />
    </div>
  );
}
