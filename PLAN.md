# JobFlow — Job Search CRM

**Codename**: JobFlow
**Primary User**: Sarah (returning to workforce, admin/receptionist roles, Sunshine Coast QLD)
**Secondary User**: Roger (developer, potential future use)
**Device**: iPhone 11 (414x896px) — mobile-first, desktop-capable

---

## 1. Vision

A personal job search CRM that automatically fills a pipeline with real job listings scraped from Australian job boards. Sarah opens the app on her phone, sees fresh jobs every morning, swipes through them like Tinder for jobs, marks ones she likes, and tracks her applications from "Interested" through to "Offer". No more manually searching 7 different sites.

**Core Loop**:
```
Scrapers find jobs → Pipeline fills automatically → Sarah triages → Applies → Tracks progress
```

---

## 2. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | Next.js 15 (App Router) | Server-first, React 19, Railway-optimized |
| **Auth** | Better Auth | Self-hosted ($0), 5 DB tables, Lucia's successor, TypeScript-first |
| **Database** | PostgreSQL (Railway) | Managed, private networking, PgBouncer for pooling |
| **ORM** | Drizzle ORM | Faster cold starts than Prisma, SQL-first, smaller bundle (~10KB vs ~90KB) |
| **UI** | shadcn/ui + Tailwind CSS v4 | Own the code, mobile-first, accessible |
| **Drag & Drop** | @dnd-kit/core | Mobile touch support, accessible, active (react-beautiful-dnd is deprecated) |
| **Job Queue** | BullMQ + Redis | Retry logic, scheduling, monitoring via BullBoard |
| **Scraping** | Crawlee + Playwright | Production scraping framework by Apify. Built-in proxy rotation, session management, retry |
| **Proxies** | Webshare (residential) | Residential proxy pool for scraping. Affordable, reliable, good AU IP coverage |
| **Validation** | Zod | Runtime + static type safety, form validation |
| **Forms** | React Hook Form | Performant, uncontrolled inputs, Zod integration |
| **Deploy** | Railway (Pro plan) | Monorepo support, managed Postgres, Redis, cron, ~$30-50/mo |

### Stack Justifications

**Why Better Auth over NextAuth v5?**
- 5 tables vs 30+. Simpler mental model.
- Built for App Router from day one (NextAuth v5 still has rough edges).
- Plugin system: username/password, magic link, 2FA — all opt-in.
- Lucia (deprecated March 2025) officially recommends Better Auth as successor.
- Self-hosted = $0 on Railway. Clerk would cost $25+/mo.

**Why Drizzle over Prisma?**
- 50ms cold start vs 200ms (Railway serverless matters).
- SQL-first = better for complex job search queries with filters.
- 10KB bundle vs 90KB. Faster deployments.
- Native connection pooling — no Data Proxy needed.
- Trade-off: requires SQL knowledge (Roger has it).

**Why Crawlee over raw Playwright?**
- Built-in proxy rotation, request queue, session management, retry with backoff.
- Handles anti-bot fingerprinting out of the box.
- Can switch between CheerioCrawler (fast, for simple sites) and PlaywrightCrawler (for JS-rendered/anti-bot sites) with same API.
- TypeScript-native, maintained by Apify.

**Why Webshare for proxies?**
- Affordable residential proxy pool with good Australian IP coverage.
- Simple API — username/password auth, supports HTTP and SOCKS5.
- Rotating and sticky session modes (sticky for maintaining sessions on SEEK/Indeed).
- Single provider simplifies configuration vs juggling multiple proxy services.

**Why BullMQ over Railway Cron?**
- Railway Cron is limited to 5-min minimum intervals and simple exit-on-complete tasks.
- BullMQ gives: retry with exponential backoff, job prioritization, rate limiting, monitoring dashboard (BullBoard), horizontal scaling.
- Scraping needs retry logic — sites go down, proxies fail, CAPTCHAs appear.
- BullBoard gives Sarah (and Roger) visibility into scraper health.

---

## 3. Architecture

```
                    ┌──────────────────────────────────┐
                    │         Railway Project           │
                    └──────────────────────────────────┘

 ┌─────────────────┐    private     ┌──────────────────┐
 │   Next.js App   │◄─────────────►│    PostgreSQL     │
 │   (Web + API)   │    network     │   + PgBouncer     │
 └────────┬────────┘                └──────────────────┘
          │
          │ enqueue scrape jobs
          ▼
 ┌─────────────────┐    private     ┌──────────────────┐
 │      Redis      │◄─────────────►│   Worker Service  │
 │    (BullMQ)     │    network     │   (Scrapers)      │
 └─────────────────┘                └────────┬─────────┘
                                             │
          ┌──────────────────────────────────┘
          │ Crawlee + Playwright
          ▼
 ┌────────────────────────────────────────────────────┐
 │              Proxy Rotation Layer                   │
 │          Webshare Residential Proxies               │
 └────────────────────────────────────────────────────┘
          │
          ▼
 ┌────────┬────────┬────────┬──────────┬───────────┬──────────┐
 │ Indeed │  SEEK  │  Jora  │ SmartJobs│ Ethical   │   SCC    │
 │   AU   │        │        │   QLD    │   Jobs    │ Careers  │
 └────────┴────────┴────────┴──────────┴───────────┴──────────┘
```

### Monorepo Structure

```
job-search/
├── apps/
│   ├── web/                          # Next.js 15 app
│   │   ├── app/
│   │   │   ├── (marketing)/          # Public: landing, login
│   │   │   │   ├── page.tsx
│   │   │   │   └── login/page.tsx
│   │   │   ├── (app)/               # Authenticated routes
│   │   │   │   ├── layout.tsx        # Auth guard + bottom nav
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx      # Stats overview
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── page.tsx      # Pipeline/kanban view
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx  # Job detail + actions
│   │   │   │   ├── discover/
│   │   │   │   │   └── page.tsx      # Tinder-style swipe triage
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx      # Profile, search criteria, scraper config
│   │   │   └── api/
│   │   │       ├── auth/[...all]/route.ts  # Better Auth handler
│   │   │       └── scraper/
│   │   │           └── trigger/route.ts    # Manual scrape trigger
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── job-card.tsx
│   │   │   ├── job-kanban.tsx
│   │   │   ├── job-swiper.tsx        # Tinder-style card swipe
│   │   │   └── bottom-nav.tsx        # Mobile navigation
│   │   ├── lib/
│   │   │   ├── auth.ts              # Better Auth config
│   │   │   ├── auth-client.ts       # Client-side auth
│   │   │   └── validations/
│   │   │       └── job.ts           # Zod schemas
│   │   ├── railway.json
│   │   └── package.json
│   │
│   └── worker/                       # BullMQ worker service
│       ├── src/
│       │   ├── index.ts             # Worker entry point
│       │   ├── queues/
│       │   │   ├── scrape-queue.ts  # Queue definitions
│       │   │   └── processors/
│       │   │       ├── indeed.ts
│       │   │       ├── seek.ts
│       │   │       ├── jora.ts
│       │   │       ├── smartjobs.ts
│       │   │       ├── ethical-jobs.ts
│       │   │       └── scc-careers.ts
│       │   └── scrapers/
│       │       ├── base-scraper.ts  # Abstract base with shared logic
│       │       ├── indeed.scraper.ts
│       │       ├── seek.scraper.ts
│       │       ├── jora.scraper.ts
│       │       ├── smartjobs.scraper.ts
│       │       ├── ethical-jobs.scraper.ts
│       │       └── scc-careers.scraper.ts
│       ├── railway.json
│       └── package.json
│
├── packages/
│   ├── database/                     # Shared DB schema + client
│   │   ├── src/
│   │   │   ├── client.ts           # Drizzle client
│   │   │   ├── schema.ts           # All table definitions
│   │   │   ├── queries/            # Reusable query functions
│   │   │   │   ├── jobs.ts
│   │   │   │   ├── users.ts
│   │   │   │   └── scrape-runs.ts
│   │   │   └── migrations/         # SQL migration files
│   │   └── package.json
│   │
│   └── shared/                      # Shared types, utils, constants
│       ├── src/
│       │   ├── types.ts             # Shared TypeScript types
│       │   ├── constants.ts         # Pipeline stages, job boards, etc.
│       │   └── utils.ts             # Shared utilities
│       └── package.json
│
├── drizzle.config.ts                # Drizzle migration config
├── package.json                     # Root workspace (pnpm)
├── pnpm-workspace.yaml
├── turbo.json                       # Turborepo config
├── PLAN.md
└── AGENTS.md
```

---

## 4. Database Schema

### Core Tables

```sql
-- Users (managed by Better Auth — 5 tables auto-created)
-- user, session, account, verification, rate_limit

-- Search Profiles (what to scrape for each user)
CREATE TABLE search_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                    -- "Sarah's Admin Search"
  keywords      TEXT[] NOT NULL,                  -- ['administration', 'receptionist', 'office', 'data entry']
  location      TEXT NOT NULL,                    -- 'Baringa, QLD'
  radius_km     INTEGER NOT NULL DEFAULT 20,
  employment_types TEXT[],                        -- ['Full-time', 'Part-time']
  salary_min    INTEGER,                          -- Annual AUD
  salary_max    INTEGER,
  boards        TEXT[] NOT NULL,                  -- ['indeed', 'seek', 'jora', 'smartjobs']
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job Listings (scraped jobs)
CREATE TABLE job_listings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source tracking
  external_id       TEXT,                         -- Board's job ID (for dedup)
  source_board      TEXT NOT NULL,                -- 'indeed', 'seek', 'jora', etc.
  source_url        TEXT NOT NULL,                -- UNIQUE per board
  date_scraped      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_posted       TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  
  -- Job details
  title             TEXT NOT NULL,
  company           TEXT NOT NULL,
  description       TEXT,                         -- Full job description HTML/text
  requirements      TEXT,
  
  -- Location (AU-specific)
  location_raw      TEXT,                         -- Raw string from board
  suburb            TEXT,
  region            TEXT,                         -- 'Sunshine Coast'
  state             TEXT,                         -- 'QLD'
  postcode          TEXT,
  is_remote         BOOLEAN DEFAULT false,
  is_hybrid         BOOLEAN DEFAULT false,
  
  -- Compensation (AU format)
  salary_min        INTEGER,                      -- Annual AUD
  salary_max        INTEGER,
  salary_display    TEXT,                         -- "$55,000 - $65,000 + super"
  salary_type       TEXT,                         -- 'annual', 'hourly', 'daily'
  
  -- Classification
  employment_type   TEXT,                         -- 'Full-time', 'Part-time', 'Casual', 'Contract'
  category          TEXT,                         -- 'Administration', 'Reception', etc.
  
  -- Dedup
  content_hash      TEXT,                         -- Hash of title+company+description for cross-board dedup
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(source_board, external_id),
  UNIQUE(source_url)
);

-- User Job Applications (the pipeline)
CREATE TABLE user_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  job_listing_id    UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  search_profile_id UUID REFERENCES search_profiles(id) ON DELETE SET NULL,
  
  -- Pipeline status
  status            TEXT NOT NULL DEFAULT 'new',  -- new, interested, applied, interview, offer, rejected, withdrawn
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Application details
  date_applied      TIMESTAMPTZ,
  resume_version    TEXT,                         -- Which resume was used
  cover_letter      TEXT,                         -- Cover letter text or reference
  
  -- Triage metadata
  priority          TEXT DEFAULT 'medium',        -- high, medium, low
  interest_level    INTEGER DEFAULT 0,            -- 0-5 stars
  tags              TEXT[],                        -- User-defined tags
  
  -- Follow-up
  next_action       TEXT,                         -- "Call to follow up"
  next_action_date  DATE,
  
  -- Notes & communication
  notes             TEXT,
  
  -- Sort order within kanban column
  sort_order        INTEGER NOT NULL DEFAULT 0,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, job_listing_id)                -- One pipeline entry per user per job
);

-- Communication log entries
CREATE TABLE communications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_job_id     UUID NOT NULL REFERENCES user_jobs(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,                  -- 'email', 'phone', 'interview', 'note'
  content         TEXT NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scrape run tracking (monitoring)
CREATE TABLE scrape_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board           TEXT NOT NULL,
  search_profile_id UUID REFERENCES search_profiles(id),
  status          TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
  jobs_found      INTEGER DEFAULT 0,
  jobs_new        INTEGER DEFAULT 0,               -- New jobs not seen before
  jobs_updated    INTEGER DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER
);

-- Indexes
CREATE INDEX idx_job_listings_board ON job_listings(source_board);
CREATE INDEX idx_job_listings_content_hash ON job_listings(content_hash);
CREATE INDEX idx_job_listings_location ON job_listings(region, state);
CREATE INDEX idx_job_listings_posted ON job_listings(date_posted DESC);
CREATE INDEX idx_user_jobs_user_status ON user_jobs(user_id, status);
CREATE INDEX idx_user_jobs_next_action ON user_jobs(next_action_date) WHERE next_action_date IS NOT NULL;
CREATE INDEX idx_scrape_runs_board ON scrape_runs(board, started_at DESC);
```

### Cross-Board Deduplication Strategy

Same job posted on Indeed AND SEEK? We handle it:

1. **Same-board dedup**: `UNIQUE(source_board, external_id)` — prevents scraping the same job twice from the same board.
2. **Cross-board dedup**: `content_hash` = SHA-256 of `normalize(title + company + first_200_chars_description)`. When a new scrape finds a match, we link to the existing `job_listing` but note the additional source.
3. **URL dedup**: `UNIQUE(source_url)` — absolute fallback.

---

## 5. Scraping Architecture

### Board-Specific Strategy

| Board | Crawler | Proxy | Rate Limit | Expected Success | Priority |
|-------|---------|-------|------------|------------------|----------|
| **Indeed AU** | PlaywrightCrawler + stealth | Webshare residential | 3-5s between requests | 75-85% | P1 |
| **Jora** | PlaywrightCrawler | Webshare residential | 3-5s | 80-90% | P1 |
| **SmartJobs QLD** | CheerioCrawler (HTML only) | None needed | 1-2s | 95%+ | P1 |
| **SCC Careers** | CheerioCrawler | None needed | 1-2s | 95%+ | P2 |
| **EthicalJobs** | CheerioCrawler | None needed | 1-2s | 90%+ | P2 |
| **SEEK** | PlaywrightCrawler + full stealth | Webshare residential (AU sticky sessions) | 5-10s | 60-70% | P3 (hardest) |
| **LinkedIn** | **Skip** — scrape aggregators instead | - | - | 30-50% (not worth it) | P4 |

### Scraper Base Class

```typescript
// apps/worker/src/scrapers/base-scraper.ts
import { PlaywrightCrawler, CheerioCrawler, ProxyConfiguration } from 'crawlee';

interface ScrapedJob {
  externalId: string;
  title: string;
  company: string;
  description: string;
  locationRaw: string;
  salaryDisplay?: string;
  employmentType?: string;
  sourceUrl: string;
  datePosted?: Date;
  expiresAt?: Date;
}

abstract class BaseScraper {
  abstract board: string;
  abstract buildSearchUrl(profile: SearchProfile): string;
  abstract parseJobList(page: Page | CheerioAPI): Promise<ScrapedJob[]>;
  abstract parseJobDetail(page: Page | CheerioAPI): Promise<Partial<ScrapedJob>>;
  
  // Shared: dedup, save to DB, track run stats
  async run(profile: SearchProfile): Promise<ScrapeRunResult> { ... }
}
```

### Scrape Schedule

Default schedule (configurable per user):
- **6:00 AM AEST** — Morning scrape (catch overnight postings)
- **12:00 PM AEST** — Midday scrape (catch morning postings)
- **6:00 PM AEST** — Evening scrape (catch afternoon postings)

BullMQ repeatable jobs:
```typescript
await scraperQueue.add('daily-scrape', { profileId }, {
  repeat: { pattern: '0 6,12,18 * * *' }, // 6am, 12pm, 6pm AEST
  priority: 1,
});
```

### Proxy Budget Estimate

**Assumptions**: 7 boards, ~100 jobs per board per scrape, 3 scrapes/day
- ~2,100 page loads/day (search pages + detail pages)
- ~250KB per page average
- ~525MB/day = ~15GB/month

**Cost**:
- Webshare residential 15GB — check current Webshare pricing for residential tier
- Single provider for all boards simplifies rotation and billing
- **Total proxy cost: ~$50-80/month** (can reduce by scraping less frequently or using smaller plan)

---

## 6. User Experience

### Mobile-First Navigation (Bottom Tab Bar)

```
┌─────────────────────────────────────┐
│                                     │
│           [Page Content]            │
│                                     │
├─────────────────────────────────────┤
│  Discover  │  Pipeline  │  Settings │
│    ✨      │    📋      │    ⚙️     │
└─────────────────────────────────────┘
```

**Three core screens**:

1. **Discover** (Tinder-style swipe)
   - Cards show: Title, Company, Location, Salary, Employment Type
   - Swipe right → "Interested" (enters pipeline)
   - Swipe left → "Not interested" (archived)
   - Tap card → Full job description expandable
   - Badge shows count of new unreviewed jobs

2. **Pipeline** (Kanban board)
   - Horizontal scrollable columns: Interested → Applied → Interview → Offer
   - Drag cards between columns to update status
   - Tap card → Detail view with actions (apply, add note, set reminder)
   - Mobile: columns scroll horizontally with snap points
   - Filter by: tags, priority, date

3. **Settings**
   - Search profile management (keywords, location, radius, boards)
   - Account settings
   - Notification preferences
   - Scraper status / last run info

### Job Detail View

```
┌─────────────────────────────────────┐
│ ← Back                    ⭐ Save   │
│                                     │
│ Senior Receptionist                 │
│ Sunshine Coast Hospital             │
│ 📍 Birtinya, QLD (8km)             │
│ 💰 $55,000 - $62,000 + super       │
│ 🕐 Full-time                       │
│ 📅 Posted 2 days ago               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Status: [Interested ▾]         │ │
│ │ Priority: ⭐⭐⭐ High            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Description                         │
│ ─────────────────────               │
│ We are seeking a warm and           │
│ professional receptionist to        │
│ join our friendly team...           │
│                                     │
│ [View Original Listing ↗]           │
│                                     │
│ Notes                               │
│ ─────────────────────               │
│ "Great location, close to school"   │
│                                     │
│ [Mark as Applied]                   │
│ [Add Note]                          │
│ [Set Reminder]                      │
└─────────────────────────────────────┘
```

### Dashboard (stretch goal)

Quick stats:
- Jobs discovered this week: 47
- In pipeline: 12
- Applied: 5
- Interview rate: 40%
- Reminders due today: 2

---

## 7. Pipeline Stages & Transitions

```
                    ┌───────────┐
  Scraper ────────► │    New    │ (auto-populated by scrapers)
                    └─────┬─────┘
                          │ Swipe right (Discover)
                    ┌─────▼─────┐
                    │ Interested│
                    └─────┬─────┘
                          │ "Mark as Applied" + date
                    ┌─────▼─────┐
                    │  Applied  │ → auto-set 7-day follow-up reminder
                    └─────┬─────┘
                          │ Interview scheduled
                    ┌─────▼─────┐
                    │ Interview │
                    └─────┬─────┘
                         ╱ ╲
                   ┌────▼┐ ┌▼────┐
                   │Offer│ │Reject│
                   └─────┘ └─────┘

  Any stage → Withdrawn (user pulls out)
  New → Archived (swipe left in Discover, never enters pipeline)
```

---

## 8. Railway Deployment

### Services

| Service | Type | Resources | Cost Est. |
|---------|------|-----------|-----------|
| **web** | Next.js app | 512MB RAM, 0.5 vCPU | ~$8/mo |
| **worker** | BullMQ consumer + Crawlee scrapers | 1GB RAM, 0.5 vCPU | ~$10/mo |
| **postgres** | PostgreSQL 16 + PgBouncer | 512MB RAM, 0.25 vCPU | ~$8/mo |
| **redis** | Redis 8 (BullMQ backing store) | 256MB RAM, 0.1 vCPU | ~$4/mo |

**Total Railway: ~$30/month** on Pro plan ($20 subscription + ~$10 overage)

### Service Configuration

**apps/web/railway.json:**
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "watchPatterns": ["/apps/web/**", "/packages/**"]
  },
  "deploy": {
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300
  }
}
```

**apps/worker/railway.json:**
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "watchPatterns": ["/apps/worker/**", "/packages/**"]
  },
  "deploy": {
    "startCommand": "pnpm --filter=worker start",
    "restartPolicyType": "ALWAYS"
  }
}
```

### Environment Variables

```env
# Shared (all services via Railway shared variables)
DATABASE_URL=postgresql://...  # PRIVATE networking (free, no egress)
REDIS_URL=redis://...          # PRIVATE networking

# Web only
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://jobflow.up.railway.app
GOOGLE_CLIENT_ID=...           # Optional OAuth
GOOGLE_CLIENT_SECRET=...

# Worker only
WEBSHARE_PROXY_HOST=...
WEBSHARE_PROXY_PORT=...
WEBSHARE_PROXY_USER=...
WEBSHARE_PROXY_PASS=...
```

### Total Monthly Cost

| Item | Cost |
|------|------|
| Railway (Pro plan + services) | ~$30/mo |
| Webshare residential proxies | ~$50-80/mo |
| Domain (optional) | ~$1/mo |
| **Total** | **~$80-110/mo** |
| **Budget option** (less frequent scraping) | **~$50/mo** |

---

## 9. Implementation Phases

### Phase 1 — Foundation (Week 1)
- [ ] Initialize monorepo (pnpm workspace + Turborepo)
- [ ] Set up Next.js 15 app with App Router
- [ ] Configure Better Auth (email/password)
- [ ] Set up Drizzle ORM + PostgreSQL schema + migrations
- [ ] Deploy skeleton to Railway (web + postgres)
- [ ] Mobile bottom nav + basic layout
- [ ] shadcn/ui setup + theme (warm, approachable — not corporate)

### Phase 2 — Pipeline & UI (Week 2)
- [ ] Job listing CRUD (server actions)
- [ ] Pipeline/Kanban board with @dnd-kit
- [ ] Job detail view
- [ ] Discover/swipe triage view
- [ ] Search profile management (settings page)
- [ ] Mobile responsiveness pass (iPhone 11 testing)

### Phase 3 — Easy Scrapers (Week 3)
- [ ] SmartJobs QLD scraper (CheerioCrawler, no proxy)
- [ ] SCC Careers scraper (CheerioCrawler, no proxy)
- [ ] EthicalJobs scraper (CheerioCrawler, no proxy)
- [ ] BullMQ + Redis setup on Railway
- [ ] Scrape run tracking + status UI
- [ ] Cross-board deduplication
- [ ] Auto-populate new jobs into Discover feed

### Phase 4 — Hard Scrapers (Week 4)
- [ ] Webshare proxy integration
- [ ] Indeed AU scraper (PlaywrightCrawler + stealth)
- [ ] Jora scraper (PlaywrightCrawler)
- [ ] SEEK scraper (PlaywrightCrawler + Webshare sticky sessions) — expect iteration
- [ ] Proxy rotation + retry logic tuning
- [ ] Error monitoring + alerts

### Phase 5 — Polish (Week 5)
- [ ] Follow-up reminders (next action + date)
- [ ] Communication log
- [ ] Dashboard/stats page
- [ ] PWA setup (installable on iPhone home screen)
- [ ] Push notifications (new jobs matching profile)
- [ ] Performance optimization (loading states, skeleton screens)

### Phase 6 — Nice-to-Haves (Future)
- [ ] Resume version management
- [ ] Cover letter templates (with AI assistance)
- [ ] LinkedIn scraper (if needed, low priority)
- [ ] Browser extension for one-click "Add to pipeline" from any job board
- [ ] AI job matching / relevance scoring
- [ ] Salary insights (track market rates for roles)
- [ ] Multi-user with shared job lists (Sarah + Roger)

---

## 10. Sarah-Specific UX Considerations

Sarah is a people-person, not a tech person. The app needs to feel **warm and inviting**, not like a corporate CRM.

### Design Direction
- **Warm color palette**: Soft sage greens, warm cream backgrounds, muted gold accents. Think "cozy study" not "Salesforce dashboard". (She loves Downton Abbey — the aesthetic should whisper Edwardian warmth, not scream startup blue.)
- **Large touch targets**: 48px minimum. iPhone 11 is her device.
- **Simple language**: "Jobs for you" not "Pipeline". "Interested" not "Qualified Lead".
- **Encouraging micro-copy**: "3 new jobs found this morning!" not "3 records ingested".
- **Swipe-first**: The Discover view is the primary interaction. Swiping feels natural and low-commitment.
- **Minimal required actions**: Status changes should be one-tap. Notes are optional. Don't overwhelm with fields.

### Accessibility
- Font size: 16px minimum (prevents iOS zoom on input focus)
- Contrast ratio: WCAG AA minimum
- Touch targets: 48x48px minimum
- Reduced motion: Respect `prefers-reduced-motion`

---

## 11. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SEEK blocks all scraping | High | Medium | Start with easier boards first. SEEK is P3. Use Apify paid scraper as fallback ($2.50/1000 results). |
| Job boards change HTML structure | Medium | Medium | Each scraper has its own parser. Breaking change only affects one board. Alert on scrape failures. |
| Proxy costs exceed budget | Medium | Low | Start with smaller Webshare plan. Reduce scrape frequency. Skip SEEK initially. |
| Better Auth missing feature | Low | Medium | It's open source. Contribute fix or fall back to NextAuth v5. |
| Railway downtime | Low | Low | Non-critical app. Sarah can check boards manually for a day. |
| Legal concerns with scraping | Low | High | We're scraping public job listings for personal use, not reselling data. Respect robots.txt. Rate limit aggressively. No ToS violations for personal use. |
