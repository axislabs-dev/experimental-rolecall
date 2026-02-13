import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { SignupForm } from '@/components/signup-form';

export default function SignupPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Briefcase className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Start finding your next role with JobFlow
        </p>
      </div>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary">
          Sign in
        </Link>
      </p>
    </div>
  );
}
