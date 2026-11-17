# Money Polku

**Your money has a past. Let's plan its future.**

*Polku* is Finnish for "path". **Money Polku** is an AI financial coach that turns your bank transactions into a personal action plan. Built at Junction 2026 for the S-Bank (S-Pankki) challenge by team Holy Ravioli.

## The problem

Bank apps show what already happened. People want to know what is coming and what they can do about it.

"Can I afford a trip to the Alps in 3 months?" or "What do I need to cut to build an emergency fund?" are hard to answer from a list of transactions.

## What Money Polku does

1. **You tell it your goal.** You chat with the AI coach: what, when, how much. For example: "I want to save €2,000 for a trip to the Alps in 3 months."
2. **The AI checks your data first.** It reads your transactions, finds spending patterns and asks "Is this you?" (e.g. "You spend about €280/month on dining out. Right?"). You confirm or correct before any plan is made. If something is missing, it asks one simple question instead of a long form.
3. **You get a realistic plan.** The coach tells you if the goal is possible, how much to save each month and where you can cut back. You can still change the plan as you like.
4. **You see your progress on the home screen:**
   - **Dream progress** — a bar like "€600 / €2,000" with a status: 🟢 on track, 🟡 plan needs adjusting.
   - **Weekly sprint** — a short, concrete challenge ("Stay under budget until Friday").
   - **Forecast vs. actual chart** — the forecast (dashed) against real savings (solid).
5. **Off course?** The app gives clear options and a **rescue quest**: one small action for 2 days. It is never a ban, and it never asks you to save more than the overspend.
6. **You stay in control.** Tap **Change goal** or **Explain** anytime. **Explain** shows the steps behind the numbers.

Money Polku works with one goal at a time. This makes saving easy to start.

## What makes it different

- **Personal** — your plan is based on your own transaction history, not on averages.
- **Transparent** — all numbers (goal, progress, chart, warnings) come from the database and are calculated in code. The model never calculates or invents a number — see [Architecture](#architecture).
- **Action-oriented** — small weekly challenges help turn a plan into a habit.

AI advises. Your data decides. You stay in control.

## Demo scenarios

**Scenario 1 — first time**

User: "I want to save for a snowboarding trip to the Alps in 3 months." The agent checks the user's data, asks "Is this you?", asks how much and where they can cut back, then saves the goal and plan: "€2,000 for the Alps trip, save ~€700/month by cutting dining out."

**Scenario 2 — regular use**

The user opens the app and sees "€600 / €2,000" and the weekly sprint. An unexpected €500 laptop repair triggers a warning: "You're now €500 behind. Options: cut €500 elsewhere, or delay the trip 1 month."

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
- The web app is mobile-first, so it could be embedded in S-mobiili.

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

| Variable            | What for                                                            |
| ------------------- | ------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Claude API key (server only)                                        |
| `DATABASE_URL`      | Aiven PostgreSQL connection string                                  |
| `DATABASE_CA`       | Trusted CA certificate for Aiven: PEM contents or a local file path |

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
3. Load the S-Bank synthetic dataset into `junction.*` with `scripts/build-junction-sql.ps1`. It generates `COPY` SQL from the dataset CSVs; run the result with `psql`. The raw CSVs and the generated seed SQL are git-ignored — never commit them.
   Dataset link: https://github.com/hackjunction/Junction-2026-S-pankki
4. Details on how goal progress, plans and warnings are computed: [`db/README.md`](db/README.md).

### Run

```bash
npm run dev
```

Open http://localhost:3000. The customer is selected via the `x-customer-id` header. It must be a real `junction.cust.customer_id` — there is no mock or demo fallback customer.

## Scripts

- `npm run dev` — start the dev server
- `npm run lint` — run ESLint
- `npx tsc --noEmit` — type check
- `psql "$DATABASE_URL" -f db/migrations/<file>.sql` — apply a migration

## Data findings

We checked the S-Bank dataset before building the forecast. It is synthetic: 5,100 customers, 3.6M transactions, Oct 2024 – Sep 2026.

- **Fixed payments are easy to predict.** Housing and salary come once a month with almost the same amount. Using last month's fixed payments as the forecast gives a median error of about 5%.
- **Everyday spending is noisy.** Forecasting next month's purchases from the last 12 months gives a median error of about 31% (about 18% for the total with fixed payments). A plan needs a buffer.
- **Seasonality is real by category, not in total.** Travel peaks in July (+28%), Home & Tech in November (+28%), Health in February (+20%). Midsummer Eve is +39% and May Day +21%. Friday and Saturday are about 27% above an average day.
- **Copying last year is worse than recent months** (45% vs 31% error for purchases). So we use seasonal indexes per category.
- **Merchant-based subscription detection does not work here.** Only 35 customer-merchant pairs look monthly. We use transaction type (housing, utilities, salary) instead.
- **Rent and mortgage look almost the same** in payments (median €1,191 with a mortgage record vs €1,036 without). So the app asks the user with one simple question.
- **Salary sweeps and investment deposits are not spending.** We exclude them from the forecast.
- **"People like you" did not beat the user's own history** in our backtest. It is most useful when the history is short.

## What's next

- **Recurring payments** — detect rent or mortgage, car costs and loan payments from categories, MCC codes, merchants, amounts and timing.
- **Seasonality** — use Finnish holidays and seasons (Christmas, summer holidays, back-to-school) and spending from past years, so the forecast is not just an average.
- **More goals per person** — today the app focuses on one goal at a time.
- **More banks** — a multi-bank view with PSD2 for a full financial picture.
- **People like you** — benchmarks from similar customers, also useful when your own history is short. Open data from Statistics Finland can make these benchmarks better.
- **Proactive alerts** before a tight month.
- **Prompt evaluation** for more reliable coaching.

## Team

Holy Ravioli — Anna, Alex, Elya.

| Area                   | Owner | Paths                                                                                         |
| ---------------------- | ----- | --------------------------------------------------------------------------------------------- |
| UI                     | Elya  | `src/app/*` pages (not `api`), `src/components/*`, `src/lib/api-client.ts`, `src/lib/copy.ts` |
| API + AI agent + tools | Anna  | `src/app/api/*`, `src/lib/ai/*`, `src/mocks/*`                                                |
| Database + logic       | Alex  | `src/lib/db/*` (except `types.ts`), `db/*`, `scripts/*`                                       |
| Shared                 | all   | `src/types/*`, `src/lib/db/types.ts`, `docs/*`, `.env.example`                                |

Working rules for contributors: [`CLAUDE.md`](CLAUDE.md). Product write-up: [`docs/idea.md`](docs/idea.md). Task board: [`docs/tasks.md`](docs/tasks.md).
