import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { BottomNav } from '@/components/bottom-nav';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-[76px]">{children}</main>
      <BottomNav />
    </div>
  );
}
