# Money Polku

*Polku* is Finnish for "path". **Money Polku** is an AI money planner built for the Junction 2026 S-Bank challenge (team Holy Ravioli).

It reads spending patterns from S-Bank (S-Pankki) data, , then shows what they can afford (their goal), when they'll get there, and what to change to stay on track.

## What it does

1. **You choose a goal.** You chat with the AI coach: what, when, how much.
2. **The AI checks your data first.** It reads your transactions and asks "Is this you?" (e.g. "You spend about €280/month on dining out. Right?"). You confirm or correct before any plan is made.
3. **You get a home screen:**
   - **Dream progress** — a bar like "€600 / €2,000" with a status: 🟢 on track, 🟡 not on tracka 
   - **Weekly sprint** — a short, concrete challenge ("Stay under budget until Friday").
   - **Forecast vs. actual chart** — AI forecast (dashed) against real savings (solid).
4. **Off course?** The AI gives a **rescue quest** — one clear action for 2 days, never a ban, and never asking to save more than the overspend.
5. **You stay in control** — tap **Change goal** or **Explain** anytime.

All numbers (goal, progress, chart, warnings) come from the database. The model never calculates or invents a number — see [Architecture](#architecture).

Full product write-up: [`docs/idea.md`](docs/idea.md). Task board: [`docs/tasks.md`](docs/tasks.md).

## Architecture

```
UI (Next.js) --HTTP--> API: exactly 2 endpoints
                         GET  /api/status  --> db methods            (goal, progress, sprint, forecast, status, quest — no AI)
                         POST /api/chat    --> agent --> tools --> db methods   (tools are thin wrappers; agent coaches the user)
                                                             |
                                       database layer: SQL + goal tracking + plan math
                                                             |
                                                        PostgreSQL (Aiven)
```

- Only two API routes exist. The agent's tools are thin wrappers, one tool per `Db` method — no SQL and no math in the agent layer.
- All goal math (progress, warnings, monthly budget allocation) is plain TypeScript in `src/lib/db/logic/`, never the model.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** (strict) + **Tailwind CSS** + **shadcn/ui**
- **Anthropic SDK** for the coaching agent
- **PostgreSQL on Aiven** via the `pg` driver
- **zod** for input validation

## Project structure

```
src/app/                 pages and layouts (UI)
src/app/api/status/      GET /api/status
src/app/api/chat/        POST /api/chat
src/components/          UI components (home screen, chat, coach widgets)
src/lib/ai/              Anthropic client, model constant, prompts, tools, run loop
src/lib/db/              the only place that talks to PostgreSQL
  types.ts               the Db interface (shared contract)
  index.ts               implementation of Db
  logic/goals.ts         pure goal math: progress, savings, warnings
  plans.ts               plan read/write
  pool.ts                pg connection pool
src/types/contracts.ts   shared types between UI, API and db layer
db/migrations/           numbered SQL files, applied in order
db/README.md             how goal tracking, plans and warnings actually work
scripts/                 CSV → SQL loader for the raw S-Bank dataset (run by hand)
docs/                    idea.md, tasks.md, specs/
```

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values below
```

### Environment variables

| Variable            | What for                                                           |
| -------------------- | ------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Claude API key (server only)                                        |
| `DATABASE_URL`      | Aiven PostgreSQL connection string                                   |
| `DATABASE_CA`       | Trusted CA certificate for Aiven: PEM contents or a local file path  |

Never commit `.env.local`, certificates, or real keys.

### Database setup

1. Get access to an Aiven PostgreSQL instance and set `DATABASE_URL` / `DATABASE_CA`.
2. Apply the migrations in order:
   ```bash
   psql "$DATABASE_URL" -f db/migrations/001_junction_schema.sql
   psql "$DATABASE_URL" -f db/migrations/002_app_plans.sql
   psql "$DATABASE_URL" -f db/migrations/003_app_demo_clock.sql
   psql "$DATABASE_URL" -f db/migrations/004_app_goals.sql
   ```
3. Load the raw S-Bank synthetic dataset into `junction.*` with `scripts/build-junction-sql.ps1` (generates `COPY` SQL from the dataset CSVs, then run with `psql`). The raw CSVs and generated seed SQL are git-ignored — never commit them.
   Dataset link: _add here_.
4. Details on how goal progress, plans and warnings are computed: [`db/README.md`](db/README.md).

### Run

```bash
npm run dev
```

Open http://localhost:3000. The customer is selected via the `x-customer-id` header (must be a real `junction.cust.customer_id` — no mock/demo fallback customer exists).

## Scripts

- `npm run dev` — start the dev server
- `npm run lint` — run ESLint
- `npx tsc --noEmit` — type check
- `psql "$DATABASE_URL" -f db/migrations/<file>.sql` — apply a migration

## Ownership

| Area                   | Owner | Paths                                                                |
| ----------------------- | ----- | --------------------------------------------------------------------- |
| UI                      | Elya  | `src/app/*` pages (not `api`), `src/components/*`, `src/lib/api-client.ts`, `src/lib/copy.ts` |
| API + AI agent + tools  | Anna  | `src/app/api/*`, `src/lib/ai/*`, `src/mocks/*`                        |
| Database + logic        | Alex  | `src/lib/db/*` (except `types.ts`), `db/*`, `scripts/*`               |
| Shared                  | all   | `src/types/*`, `src/lib/db/types.ts`, `docs/*`, `.env.example`         |

If a task touches someone else's area, tell them first. Full rules: [`CLAUDE.md`](CLAUDE.md).

## Demo scenarios

**Scenario 1 — first time:**
User: "I want to save for a snowboarding trip to the Alps in 3 months." The agent checks the user's data, asks "Is this you?", asks how much and where they can cut back, then saves the goal and plan: "€2,000 for the Alps trip, save ~€700/month by cutting dining out."

**Scenario 2 — regular use:**
User opens the app, sees "€600 / €2,000" and the weekly sprint. An unexpected €500 laptop repair triggers a warning: "You're now €500 behind. Options: cut €500 elsewhere, or delay the trip 1 month."

## Done means

- Works in the browser with both demo scenarios above, on a phone-size window
- `npx tsc --noEmit` and `npm run lint` pass
- Committed and pushed
