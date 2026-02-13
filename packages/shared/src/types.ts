import type {
  JobStatus,
  JobBoard,
  AiRecommendation,
  EmploymentType,
  Priority,
  CommunicationType,
} from './constants';

/** A scraped job listing (raw from any board). Uses `string` for fields that come unvalidated from HTML. */
export interface ScrapedJob {
  externalId: string;
  title: string;
  company: string;
  description: string;
  locationRaw: string;
  sourceUrl: string;
  sourceBoard: JobBoard;
  salaryDisplay?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: 'annual' | 'hourly' | 'daily';
  employmentType?: string;
  category?: string;
  datePosted?: Date;
  expiresAt?: Date;
}

/** Search profile — configurable per user */
export interface SearchProfile {
  id: string;
  userId: string;
  name: string;
  keywords: string[];
  location: string;
  radiusKm: number;
  employmentTypes?: EmploymentType[];
  salaryMin?: number;
  salaryMax?: number;
  boards: JobBoard[];
  qualifications?: string;
  preferences?: string;
  isActive: boolean;
  scrapeIntervalHours: number;
}

/** A job listing with AI triage data */
export interface UserJobWithListing {
  userJob: {
    id: string;
    status: JobStatus;
    priority: Priority;
    interestLevel: number;
    aiScore?: number;
    aiRecommendation?: AiRecommendation;
    aiReasoning?: string;
    dateApplied?: Date;
    nextAction?: string;
    nextActionDate?: Date;
    notes?: string;
    tags: string[];
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  };
  listing: {
    id: string;
    title: string;
    company: string;
    description?: string;
    locationRaw?: string;
    suburb?: string;
    region?: string;
    state?: string;
    salaryDisplay?: string;
    salaryMin?: number;
    salaryMax?: number;
    employmentType?: string;
    sourceBoard: JobBoard;
    sourceUrl: string;
    datePosted?: Date;
    dateScraped: Date;
  };
}

/** AI triage result for a single job */
export interface AiTriageResult {
  score: number;
  recommendation: AiRecommendation;
  reasoning: string;
}

/** Scrape run summary */
export interface ScrapeRunSummary {
  id: string;
  board: JobBoard;
  status: 'running' | 'completed' | 'failed';
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
}

/** Communication log entry */
export interface CommunicationEntry {
  id: string;
  type: CommunicationType;
  content: string;
  occurredAt: Date;
}
