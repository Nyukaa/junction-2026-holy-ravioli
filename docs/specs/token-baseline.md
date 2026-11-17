# Spec: token baseline (measure before optimizing)
 
**Owner:** Anna
**Branch:** feat/token-baseline
 
## Goal
 
Measure how many tokens one chat turn costs today, so every later optimization can be
compared against a real number instead of a guess. No behaviour changes in this spec.
 
## Why this first
 
The agent loop in `src/app/api/chat/route.ts` calls `messages.create` 2-4 times per user
message, and every call resends the system prompt, the tool schemas and the whole history.
Right now nothing in the code reports how big that is.
 
## Out of scope
 
- No prompt changes, no tool changes, no caching (that is `token-optimization.md`)
- No database changes, no changes in `src/lib/db/*`
- No new dependencies in `package.json` (`npx tsx` is fine, it does not install anything)
- No tests
---
 
## Step 1 — usage accumulator
 
**File:** `src/lib/ai/usage.ts` (new)
 
Create a tiny helper that collects `response.usage` across the agent loop:
 
```ts
export interface TurnUsage {
  calls: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}
 
export function createTurnUsage(): TurnUsage;
export function addUsage(acc: TurnUsage, usage: Anthropic.Messages.Usage): void;
export function formatTurnUsage(label: string, acc: TurnUsage): string;
```
 
- `addUsage` reads `input_tokens`, `output_tokens`, `cache_read_input_tokens`,
  `cache_creation_input_tokens` (the last two can be undefined today, treat as 0).
- `formatTurnUsage` returns ONE line, easy to read in the terminal:
  `[usage] customer=demo calls=3 in=41200 out=820 cache_read=0 cache_write=0 est=$0.137`
- Put the prices in named constants at the top with a `// TODO: verify on the Anthropic
  pricing page` comment. Cost is only a rough helper, the token counts are the real metric.
**Done when:** `npx tsc --noEmit` passes.
 
---
 
## Step 2 — log usage in the chat route
 
**File:** `src/app/api/chat/route.ts`
 
- Create the accumulator before the first `messages.create`.
- Call `addUsage` after every `messages.create`, including the ones inside the
  `while (response.stop_reason === "tool_use")` loop.
- After the loop, `console.log(formatTurnUsage(...))` exactly once per request.
- Also log which tools ran in this turn and the size of each tool result, one line:
  `[tools] get_data=18420chars save_plan=120chars`
  (character length is enough here, no need to call the token API per tool)
Do not change the loop logic, the prompts, or the response shape.
 
**Done when:**
- `npm run dev`, send one message in the browser, and the terminal shows one `[usage]` line
  and one `[tools]` line per message
- `npx tsc --noEmit` and `npm run lint` pass
---
 
## Step 3 — measure the static context and the tool results
 
**File:** `src/lib/ai/measure-context.ts` (new, run by hand, not imported by the app)
 
A small script that prints how big each part of the context is, using the token counting
endpoint (`client.messages.countTokens`), which is cheap and does not generate anything.
 
Measure and print a table:
 
| part | tokens |
| --- | --- |
| system prompt, no goal (scenario 1) | |
| system prompt, with goal (scenario 2) | |
| tools schemas (all 5) | |
| `get_data` result, as sent today | |
| `get_goal` result, as sent today | |
 
- Take `customerId` from `process.argv[2]`.
- Build the system prompts with `getSystemPrompt(null)` and `getSystemPrompt(fakeGoal)`.
- Get the real tool results through `getDb()` and `executeTool(...)`, so the numbers match
  what the agent actually receives.
- To measure one piece alone, count a request with that piece and subtract an empty
  baseline, or just count `tools` in its own `countTokens` call.
Run it:
 
```bash
set -a; source .env.local; set +a
npx tsx src/lib/ai/measure-context.ts <customerId>
```
 
**Done when:** the script prints the table for at least 2 demo customers.
 
---
 
## Step 4 — write the baseline down
 
**File:** `docs/token-baseline.md` (new, filled by hand from the logs)
 
Walk both demo scenarios from `docs/idea.md` in the browser (phone-size window) and record:
 
| scenario | API calls | input | output | cache_read | est. cost |
| --- | --- | --- | --- | --- | --- |
| 1. new goal, up to saved plan | | | | 0 | |
| 2. progress check with a warning | | | | 0 | |
| 2b. three follow-up questions in a row | | | | 0 | |
 
Add the Step 3 table under it. This file is the "before" column for
`docs/specs/token-optimization.md`.
 
**Done when:** both scenarios recorded, committed and pushed.
 
---
 
## Notes
 
- Scenario 2b matters most: it shows how fast the stored history grows, which is the
  biggest suspected cost.
- If a turn hits `max_tokens` (there is already a `console.error` for it), write that down
  too — it is a bug, not only a cost problem.
 