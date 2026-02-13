import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Briefcase className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sign in to your JobFlow account
        </p>
      </div>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-primary">
          Sign up
        </Link>
      </p>
    </div>
  );
}
