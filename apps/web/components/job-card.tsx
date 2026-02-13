'use client';

import Link from 'next/link';
import { MapPin, Building2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  JOB_STATUS_LABELS,
  JOB_BOARD_LABELS,
  type JobStatus,
  type JobBoard,
} from '@jobflow/shared/constants';

interface JobCardProps {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  salaryDisplay?: string | null;
  status: string;
  aiScore?: number | null;
  aiRecommendation?: string | null;
  sourceBoard: string;
  datePosted?: Date | null;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (score >= 60) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-rose-100 text-rose-800 border-rose-200';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'recommended':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'applied':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'interview':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'offer':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'rejected':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'withdrawn':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function JobCard({
  id,
  title,
  company,
  location,
  salaryDisplay,
  status,
  aiScore,
  sourceBoard,
  className,
}: JobCardProps) {
  const statusLabel =
    JOB_STATUS_LABELS[status as JobStatus] ?? status;
  const boardLabel =
    JOB_BOARD_LABELS[sourceBoard as JobBoard] ?? sourceBoard;

  return (
    <Link
      href={`/jobs/${id}`}
      className={cn(
        'block rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 active:shadow-md active:bg-muted/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight text-foreground line-clamp-2">
          {title}
        </h3>
        {aiScore != null && (
          <div
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold',
              getScoreColor(aiScore)
            )}
          >
            <Sparkles className="h-3 w-3" />
            {aiScore}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{company}</span>
      </div>

      {location && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn('text-[10px]', getStatusColor(status))}
        >
          {statusLabel}
        </Badge>
        {salaryDisplay && (
          <Badge variant="outline" className="text-[10px]">
            {salaryDisplay}
          </Badge>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {boardLabel}
        </span>
      </div>
    </Link>
  );
}
