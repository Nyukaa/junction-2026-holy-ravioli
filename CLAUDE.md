# Project: Envelope Planner (team Holy Ravioli)

Junction 2026, S-Bank challenge. We have 48 hours. A working demo matters more than perfect code.

## What we build

A mobile-first money coach. The user sees the state of their savings goal and envelopes (Home, Car, Kids, Groceries, Fun, Buffer, Dream) and talks to an AI agent in a chat. Plain code in the database layer does all the math. The agent explains, asks simple questions, and offers choices. Data is the synthetic S-Bank dataset in PostgreSQL on Aiven. Full idea: `docs/idea.md`.

## Stack

Next.js (App Router) + TypeScript (strict) + Tailwind + shadcn/ui + Anthropic SDK + PostgreSQL (Aiven) with the `pg` driver

## Architecture

```
UI (Elya) --HTTP--> API: exactly 2 endpoints (Anna)
                      GET  /api/status  --> db methods                      (plain code, no AI)
                      POST /api/chat    --> agent --> tools --> db methods  (tools are thin wrappers)
                                                                    |
                                          database layer (Alex): SQL + all calculations
                                                                    |
                                                               PostgreSQL (Aiven)
```

- Only two endpoints exist: `GET /api/status` (state of the goal) and `POST /api/chat`. Do not add more without asking
- `POST /api/chat` takes only text and returns JSON: `reply` (text), `suggestions` (tappable follow-ups), `charts` (simple bar charts)
- An agent tool is a thin wrapper: one tool = one method of the `Db` interface. No SQL, no math, no pool in the tools
- All calculations live in `src/lib/db/*` (Alex). The model never calculates and never writes a number

## Structure

```
src/app/                 pages and layouts (UI)
src/app/api/status/      GET /api/status (Anna)
src/app/api/chat/        POST /api/chat (Anna)
src/components/          reusable UI components (Elya)
src/mocks/               typed fixtures of the 2 API responses, so the UI works without a backend (Anna writes the first version)
src/lib/ai/              the only place that uses the Anthropic client: client, model, prompts, tools, charts, run loop, checks (Anna)
src/lib/db/              the only place that talks to PostgreSQL (Alex)
  types.ts               the Db interface (shared contract)
  index.ts               implementation of Db
  queries/               SQL
  logic/                 pure math: pace, zones, safe-to-spend, goal, what-if, rebalance
  fake.ts                fake Db with fixtures, for working before the real one is ready
src/types/contracts.ts   shared types. Change only when all three agree
db/migrations/           numbered SQL files (001_..., 004_...)
scripts/                 data loading, derive.sql, demo_customer.py. Run by hand, not part of the app
docs/                    idea.md, tasks.md, specs/
```

## Database

- Aiven PostgreSQL. Connection from `DATABASE_URL` (and optional `DATABASE_CA`). Never commit credentials
- Schema `junction`: raw `tx`, `cust` (from the CSV) and derived `customer_month`, `customer_profile`, `peer_stats`, `small_joys`. Read-only for the app
- Schema `app`: state: `demo_clock`, `demo_customers`, `user_facts`, `goals`, `envelope_limits`, `sprints`, `chat_messages`, `pending_options`, `agent_log`
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
- Write-tools (save_fact, create_goal, apply_option, close_sprint) run only after the user said yes in the chat
- Anthropic client only via src/lib/ai/*
- Model name is one constant in src/lib/ai/model.ts
- Never hardcode secrets, use process.env and keep .env.example updated
- No new dependencies without asking. Already approved: `pg` (and its types) for the database layer
- Small components, one responsibility per file
- Always handle API errors and show a simple fallback message in the UI

### Product rules

- Numbers come only from the database layer. The model never calculates or writes a number. If the reply or a suggestion contains a number that is not in the tool results, it is dropped and a fallback is used
- Charts are built by code from tool results. The model only chooses which chart ids to show (max 2)
- Charts are simple bars comparing values (usually 2 bars): spent vs limit, plan vs actual, you vs similar people, before vs after
- Money is EUR. Show ranges for forecasts, not false precision
- Transfers (`salary_sweep`, `investment_deposit`, `investment_withdrawal`) are not spending
- Do not detect children, hobbies or loans from transactions (not in the data). The agent asks in very simple words and offers the answers as suggestions
- Similar-people data is for benchmarks only, not for forecasts
- The model sees only tool results (aggregates). No raw transaction lists, no ids of other customers
- Texts for users: simple English, short sentences, all in `src/lib/copy.ts` or in the prompts

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
