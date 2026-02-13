'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { JobCard } from '@/components/job-card';
import { updateJobSortOrder } from '@/lib/actions/jobs';
import { cn } from '@/lib/utils';
import {
  PIPELINE_COLUMNS,
  JOB_STATUS_LABELS,
  type JobStatus,
} from '@jobflow/shared/constants';

interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salaryDisplay: string | null;
  status: string;
  aiScore: number | null;
  aiRecommendation: string | null;
  sourceBoard: string;
  datePosted: Date | null;
  sortOrder: number;
}

interface JobKanbanProps {
  initialJobs: JobItem[];
}

function SortableJobCard({ job }: { job: JobItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(isDragging && 'opacity-40')}
    >
      <JobCard
        id={job.id}
        title={job.title}
        company={job.company}
        location={job.location}
        salaryDisplay={job.salaryDisplay}
        status={job.status}
        aiScore={job.aiScore}
        aiRecommendation={job.aiRecommendation}
        sourceBoard={job.sourceBoard}
        datePosted={job.datePosted}
      />
    </div>
  );
}

function KanbanColumn({
  status,
  jobs,
  label,
}: {
  status: string;
  jobs: JobItem[];
  label: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={cn(
        'flex min-w-[85vw] shrink-0 flex-col rounded-2xl bg-muted/40 p-3 snap-center sm:min-w-[70vw] md:min-w-0 md:w-full',
        isOver && 'ring-2 ring-primary/30'
      )}
    >
      <div className="sticky top-0 z-10 mb-3 flex items-center justify-between rounded-lg bg-muted/60 px-2 py-1.5 backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {jobs.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="flex min-h-[120px] flex-col gap-2"
      >
        <SortableContext
          items={jobs.map((j) => j.id)}
          strategy={verticalListSortingStrategy}
        >
          {jobs.map((job) => (
            <SortableJobCard key={job.id} job={job} />
          ))}
        </SortableContext>

        {jobs.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 p-6">
            <p className="text-xs text-muted-foreground">
              Drop jobs here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function JobKanban({ initialJobs }: JobKanbanProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null;

  const jobsByStatus = PIPELINE_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = jobs
        .filter((j) => j.status === status)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return acc;
    },
    {} as Record<string, JobItem[]>
  );

  const backlogJobs = jobs
    .filter((j) => j.status === 'backlog')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const draggedJobId = String(active.id);
      const targetId = String(over.id);

      // Determine target status — could be a column or a card
      let newStatus: string | undefined;
      if (PIPELINE_COLUMNS.includes(targetId as JobStatus)) {
        newStatus = targetId;
      } else {
        const targetJob = jobs.find((j) => j.id === targetId);
        if (targetJob) newStatus = targetJob.status;
      }

      if (!newStatus) return;

      const draggedJob = jobs.find((j) => j.id === draggedJobId);
      if (!draggedJob) return;

      // Update local state optimistically
      setJobs((prev) =>
        prev.map((j) =>
          j.id === draggedJobId ? { ...j, status: newStatus! } : j
        )
      );

      // Persist to server
      try {
        await updateJobSortOrder(
          draggedJobId,
          0,
          newStatus !== draggedJob.status ? newStatus : undefined
        );
      } catch {
        // Revert on failure
        setJobs((prev) =>
          prev.map((j) =>
            j.id === draggedJobId ? { ...j, status: draggedJob.status } : j
          )
        );
      }
    },
    [jobs]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Pipeline columns — horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scroll-pl-4 scrollbar-hide md:grid md:grid-cols-4 md:overflow-x-visible">
        {PIPELINE_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            jobs={jobsByStatus[status] ?? []}
            label={JOB_STATUS_LABELS[status]}
          />
        ))}
      </div>

      {/* Backlog section below */}
      {backlogJobs.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Not Right Now ({backlogJobs.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {backlogJobs.map((job) => (
              <JobCard
                key={job.id}
                id={job.id}
                title={job.title}
                company={job.company}
                location={job.location}
                salaryDisplay={job.salaryDisplay}
                status={job.status}
                aiScore={job.aiScore}
                aiRecommendation={job.aiRecommendation}
                sourceBoard={job.sourceBoard}
                datePosted={job.datePosted}
                className="opacity-70"
              />
            ))}
          </div>
        </div>
      )}

      <DragOverlay>
        {activeJob && (
          <div className="rotate-2 scale-105">
            <JobCard
              id={activeJob.id}
              title={activeJob.title}
              company={activeJob.company}
              location={activeJob.location}
              salaryDisplay={activeJob.salaryDisplay}
              status={activeJob.status}
              aiScore={activeJob.aiScore}
              aiRecommendation={activeJob.aiRecommendation}
              sourceBoard={activeJob.sourceBoard}
              datePosted={activeJob.datePosted}
              className="shadow-xl ring-2 ring-primary/30"
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
