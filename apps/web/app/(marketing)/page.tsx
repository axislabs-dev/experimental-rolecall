import Link from 'next/link';
import { Briefcase, Sparkles, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Logo / hero */}
      <div className="mb-8 flex h-18 w-18 items-center justify-center rounded-2xl bg-primary/10">
        <Briefcase className="h-9 w-9 text-primary" />
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Welcome to <span className="text-primary">JobFlow</span>
      </h1>
      <p className="mt-3 max-w-sm text-base leading-relaxed text-muted-foreground">
        Your personal job search companion. We find the right jobs, so you can
        focus on landing them.
      </p>

      {/* Feature pills */}
      <div className="mt-10 flex w-full flex-col gap-3 text-left">
        <div className="flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 active:bg-muted">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Smart job discovery</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              We scan Australian job boards daily and surface the roles that match
              your skills.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 active:bg-muted">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/30">
            <Sparkles className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI-powered matching</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Each job gets a fit score based on your experience, preferences, and
              deal-breakers.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 active:bg-muted">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Track your applications</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              From first look to offer, keep everything organised in one place.
            </p>
          </div>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="mt-10 flex w-full flex-col gap-3">
        <Link href="/signup" className="w-full">
          <Button size="lg" className="w-full gap-2 active:scale-[0.98]">
            Get started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/login" className="w-full">
          <Button variant="outline" size="lg" className="w-full active:scale-[0.98]">
            I already have an account
          </Button>
        </Link>
      </div>
    </div>
  );
}
