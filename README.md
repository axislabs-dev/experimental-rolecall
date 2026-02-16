# RoleCall.ai

**Land the job you need.** RoleCall fills your pipeline with real opportunities from Australian job boards, triages them with AI, and helps you apply at scale — so you can focus on landing the right role, not drowning in tabs.

Built for real people getting back into the workforce, changing careers, or just tired of the soul-crushing manual search.

---

## What it does

1. **Scrapes job boards automatically** — Indeed AU, SEEK, Jora, SmartJobs QLD, EthicalJobs, Sunshine Coast Council Careers. Runs on a schedule you set (default: every 2 days).
2. **AI triage** — Every new listing gets scored against your profile. Good fits go straight to "Recommended." Not-quite-right jobs land in "Not Right Now" with an explanation of why.
3. **Kanban pipeline** — Track jobs from Recommended → Applied → Interview → Offer. Drag and drop on mobile or desktop.
4. **Multi-user** — Each person gets their own search profiles, preferences, and pipeline. Built for households, not just individuals.
5. **Self-hosted** — Your data, your instance. Deploy on Railway, Fly.io, or any Docker host in minutes.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router), React, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Auth | Better Auth (email/password) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Job Queue | BullMQ + Redis |
| Scraping | Crawlee (Playwright + Cheerio) |
| AI | OpenAI GPT-4o-mini via Vercel AI SDK |
| Drag & Drop | @dnd-kit |
| Monorepo | pnpm workspaces + Turborepo |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 16
- Redis 7
- OpenAI API key (for AI triage)
- Webshare account (for residential proxies — needed for Indeed/SEEK/Jora)

### Quick Start (Docker)

```bash
git clone https://github.com/your-username/rolecall.git
cd rolecall
cp .env.example .env
# Fill in your environment variables
docker-compose up
```

Open [http://localhost:3000](http://localhost:3000), create an account, set up a search profile, and you're off.

### Local Development

```bash
pnpm install
cp .env.example .env
# Fill in your environment variables

# Start PostgreSQL and Redis (via Docker or locally)
docker-compose up postgres redis -d

# Run database migrations
pnpm db:migrate

# Start everything
pnpm dev
```

This starts the Next.js web app on `:3000` and the background worker simultaneously via Turborepo.

### Deploy to Railway

1. Create a new Railway project
2. Add PostgreSQL and Redis services from the Railway template library
3. Add two services from this repo:
   - **web** → uses `apps/web/Dockerfile`
   - **worker** → uses `apps/worker/Dockerfile`
4. Set environment variables (see below)
5. Deploy

Railway configs are included at `apps/web/railway.json` and `apps/worker/railway.json`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth encryption key (`openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Yes | Public URL of the app |
| `OPENAI_API_KEY` | Yes | For AI job triage |
| `WEBSHARE_PROXY_HOST` | For scraping | Webshare residential proxy host |
| `WEBSHARE_PROXY_PORT` | For scraping | Webshare proxy port |
| `WEBSHARE_PROXY_USER` | For scraping | Webshare username |
| `WEBSHARE_PROXY_PASS` | For scraping | Webshare password |

## Project Structure

```
apps/
  web/          → Next.js 15 frontend + API routes + server actions
  worker/       → BullMQ consumer + Crawlee scrapers + AI triage
packages/
  database/     → Drizzle schema, migrations, query functions
  shared/       → Types, constants, utilities shared between apps
```

## How the Pipeline Works

```
Job boards ──► Scraper (Crawlee) ──► Dedup ──► AI Triage ──► Pipeline
                                                  │
                                         Score + reasoning
                                                  │
                                    ┌─────────────┴─────────────┐
                                    ▼                           ▼
                              Recommended                  Not Right Now
                              (score 70+)                  (with AI explanation)
                                    │
                                    ▼
                        Applied → Interview → Offer
```

Each search profile defines:
- **Keywords** — what roles to search for
- **Location + radius** — where to look
- **Boards** — which job sites to scrape
- **Qualifications & preferences** — used by AI to score fit
- **Schedule** — how often to check for new listings

## Scraper Status

| Board | Status | Method |
|-------|--------|--------|
| SmartJobs QLD | Working | Cheerio (no proxy needed) |
| Indeed AU | Working | Playwright + residential proxy |
| SEEK | Stub (needs tuning) | Playwright + AU residential proxy |
| Jora | Stub (needs tuning) | Playwright + residential proxy |
| EthicalJobs | Stub (needs tuning) | Cheerio |
| SCC Careers | Stub (needs tuning) | Cheerio |
| LinkedIn | Skipped | Enterprise-grade anti-bot |

SmartJobs and Indeed are fully implemented. The remaining scrapers have the structure in place but their CSS selectors will need adjusting against live sites — job board markup changes frequently.

## Contributing

Contributions welcome. The biggest areas that need help:

- **Scraper selectors** — SEEK, Jora, EthicalJobs, and SCC Careers stubs need real-world selector validation
- **More job boards** — PRs adding new Australian (or international) board scrapers are very welcome
- **Tests** — Unit tests for parsers, dedup logic, and Zod schemas
- **Accessibility** — Screen reader support, keyboard navigation improvements

Please open an issue before starting large features so we can discuss approach.

## License

[AGPL-3.0](LICENSE) — You're free to use, modify, and self-host RoleCall. If you deploy a modified version as a service, you must open-source your changes under the same license.

For commercial licensing inquiries, reach out via the issue tracker.


























