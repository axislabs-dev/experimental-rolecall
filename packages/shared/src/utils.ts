import { createHash } from 'crypto';

/**
 * Normalize text for deduplication: lowercase, collapse whitespace, trim.
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Generate a content hash for cross-board deduplication.
 * Hash of: normalize(title + company + first 200 chars of description)
 */
export function generateContentHash(
  title: string,
  company: string,
  description: string
): string {
  const normalized = normalizeText(
    `${title}|${company}|${description.slice(0, 200)}`
  );
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Parse Australian salary strings into min/max numbers.
 *
 * Handles formats like:
 * - "$55,000 - $65,000"
 * - "$55,000 - $65,000 + super"
 * - "$30 - $35 per hour"
 * - "$55,000 p.a."
 * - "Competitive salary"
 */
export function parseSalary(raw: string): {
  min?: number;
  max?: number;
  type: 'annual' | 'hourly' | 'daily' | 'unknown';
  display: string;
} {
  const display = raw.trim();
  const cleaned = display.replace(/[,$]/g, '').toLowerCase();

  // Detect salary type
  let type: 'annual' | 'hourly' | 'daily' | 'unknown' = 'unknown';
  if (
    cleaned.includes('per hour') ||
    cleaned.includes('p/h') ||
    cleaned.includes('/hr')
  ) {
    type = 'hourly';
  } else if (
    cleaned.includes('per day') ||
    cleaned.includes('p/d') ||
    cleaned.includes('/day')
  ) {
    type = 'daily';
  } else if (
    cleaned.includes('per annum') ||
    cleaned.includes('p.a.') ||
    cleaned.includes('pa ')
  ) {
    type = 'annual';
  }

  // Extract numbers
  const numbers = cleaned.match(/\d+\.?\d*/g)?.map(Number) ?? [];

  if (numbers.length === 0) {
    return { display, type };
  }

  // If numbers are small (< 200), likely hourly
  if (type === 'unknown' && numbers[0] < 200) {
    type = 'hourly';
  } else if (type === 'unknown' && numbers[0] >= 20000) {
    type = 'annual';
  }

  return {
    min: numbers[0],
    max: numbers.length > 1 ? numbers[1] : undefined,
    type,
    display,
  };
}

/**
 * Format a date for display in AU format.
 */
export function formatDateAU(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Relative time string (e.g., "2 days ago", "Just now").
 */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDateAU(date);
}
