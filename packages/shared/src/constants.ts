/**
 * Pipeline stages for user job tracking.
 *
 * Flow: Scraper → AI Triage → recommended/backlog → applied → interview → offer
 */
export const JOB_STATUSES = {
  /** AI says this is worth applying to — queued for user action */
  RECOMMENDED: 'recommended',
  /** AI says not a great fit — parked with explanation */
  BACKLOG: 'backlog',
  /** User submitted an application */
  APPLIED: 'applied',
  /** Interview scheduled or completed */
  INTERVIEW: 'interview',
  /** Offer received */
  OFFER: 'offer',
  /** Application rejected */
  REJECTED: 'rejected',
  /** User withdrew voluntarily */
  WITHDRAWN: 'withdrawn',
} as const;

export type JobStatus = (typeof JOB_STATUSES)[keyof typeof JOB_STATUSES];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  recommended: 'Recommended',
  backlog: 'Not Right Now',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

/** Kanban columns shown in the pipeline view (order matters) */
export const PIPELINE_COLUMNS: JobStatus[] = [
  'recommended',
  'applied',
  'interview',
  'offer',
];

/** AI recommendation levels */
export const AI_RECOMMENDATIONS = {
  RECOMMENDED: 'recommended',
  MAYBE: 'maybe',
  NOT_RECOMMENDED: 'not_recommended',
} as const;

export type AiRecommendation =
  (typeof AI_RECOMMENDATIONS)[keyof typeof AI_RECOMMENDATIONS];

/** Supported job boards */
export const JOB_BOARDS = {
  SMARTJOBS: 'smartjobs',
  SCC_CAREERS: 'scc-careers',
  ETHICAL_JOBS: 'ethical-jobs',
  INDEED: 'indeed',
  JORA: 'jora',
  SEEK: 'seek',
} as const;

export type JobBoard = (typeof JOB_BOARDS)[keyof typeof JOB_BOARDS];

export const JOB_BOARD_LABELS: Record<JobBoard, string> = {
  smartjobs: 'SmartJobs QLD',
  'scc-careers': 'SCC Careers',
  'ethical-jobs': 'EthicalJobs',
  indeed: 'Indeed AU',
  jora: 'Jora',
  seek: 'SEEK',
};

/** Employment types (AU standard) */
export const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Casual',
  'Contract',
  'Temporary',
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

/** Priority levels for user jobs */
export const PRIORITIES = ['high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Communication log entry types */
export const COMMUNICATION_TYPES = [
  'email',
  'phone',
  'interview',
  'note',
] as const;
export type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

/** Default scrape interval in hours (every 2 days) */
export const DEFAULT_SCRAPE_INTERVAL_HOURS = 48;

/** Default search radius in km */
export const DEFAULT_SEARCH_RADIUS_KM = 20;
