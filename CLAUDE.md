# Project: Junction Starter (team Holy Ravioli)

Hackathon project. We have 48 hours. A working demo matters more than perfect code.

## Stack

Next.js (App Router) + TypeScript (strict) + Tailwind + shadcn/ui + Anthropic SDK

## Structure

```
src/app/          pages and layouts
src/app/api/      API routes (server only)
src/components/   reusable UI components
src/lib/ai/       the only place that uses the Anthropic client
src/lib/data/     the only place that reads/writes JSON files
src/types/        shared TypeScript types
data/             JSON data files (no database)
docs/             idea.md, tasks.md, specs/
```

## Rules

- Server Components by default, "use client" only when needed
- API routes live in src/app/api/<name>/route.ts, validate input with zod
- Data lives in JSON files in data/, read and write them only via src/lib/data/*
- Anthropic client only via src/lib/ai/*
- Model name is one constant in src/lib/ai/
- Never hardcode secrets, use process.env and keep .env.example updated
- No new dependencies without asking
- Small components, one responsibility per file
- Always handle API errors and show a simple fallback message in the UI

## Commands

- npm run dev
- npm run lint
- npx tsc --noEmit

## How to work with me

- Plan first, then code. For big changes (new folder, new dependency, refactor), explain the plan in 2-3 lines and wait for my OK
- Do ONE thing per request, then stop
- Change only what is needed. Do not rewrite whole files, do not touch files outside the task
- Do not write tests unless I ask. I check manually in the browser
- After each change, tell me in 1-3 lines what changed and in which files
- If something is unclear, ask one short question instead of guessing

## Specs

Feature specs are in docs/specs/. When I say "implement spec X", read only that spec and docs/idea.md. Respect "Out of scope" in the spec. Tasks and owners are in docs/tasks.md.

## Git

- One task = one branch (feat/<name>), small commits (feat:, fix:)
- Pull before you start, never force push
- Areas (to avoid merge conflicts):
  - UI and components: Elya
  - AI integration and API routes: Anna
  - Architecture and core logic: Alex
- If a task needs changes in someone else's area, tell me before you do it

## Done means

- Works in the browser with the demo scenario
- npx tsc --noEmit and npm run lint pass
- Committed and pushed
