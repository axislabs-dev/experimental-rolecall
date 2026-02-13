'use client';

import { useState, useTransition } from 'react';
import { ExternalLink, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateJobStatus, updateJobNotes, markJobApplied } from '@/lib/actions/jobs';
import {
  JOB_STATUS_LABELS,
  PIPELINE_COLUMNS,
  type JobStatus,
} from '@jobflow/shared/constants';
import { cn } from '@/lib/utils';

interface JobDetailActionsProps {
  userJobId: string;
  currentStatus: string;
  currentNotes: string;
  sourceUrl: string;
}

const allStatuses: JobStatus[] = [
  'recommended',
  'backlog',
  'applied',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
];

export function JobDetailActions({
  userJobId,
  currentStatus,
  currentNotes,
  sourceUrl,
}: JobDetailActionsProps) {
  const [notes, setNotes] = useState(currentNotes);
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [notesSaved, setNotesSaved] = useState(false);

  function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    startTransition(async () => {
      await updateJobStatus(userJobId, newStatus);
    });
  }

  function handleMarkApplied() {
    setStatus('applied');
    startTransition(async () => {
      await markJobApplied(userJobId);
    });
  }

  function handleSaveNotes() {
    startTransition(async () => {
      await updateJobNotes(userJobId, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {status !== 'applied' && (
          <Button
            onClick={handleMarkApplied}
            disabled={isPending}
            size="lg"
            className="gap-1.5 active:scale-[0.98]"
          >
            <Send className="h-4 w-4" />
            Mark as applied
          </Button>
        )}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="lg" className="gap-1.5 active:scale-[0.98]">
            <ExternalLink className="h-4 w-4" />
            Open listing
          </Button>
        </a>
      </div>

      {/* Status selector */}
      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-1.5">
          {allStatuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusChange(s)}
              disabled={isPending}
              className={cn(
                'min-h-[44px] rounded-lg border px-3.5 py-2 text-xs font-medium transition-all duration-200 active:scale-[0.98]',
                status === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground'
              )}
            >
              {JOB_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="notes">Notes</Label>
          {notesSaved && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <CheckCircle2 className="h-3 w-3" />
              Saved
            </span>
          )}
        </div>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your notes about this job..."
          rows={4}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveNotes}
          disabled={isPending || notes === currentNotes}
        >
          Save notes
        </Button>
      </div>
    </div>
  );
}
