'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  JOB_BOARD_LABELS,
  EMPLOYMENT_TYPES,
  type JobBoard,
} from '@jobflow/shared/constants';
import { cn } from '@/lib/utils';

interface SearchProfileFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    name?: string;
    keywords?: string[];
    location?: string;
    radiusKm?: number;
    employmentTypes?: string[] | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    boards?: string[];
    qualifications?: string | null;
    preferences?: string | null;
    scrapeIntervalHours?: number;
  };
  submitLabel?: string;
}

const boardEntries = Object.entries(JOB_BOARD_LABELS) as [JobBoard, string][];

export function SearchProfileForm({
  action,
  defaultValues,
  submitLabel = 'Save search',
}: SearchProfileFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [radiusKm, setRadiusKm] = useState(defaultValues?.radiusKm ?? 20);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(formData: FormData) {
    setError('');
    setSubmitting(true);
    try {
      await action(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-col gap-6"
    >
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Search name</Label>
        <Input
          id="name"
          name="name"
          placeholder='e.g. "Admin jobs Sunshine Coast"'
          required
          defaultValue={defaultValues?.name ?? ''}
        />
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <Label htmlFor="keywords">Keywords</Label>
        <Input
          id="keywords"
          name="keywords"
          placeholder="receptionist, office admin, data entry"
          required
          defaultValue={defaultValues?.keywords?.join(', ') ?? ''}
        />
        <p className="text-xs text-muted-foreground">
          Separate with commas. We&apos;ll search for each one.
        </p>
      </div>

      {/* Location + Radius */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            placeholder="Baringa, QLD"
            required
            defaultValue={defaultValues?.location ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="radiusKm">
            Radius: <strong>{radiusKm}km</strong>
          </Label>
          <input
            id="radiusKm"
            name="radiusKm"
            type="range"
            min={1}
            max={200}
            step={1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1km</span>
            <span>200km</span>
          </div>
        </div>
      </div>

      {/* Employment types */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium leading-none">Employment type</legend>
        <div className="flex flex-wrap gap-2">
          {EMPLOYMENT_TYPES.map((type) => {
            const defaultChecked =
              defaultValues?.employmentTypes?.includes(type) ?? false;
            return (
              <label
                key={type}
                className={cn(
                  'flex min-h-[48px] cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all duration-200',
                  'has-[:checked]:border-primary has-[:checked]:bg-primary/5 active:bg-muted'
                )}
              >
                <input
                  type="checkbox"
                  name="employmentTypes"
                  value={type}
                  defaultChecked={defaultChecked}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                {type}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Salary range */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="salaryMin">Min salary (annual)</Label>
          <Input
            id="salaryMin"
            name="salaryMin"
            type="number"
            placeholder="e.g. 50000"
            min={0}
            defaultValue={defaultValues?.salaryMin ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salaryMax">Max salary (annual)</Label>
          <Input
            id="salaryMax"
            name="salaryMax"
            type="number"
            placeholder="e.g. 80000"
            min={0}
            defaultValue={defaultValues?.salaryMax ?? ''}
          />
        </div>
      </div>

      {/* Job boards */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium leading-none">Which job boards?</legend>
        <div className="flex flex-wrap gap-2">
          {boardEntries.map(([board, label]) => {
            const defaultChecked =
              defaultValues?.boards?.includes(board) ?? false;
            return (
              <label
                key={board}
                className={cn(
                  'flex min-h-[48px] cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all duration-200',
                  'has-[:checked]:border-primary has-[:checked]:bg-primary/5 active:bg-muted'
                )}
              >
                <input
                  type="checkbox"
                  name="boards"
                  value={board}
                  defaultChecked={defaultChecked}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Qualifications */}
      <div className="space-y-2">
        <Label htmlFor="qualifications">Your qualifications &amp; experience</Label>
        <Textarea
          id="qualifications"
          name="qualifications"
          placeholder="Tell us about your background, skills, and experience. This helps our AI match you better."
          rows={4}
          defaultValue={defaultValues?.qualifications ?? ''}
        />
      </div>

      {/* Preferences */}
      <div className="space-y-2">
        <Label htmlFor="preferences">Preferences &amp; deal-breakers</Label>
        <Textarea
          id="preferences"
          name="preferences"
          placeholder="What matters to you? e.g. close to home, flexible hours, no weekend work..."
          rows={3}
          defaultValue={defaultValues?.preferences ?? ''}
        />
      </div>

      {/* Scrape interval */}
      <div className="space-y-2">
        <Label htmlFor="scrapeIntervalHours">Check for new jobs every</Label>
        <div className="flex items-center gap-3">
          <Input
            id="scrapeIntervalHours"
            name="scrapeIntervalHours"
            type="number"
            min={1}
            max={168}
            defaultValue={defaultValues?.scrapeIntervalHours ?? 48}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">hours</span>
        </div>
      </div>

      <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full active:scale-[0.98]">
        {submitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
