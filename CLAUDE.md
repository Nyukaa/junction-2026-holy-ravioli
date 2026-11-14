# Project: Money Polku (team Holy Ravioli)

Junction 2026, S-Bank challenge. We have 48 hours. A working demo matters more than perfect code.

## What we build

An AI money planner. It finds spending patterns from S-Bank (S-Pankki) mock data, asks the user "Is this right?", then shows what the user can afford (the goal), when, and what to change to reach it. The home screen shows dream progress, a weekly sprint, a forecast-vs-actual chart and a status (🟢 on track, 🟡 spending too fast). When spending goes off course, the AI gives a rescue quest (one clear action for 2 days). The user can tap **Change goal** or **Explain**. Plain code in the database layer does all the math. Data is the synthetic S-Bank dataset in PostgreSQL on Aiven. Full idea: `docs/idea.md`.

## Stack

Next.js (App Router) + TypeScript (strict) + Tailwind + shadcn/ui + Anthropic SDK + PostgreSQL (Aiven) with the `pg` driver

## Architecture

```
UI (Elya) --HTTP--> API: exactly 2 endpoints (Anna)
                      GET  /api/status  --> db methods                      (goal, progress, sprint, forecast line, status, quest, no AI)
                      POST /api/chat    --> agent --> tools --> db methods  (tools are thin wrappers; agent coaches user)
                                                                    |
                                          database layer (Alex): SQL + goal tracking + plan math
                                                                    |
                                                               PostgreSQL (Aiven)
```

- Only two endpoints exist: `GET /api/status` (goal + progress + warnings) and `POST /api/chat`. Do not add more without asking
- `POST /api/chat` takes only text and returns JSON: `reply` (coaching text or encouragement/warning), `goal` (if just created), `actions` (buttons: options on a warning, **Change goal**, **Explain**)
- An agent tool is a thin wrapper: one tool = one method of the `Db` interface. No SQL, no math, no pool in the tools
- All goal math lives in `src/lib/db/*` (Alex). The model never calculates and never writes a number

## Structure

```
src/app/                 pages and layouts (UI)
src/app/api/status/      GET /api/status (Anna)
src/app/api/chat/        POST /api/chat (Anna)
src/components/          reusable UI components (Elya)
src/mocks/               typed fixtures of the 2 API responses, so the UI works without a backend (Anna writes the first version)
src/lib/ai/              the only place that uses the Anthropic client: client, model, prompts, tools, run loop, checks (Anna)
src/lib/db/              the only place that talks to PostgreSQL (Alex)
  types.ts               the Db interface (shared contract)
  index.ts               implementation of Db
  queries/               SQL
  logic/                 pure goal math: plan generation, progress tracking, warning detection, monthly budget allocation
src/types/contracts.ts   shared types. Change only when all three agree
db/migrations/           numbered SQL files (001_..., 004_...)
scripts/                 data loading, CSV import. Run by hand, not part of the app
docs/                    idea.md, tasks.md, specs/
```

## Database

- Aiven PostgreSQL. Connection from `DATABASE_URL` (and optional `DATABASE_CA`). Never commit credentials
- Schema `junction`: raw `tx`, `cust` (from the CSV). Read-only for the app
- Schema `app`: goal state: `demo_clock`, `demo_customers`, `goals` (one per customer), `goal_plans` (monthly budget), `chat_messages`, `agent_log`
- Schema changes only by a new numbered file in `db/migrations/`. Never edit a file that is already applied
- All SQL lives in `src/lib/db/*`. Parameterized queries only (`$1, $2`)
- The demo clock is applied inside the db layer. Nothing after `today` is ever returned
- Every db method is for one `customerId`. No method reads another customer. No raw SQL tool for the model
- Raw CSV is never committed. Put the dataset link in the README

## Ownership (to avoid merge conflicts)

| Area                   | Owner | Paths                                                                                              |
| ---------------------- | ----- | -------------------------------------------------------------------------------------------------- |
| UI                     | Elya  | `src/app/*` pages (not `api`), `src/components/*`, `src/lib/api-client.ts`, `src/lib/copy.ts`      |
| API + AI agent + tools | Anna  | `src/app/api/*`, `src/lib/ai/*`, `src/mocks/*` (first version, then Elya may edit)                 |
| Database + logic       | Alex  | `src/lib/db/*` (except `types.ts`), `db/*`, `scripts/*`                                            |
| Shared                 | all   | `src/types/*`, `src/lib/db/types.ts`, `docs/*`, `.env.example` (tell the others before you change) |

If a task needs changes in someone else's area, tell me before you do it.

## Rules

- Server Components by default, "use client" only when needed
- API routes live in src/app/api/<name>/route.ts and validate input with zod. Only `status` and `chat`
- The customer comes from the header `x-customer-id` (must be one of the demo customers), never from the body or from the model
- The database is reached only via the `Db` interface from src/lib/db. The agent and the routes never import `pg`
- Write-tools (create_goal, save_plan) run only after the user says yes in the chat and only via agent tool calls
- Anthropic client only via src/lib/ai/*
- Model name is one constant in src/lib/ai/model.ts
- Never hardcode secrets, use process.env and keep .env.example updated
- No new dependencies without asking. Already approved: `pg` (and its types) for the database layer
- Small components, one responsibility per file
- Always handle API errors and show a simple fallback message in the UI

### Product rules

- Numbers come only from the database layer. The model never calculates or writes a number. If the reply contains a number not in tool results, it is dropped and a fallback is used
- One goal per customer. Goal has: name, target date, target amount, reason (optional). Plan has: monthly budget, spending categories and limits.
- Before making a plan, the agent shows what it found in the user's data and asks "Is this you?". The user confirms or corrects
- Status: 🟢 on track, 🟡 spending a bit faster than the forecast, 🔴 far behind. Status texts and the chart lines (forecast vs real savings) are built by code from the database
- Yellow zone: when one category goes over its limit, give a rescue quest (one clear action for 2 days, never a ban). The amount to save never goes above the overspend
- Encourage: "Great! You're €200 closer to your Alps trip. Spending is on track." Warn: "⚠️ Your laptop broke (€500). You're now €500 behind. Options: cut €500 elsewhere or delay trip 1 month."
- Money is EUR. Use actual amounts, not ranges or forecasts, but ranges for "next month is Christmas" type warnings
- Transfers (`salary_sweep`, `investment_deposit`, `investment_withdrawal`) are not spending
- Spending categories are defined in the database (groceries, transport, dining, etc.), not inferred by the model
- Agent coaching: ask simple questions ("What's your goal?", "When?", "How much?", "Where can you cut?") and guide user to confirm plan
- The model sees only tool results (aggregates). No raw transaction lists, no ids of other customers
- Texts for users: simple English, short sentences, motivating tone. All in `src/lib/copy.ts` or in the prompts

## Commands

- npm run dev
- npm run lint
- npx tsc --noEmit
- psql "$DATABASE_URL" -f db/migrations/<file>.sql (apply a migration)

## How to work with me

- Plan first, then code. For big changes (new folder, new dependency, refactor), explain the plan in 2-3 lines and wait for my OK
- Do ONE thing per request, then stop
- Change only what is needed. Do not rewrite whole files, do not touch files outside the task
- Do not write tests unless I ask. I check manually in the browser
- After each change, tell me in 1-3 lines what changed and in which files
- If something is unclear, ask one short question instead of guessing

## Specs

Feature specs are in docs/specs/: `ui.md` (Elya), `api-and-agent.md` (Anna), `database.md` (Alex). When I say "implement spec X", read only that spec, docs/idea.md and src/types/contracts.ts (and src/lib/db/types.ts for api-and-agent.md and database.md). Respect "Out of scope" in the spec. Tasks and owners are in docs/tasks.md.

## Git

- One task = one branch (feat/<name>), small commits (feat:, fix:)
- Pull before you start, never force push
- Work only in your own area (see Ownership)

## Done means

- Works in the browser with the demo scenario from docs/idea.md, on a phone-size window
- npx tsc --noEmit and npm run lint pass
- Committed and pushed
