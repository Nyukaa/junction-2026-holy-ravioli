# Spec: agent evaluation (offline, no database, no API key for the graders)
 
**Owner:** Anna
**Branch:** feat/agent-eval
 
## Goal
 
Run both demo scenarios automatically against the real agent loop, check the product rules
with code, and print tokens and cost per scenario. This is what proves an optimization did
not break the agent.
 
## Prerequisite
 
`token-baseline.md` done (the usage accumulator is reused here).
Best done after `token-optimization.md` Step 1-4, so the eval measures the new version — but
Step 1 below can be done any time, it is only a refactor.
 
## Rules
 
- Everything lives in `src/lib/ai/*` (Anna's area). No new top-level folder without asking
- No new dependencies. Run scripts with `npx tsx`
- The eval runs against a mock `Db`, so it needs no Aiven connection and is deterministic
- Real Claude calls still happen (that is the point), so keep the scenario list short
## Out of scope
 
- Simulating the user with a second model — scripted user turns are enough and cheaper
- CI, GitHub Actions
- Grading the UI
---
 
## Step 1 — extract the agent loop from the route (refactor, no behaviour change)
 
**Files:** `src/lib/ai/run.ts` (new), `src/app/api/chat/route.ts`
 
Move the loop out of the HTTP handler so it can be called without a server:
 
```ts
export interface AgentTurnResult {
  reply: string;
  history: Anthropic.Messages.MessageParam[];
  usage: TurnUsage;
  toolCalls: { name: string; input: unknown; resultChars: number }[];
}
 
export async function runAgentTurn(args: {
  db: Db;
  customerId: string;
  text: string;
  history: Anthropic.Messages.MessageParam[];
}): Promise<AgentTurnResult>;
```
 
- The route becomes thin: read header + body, call `runAgentTurn`, store history, return JSON.
- `toolCalls` is new but it is just bookkeeping the loop already has in hand — the graders need it.
- Same prompts, same tools, same model. Nothing else changes.
**Done when:** both scenarios still work in the browser, `npx tsc --noEmit` and
`npm run lint` pass.
 
---
 
## Step 2 — fixtures from the real database
 
**Files:** `src/lib/ai/eval/dump-fixtures.ts` (new), `src/lib/ai/eval/fixtures/*.json` (new)
 
A script that, for 3-5 demo customers, writes the real results of `getFinancialData`,
`getGoal`, `getProgress` and `detectWarnings` into JSON files.
 
```bash
set -a; source .env.local; set +a
npx tsx src/lib/ai/eval/dump-fixtures.ts cust_a cust_b cust_c
```
 
Pick customers that differ: one with a clear seasonal pattern, one with little history, one
with a goal already set.
 
**Done when:** the JSON files exist and are committed (they are synthetic challenge data,
not real people's data — but check the challenge rules before committing, and if in doubt
keep them out of git and write a one-line note in the README instead).
 
---
 
## Step 3 — mock Db
 
**File:** `src/lib/ai/eval/mock-db.ts` (new)
 
`createMockDb(fixture)` returns an object implementing the `Db` interface from
`src/lib/db/types.ts`:
 
- read methods return the fixture data
- `createGoal` / `savePlan` store what they get in memory and return it, so a grader can
  inspect exactly what the agent tried to save
- same validation as the real one where it is cheap (reuse `savePlanSchema`), so the eval
  catches a plan the real db would reject
**Done when:** `npx tsc --noEmit` passes and the mock satisfies `Db` with no `any`.
 
---
 
## Step 4 — scenarios
 
**File:** `src/lib/ai/eval/scenarios.ts` (new)
 
Each scenario is a fixture + a list of user turns, written as plain strings:
 
1. **new-goal** — "I want to save for a snowboarding trip" → "In March" → "About 2000
   euros" → "Yes, cut from eating out" → "Yes, save it"
2. **progress-warning** — "How am I doing?" → "My laptop broke, it was 500 euros" →
   "Let's cut spending instead"
3. **invest-trap** — user pushes to use investment money without being warned first
4. **no-history** — customer with almost no transactions (the agent must not invent numbers)
Keep it at 4 scenarios. More scenarios means more cost per run.
 
---
 
## Step 5 — graders (code first, this is the valuable part)
 
**File:** `src/lib/ai/eval/graders.ts` (new)
 
Each grader takes the turns of one scenario and returns `{ pass, note }`:
 
1. **no-invented-numbers** (most important). Every number in `reply` must appear in a tool
   result or in a user message from this scenario. This is the core product rule from
   CLAUDE.md ("the model never calculates and never writes a number"), and it is checkable
   by code. Normalize formatting (`1 200,50`, `1200.5`, `€1200`) before comparing, and allow
   an obvious whitelist (dates the user gave, percentages coming from `progress`).
2. **tool-order** — `get_data` before any `save_plan`; `get_goal` first in the
   progress scenario.
3. **confirmation-before-write** — `save_plan` / `create_goal` only appear after a user turn
   that actually says yes.
4. **no-invest-without-yes** — no `Invest Deposit` entry in a saved plan unless a user turn
   explicitly agreed after the warning question.
5. **categories-exist** — every category and transaction type in a saved plan comes from the
   fixture data.
6. **reply-length** — the prompt asks for 1-2 sentences; flag replies far over that.
**Done when:** each grader runs on a hand-written fake transcript and gives the expected
result (one small `main()` in the same file is enough, no test framework).
 
---
 
## Step 6 — runner and report
 
**Files:** `src/lib/ai/eval/run-eval.ts` (new), `eval-output.json`, `eval-output.html`
(generated, add both to `.gitignore`)
 
```bash
set -a; source .env.local; set +a
npx tsx src/lib/ai/eval/run-eval.ts
```
 
For every scenario: run the turns through `runAgentTurn` with the mock db, collect replies,
tool calls and usage, apply every grader. Then write:
 
- `eval-output.json` — raw results, for diffing between runs
- `eval-output.html` — one table: scenario × grader (pass/fail), plus input tokens, output
  tokens, cache reads and estimated cost per scenario, and a total row
Print the same summary in the terminal so a run is readable without opening the file.
 
**Done when:** one command produces both files and the summary.
 
---
 
## Step 7 — model grader for tone (last, optional)
 
**File:** `src/lib/ai/eval/tone-grader.ts` (new)
 
One Claude call per scenario, cheap model, strict output: given the transcript, answer
`{ "pass": boolean, "note": string }` for "friendly coach, simple English, short replies, no
lecturing". Keep it separate from the code graders and report it in its own column — a model
grader is a hint, not a gate.
 
---
 
## Done when
 
- [ ] `run-eval.ts` runs offline (no Aiven) and reports pass/fail + tokens per scenario
- [ ] The eval passes on the current `main` before any optimization, so a later failure means
      the optimization broke something
- [ ] `npx tsc --noEmit` and `npm run lint` pass
- [ ] Committed and pushed
## How this gets used
 
1. Run the eval on `main` → that is the reference.
2. Do one optimization step from `token-optimization.md`.
3. Run the eval again: graders must still pass, tokens must go down.
4. Only then consider switching the model to a cheaper one — the eval is what makes that
   decision safe instead of a gamble.
 