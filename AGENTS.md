# AGENTS.md — JobFlow Knowledge Base

> This file contains project context, conventions, and patterns for AI agents working on this codebase.

---

## Project Overview

**JobFlow** is a mobile-first job search CRM built for Sarah (and potentially Roger). It scrapes Australian job boards, fills a pipeline with real listings, and lets users triage/track applications through a kanban workflow.

**Primary user**: Sarah — mother returning to workforce, Sunshine Coast QLD, admin/receptionist roles. Uses iPhone 11. Not technical. Needs warm, simple UX.

**Deployed on**: Railway (Pro plan). PostgreSQL + Redis + Next.js web + BullMQ worker.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 15 (App Router) |
| Language | TypeScript | 5.x (strict mode) |
| Auth | Better Auth | latest |
| Database | PostgreSQL | 16 |
| ORM | Drizzle ORM | latest |
| UI Components | shadcn/ui | latest |
| Styling | Tailwind CSS | v4 |
| Drag & Drop | @dnd-kit/core | latest |
| Job Queue | BullMQ | latest |
| Scraping | Crawlee (Playwright + Cheerio modes) | latest |
| Validation | Zod | latest |
| Forms | React Hook Form | latest |
| Monorepo | pnpm workspaces + Turborepo | latest |
| Proxy | Webshare (residential) | - |

---

## Repository Structure

```
apps/
  web/          → Next.js 15 frontend + API routes
  worker/       → BullMQ consumer + Crawlee scrapers
packages/
  database/     → Drizzle schema, client, queries, migrations
  shared/       → Types, constants, utilities shared between apps
```

**Monorepo tool**: pnpm workspaces with Turborepo for build orchestration.

---

## Conventions

### Code Style

- **TypeScript strict mode** everywhere. No `any`, no `@ts-ignore`, no `@ts-expect-error`.
- **Server Components by default**. Only use `'use client'` when the component needs interactivity (click handlers, state, effects).
- **Server Actions** for mutations. No API routes for CRUD — use `'use server'` actions.
- **API routes** only for: Better Auth handler, webhook receivers, scraper trigger endpoints.
- **Zod schemas** for all form validation and API input parsing. Colocate schemas in `lib/validations/`.
- **Drizzle queries** live in `packages/database/src/queries/`. Never write raw SQL in components.
- **No barrel exports** (`index.ts` re-exporting everything). Import directly from the source file.

### Naming

- **Files**: kebab-case (`job-card.tsx`, `base-scraper.ts`)
- **Components**: PascalCase (`JobCard`, `KanbanColumn`)
- **Functions**: camelCase (`getJobsByStatus`, `scrapeIndeed`)
- **Database tables**: snake_case (`job_listings`, `user_jobs`)
- **Database columns**: snake_case (`date_posted`, `salary_min`)
- **Drizzle schema objects**: camelCase (`jobListings`, `userJobs`)
- **Environment variables**: SCREAMING_SNAKE_CASE (`DATABASE_URL`, `BETTER_AUTH_SECRET`)
- **CSS classes**: Tailwind utility classes only. No custom CSS files unless absolutely necessary.

### Component Patterns

```tsx
// Server Component (default) — no directive needed
export default async function JobsPage() {
  const jobs = await getJobsByStatus('interested');
  return <JobKanban initialJobs={jobs} />;
}

// Client Component — explicit directive
'use client';
export function JobKanban({ initialJobs }: { initialJobs: Job[] }) {
  // Interactive logic here
}

// Server Action — for mutations
'use server';
export async function updateJobStatus(jobId: string, status: string) {
  await db.update(userJobs).set({ status }).where(eq(userJobs.id, jobId));
  revalidatePath('/jobs');
}
```

### Mobile-First Design Rules

- **Breakpoints**: Design for 414px (iPhone 11) first, then scale up.
  - `xs`: 375px (iPhone SE)
  - `sm`: 414px (iPhone 11 — primary target)
  - `md`: 768px (tablet)
  - `lg`: 1024px (desktop)
- **Touch targets**: 48px minimum height/width for all interactive elements.
- **Font size**: 16px minimum on inputs (prevents iOS zoom).
- **Bottom navigation**: Primary nav is a bottom tab bar (thumb-friendly zone).
- **No hover-only interactions**: Everything must work with tap/touch.

### Authentication Pattern

```tsx
// lib/auth.ts (server-only)
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: { enabled: true },
});

// lib/auth-client.ts (client-side)
import { createAuthClient } from 'better-auth/react';
export const authClient = createAuthClient();

// app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
export const { POST, GET } = toNextJsHandler(auth);

// Protecting routes: app/(app)/layout.tsx
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  return <>{children}</>;
}
```

### Database Pattern

```tsx
// packages/database/src/schema.ts
import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';

export const jobListings = pgTable('job_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  company: text('company').notNull(),
  sourceBoard: text('source_board').notNull(),
  sourceUrl: text('source_url').notNull().unique(),
  // ... see PLAN.md for full schema
});

// packages/database/src/queries/jobs.ts
import { db } from '../client';
import { jobListings, userJobs } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export async function getJobsForUser(userId: string, status?: string) {
  return db
    .select()
    .from(userJobs)
    .innerJoin(jobListings, eq(userJobs.jobListingId, jobListings.id))
    .where(
      and(
        eq(userJobs.userId, userId),
        status ? eq(userJobs.status, status) : undefined
      )
    )
    .orderBy(desc(userJobs.updatedAt));
}
```

---

## Scraper Architecture

### Adding a New Scraper

Every scraper extends `BaseScraper` and implements three methods:

```typescript
// apps/worker/src/scrapers/[board-name].scraper.ts
import { BaseScraper, ScrapedJob } from './base-scraper';

export class MyBoardScraper extends BaseScraper {
  board = 'my-board';
  
  buildSearchUrl(profile: SearchProfile): string {
    // Return the search URL for this board given keywords/location/radius
  }
  
  async parseJobList(context: CrawlingContext): Promise<ScrapedJob[]> {
    // Extract job cards from search results page
  }
  
  async parseJobDetail(context: CrawlingContext): Promise<Partial<ScrapedJob>> {
    // Extract full details from individual job page
  }
}
```

Then register in the queue processor:
```typescript
// apps/worker/src/queues/processors/index.ts
import { MyBoardScraper } from '../../scrapers/my-board.scraper';
scraperRegistry.set('my-board', new MyBoardScraper());
```

### Scraper Difficulty Tiers

| Tier | Boards | Crawler | Proxy | Notes |
|------|--------|---------|-------|-------|
| **Easy** | SmartJobs QLD, SCC Careers, EthicalJobs | CheerioCrawler | None | Simple HTML, government/NFP sites |
| **Medium** | Indeed AU, Jora | PlaywrightCrawler + stealth | Webshare residential | Moderate anti-bot, JS-rendered |
| **Hard** | SEEK | PlaywrightCrawler + full stealth | Webshare residential (AU sticky sessions) | Aggressive anti-bot, needs AU IPs |
| **Skip** | LinkedIn | - | - | Enterprise-grade anti-bot. Rely on aggregators instead. |

### Proxy Configuration

```typescript
// Worker environment
WEBSHARE_PROXY_HOST=...
WEBSHARE_PROXY_PORT=...
WEBSHARE_PROXY_USER=...
WEBSHARE_PROXY_PASS=...

// Usage in scraper
const proxyConfig = new ProxyConfiguration({
  proxyUrls: [
    `http://${WEBSHARE_PROXY_USER}:${WEBSHARE_PROXY_PASS}@${WEBSHARE_PROXY_HOST}:${WEBSHARE_PROXY_PORT}`,
  ],
});
```

### Deduplication

1. **Same-board**: Unique constraint on `(source_board, external_id)`.
2. **Cross-board**: SHA-256 hash of `normalize(title + company + first_200_chars_description)` stored in `content_hash`.
3. **URL**: Unique constraint on `source_url`.

When a duplicate is detected, update `updated_at` timestamp but don't create a new row.

---

## Railway Deployment

### Services

| Service | Directory | Port | Notes |
|---------|-----------|------|-------|
| web | `apps/web` | 3000 | Next.js, public-facing |
| worker | `apps/worker` | - | No port, BullMQ consumer |
| postgres | Railway template | 5432 | Private network only |
| redis | Railway template | 6379 | Private network only |

### Key Railway Rules

1. **Always use private networking** (`DATABASE_URL` not `DATABASE_PUBLIC_URL`). Private = free. Public = $0.05/GB egress.
2. **PgBouncer required** for Next.js + PostgreSQL. Prevents connection exhaustion.
3. **Watch paths** in `railway.json` prevent unnecessary rebuilds.
4. **Worker uses `restartPolicyType: ALWAYS`** — auto-restarts if it crashes.

### Migrations

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations (run against Railway Postgres)
pnpm drizzle-kit migrate

# Or via Railway CLI
railway run pnpm drizzle-kit migrate
```

---

## UX Design Direction

### Aesthetic

Think **Downton Abbey study** meets **modern mobile app**:
- **Colors**: Sage green (#9CAF88), warm cream (#FFF8F0), muted gold (#C9A96E), soft charcoal (#3D3D3D)
- **Typography**: Clean, readable. System fonts for performance. 16px base.
- **Rounded corners**: Generous border-radius (12-16px) on cards.
- **Shadows**: Soft, warm shadows. Not harsh drop shadows.
- **Icons**: Lucide icons (bundled with shadcn/ui). Warm, friendly.

### Language Guidelines

| Instead of | Use |
|-----------|-----|
| Pipeline | My Jobs |
| Triage | Discover |
| CRM | Job Tracker |
| Status: New | "Just found!" |
| Ingest | "Found X new jobs" |
| Query | Search |
| Execute scrape | "Looking for new jobs..." |

### Key Screens

1. **Discover** — Swipe-through card stack of new jobs. Primary daily interaction.
2. **My Jobs** — Kanban board (Interested → Applied → Interview → Offer). Pipeline tracker.
3. **Job Detail** — Full listing with notes, status, reminders, communication log.
4. **Settings** — Search criteria, account, scraper status.

---

## Testing Strategy

### Unit Tests
- Drizzle queries (use test database)
- Zod validation schemas
- Salary/location parsers
- Deduplication logic

### Integration Tests
- Better Auth login/signup flow
- Server actions (CRUD operations)
- Scraper parsers (against saved HTML snapshots)

### E2E Tests (stretch)
- Playwright browser tests for core flows
- Mobile viewport (414x896)

---

## Common Tasks

### Run the app locally
```bash
pnpm install
pnpm dev              # Starts web + worker in parallel (via Turborepo)
```

### Run just the web app
```bash
pnpm --filter web dev
```

### Run just the worker
```bash
pnpm --filter worker dev
```

### Add a shadcn/ui component
```bash
pnpm --filter web dlx shadcn@latest add button card dialog
```

### Generate a migration
```bash
pnpm --filter database drizzle-kit generate
```

### Deploy to Railway
```bash
# Push to main branch → Railway auto-deploys
git push origin main

# Or manual deploy via Railway CLI
railway up
```

---

## Environment Variables Reference

| Variable | Service | Required | Description |
|----------|---------|----------|-------------|
| `DATABASE_URL` | web, worker | Yes | PostgreSQL connection string (private network) |
| `REDIS_URL` | web, worker | Yes | Redis connection string (private network) |
| `BETTER_AUTH_SECRET` | web | Yes | Auth encryption secret (generate with `openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | web | Yes | Public URL of the app (e.g., `https://jobflow.up.railway.app`) |
| `WEBSHARE_PROXY_HOST` | worker | Yes | Webshare proxy hostname |
| `WEBSHARE_PROXY_PORT` | worker | Yes | Webshare proxy port |
| `WEBSHARE_PROXY_USER` | worker | Yes | Webshare username |
| `WEBSHARE_PROXY_PASS` | worker | Yes | Webshare password |
