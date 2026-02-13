import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  index,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Better Auth Tables ─────────────────────────────────────────────────────
// These must match Better Auth's expected schema exactly.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_user_id_idx').on(table.userId)]
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)]
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)]
);

// ─── Search Profiles ────────────────────────────────────────────────────────
// Configurable per user. Each profile defines what to scrape + AI matching criteria.

export const searchProfiles = pgTable(
  'search_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keywords: text('keywords').array().notNull(),
    location: text('location').notNull(),
    radiusKm: integer('radius_km').notNull().default(20),
    employmentTypes: text('employment_types').array(),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    boards: text('boards').array().notNull(),
    /** Free-text: user's skills, experience, qualifications for AI matching */
    qualifications: text('qualifications'),
    /** Free-text: preferences, deal-breakers, what they're looking for */
    preferences: text('preferences'),
    isActive: boolean('is_active').notNull().default(true),
    /** Scrape interval in hours (default 48 = every 2 days) */
    scrapeIntervalHours: integer('scrape_interval_hours').notNull().default(48),
    lastScrapedAt: timestamp('last_scraped_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('search_profiles_user_id_idx').on(table.userId)]
);

// ─── Job Listings ───────────────────────────────────────────────────────────
// Raw scraped job data. Shared across users.

export const jobListings = pgTable(
  'job_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalId: text('external_id'),
    sourceBoard: text('source_board').notNull(),
    sourceUrl: text('source_url').notNull(),
    dateScraped: timestamp('date_scraped').defaultNow().notNull(),
    datePosted: timestamp('date_posted'),
    expiresAt: timestamp('expires_at'),
    title: text('title').notNull(),
    company: text('company').notNull(),
    description: text('description'),
    requirements: text('requirements'),
    locationRaw: text('location_raw'),
    suburb: text('suburb'),
    region: text('region'),
    state: text('state'),
    postcode: text('postcode'),
    isRemote: boolean('is_remote').default(false),
    isHybrid: boolean('is_hybrid').default(false),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryDisplay: text('salary_display'),
    salaryType: text('salary_type'),
    employmentType: text('employment_type'),
    category: text('category'),
    contentHash: text('content_hash'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique('job_listings_board_external_id').on(
      table.sourceBoard,
      table.externalId
    ),
    unique('job_listings_source_url').on(table.sourceUrl),
    index('job_listings_content_hash_idx').on(table.contentHash),
    index('job_listings_board_idx').on(table.sourceBoard),
    index('job_listings_posted_idx').on(table.datePosted),
  ]
);

// ─── User Jobs (Pipeline) ──────────────────────────────────────────────────
// Each user's relationship with a job listing. Includes AI triage data.

export const userJobs = pgTable(
  'user_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    jobListingId: uuid('job_listing_id')
      .notNull()
      .references(() => jobListings.id, { onDelete: 'cascade' }),
    searchProfileId: uuid('search_profile_id').references(
      () => searchProfiles.id,
      { onDelete: 'set null' }
    ),
    status: text('status').notNull().default('recommended'),
    statusChangedAt: timestamp('status_changed_at').defaultNow().notNull(),
    /** AI triage score 0-100 */
    aiScore: integer('ai_score'),
    /** AI recommendation: recommended, maybe, not_recommended */
    aiRecommendation: text('ai_recommendation'),
    /** AI's explanation for the score */
    aiReasoning: text('ai_reasoning'),
    aiTriagedAt: timestamp('ai_triaged_at'),
    dateApplied: timestamp('date_applied'),
    resumeVersion: text('resume_version'),
    coverLetter: text('cover_letter'),
    priority: text('priority').default('medium'),
    interestLevel: integer('interest_level').default(0),
    tags: text('tags').array().default([]),
    nextAction: text('next_action'),
    nextActionDate: timestamp('next_action_date'),
    notes: text('notes'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique('user_jobs_user_listing').on(table.userId, table.jobListingId),
    index('user_jobs_user_status_idx').on(table.userId, table.status),
    index('user_jobs_next_action_idx').on(table.nextActionDate),
  ]
);

// ─── Communications ─────────────────────────────────────────────────────────

export const communications = pgTable(
  'communications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userJobId: uuid('user_job_id')
      .notNull()
      .references(() => userJobs.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    content: text('content').notNull(),
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('communications_user_job_idx').on(table.userJobId)]
);

// ─── Scrape Runs ────────────────────────────────────────────────────────────

export const scrapeRuns = pgTable(
  'scrape_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    board: text('board').notNull(),
    searchProfileId: uuid('search_profile_id').references(
      () => searchProfiles.id
    ),
    status: text('status').notNull().default('running'),
    jobsFound: integer('jobs_found').default(0),
    jobsNew: integer('jobs_new').default(0),
    jobsUpdated: integer('jobs_updated').default(0),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    durationMs: integer('duration_ms'),
  },
  (table) => [
    index('scrape_runs_board_idx').on(table.board, table.startedAt),
  ]
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  searchProfiles: many(searchProfiles),
  userJobs: many(userJobs),
  sessions: many(session),
  accounts: many(account),
}));

export const searchProfileRelations = relations(
  searchProfiles,
  ({ one, many }) => ({
    user: one(user, {
      fields: [searchProfiles.userId],
      references: [user.id],
    }),
    userJobs: many(userJobs),
    scrapeRuns: many(scrapeRuns),
  })
);

export const jobListingRelations = relations(jobListings, ({ many }) => ({
  userJobs: many(userJobs),
}));

export const userJobRelations = relations(userJobs, ({ one, many }) => ({
  user: one(user, { fields: [userJobs.userId], references: [user.id] }),
  jobListing: one(jobListings, {
    fields: [userJobs.jobListingId],
    references: [jobListings.id],
  }),
  searchProfile: one(searchProfiles, {
    fields: [userJobs.searchProfileId],
    references: [searchProfiles.id],
  }),
  communications: many(communications),
}));

export const communicationRelations = relations(communications, ({ one }) => ({
  userJob: one(userJobs, {
    fields: [communications.userJobId],
    references: [userJobs.id],
  }),
}));

export const scrapeRunRelations = relations(scrapeRuns, ({ one }) => ({
  searchProfile: one(searchProfiles, {
    fields: [scrapeRuns.searchProfileId],
    references: [searchProfiles.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));
