# Spec: token optimization (API + agent layer only)

**Owner:** Anna
**Branch:** feat/token-optimization

## Goal

Cut the tokens one chat turn costs, without changing what the agent can do and without
touching the database layer or anyone else's logic.

## Prerequisite

`docs/specs/token-baseline.md` is done and `docs/token-baseline.md` has the "before"
numbers. Every step below is verified by comparing the `[usage]` log against that file.

## Rules for this spec

- Only these files change: `src/lib/ai/*`, `src/app/api/chat/route.ts`
- Nothing in `src/lib/db/*`, `db/*`, `src/types/contracts.ts` or `src/lib/db/types.ts`
- No math and no new numbers in `src/lib/ai/*`: formatting a db result is allowed,
  calculating anything from it is not
- No new dependencies, no tests
- ONE step per request. After each step: run both demo scenarios, record the new numbers

## Out of scope

- Switching the model (Haiku) — needs `agent-eval.md` first
- Changing the `save_plan` input shape — needs Alex, see the bottom of this file
- Seasonality or averages computed in SQL — needs Alex, see the bottom of this file

---

## Step 1 — prompt caching

**Files:** `src/app/api/chat/route.ts`

The request prefix order is `tools` → `system` → `messages`, so ONE cache breakpoint at the
end of `system` covers both the tool schemas and the system prompt.

- Pass `system` as an array of blocks instead of a string:
  `system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }]`
- Use the same `system` array for every `messages.create` in the turn, including the ones
  inside the tool loop.
- `tools` stays as it is, no `cache_control` needed on it.

**Verify:** on the first call `cache_creation_input_tokens > 0`; on the second call in the
same turn `cache_read_input_tokens > 0` and `input_tokens` drops a lot. If
`cache_creation_input_tokens` stays 0, the cached prefix is under the minimum cacheable
length — check the Step 3 table in the baseline and say so instead of guessing.

**Expected:** the static part (system + tools) stops being billed at full price on every
call after the first. Cache lifetime is a few minutes, so it also helps follow-up messages
in the same conversation.

---

## Step 1b — make the system prompt static (optional, do after Step 1 works)
Step 1b: skipped — benefit (cross-customer cache) doesn’t apply to production use, risk not worth it

**Files:** `src/lib/ai/prompts.ts`, `src/app/api/chat/route.ts`

Today `getSystemPrompt(goal)` interpolates the goal name, amount and date into the text, so
every customer (and every goal change) gets a different prefix and a different cache entry.

- Make one static system prompt that covers both scenarios and does NOT contain the goal
  values. It already tells the agent to call `get_goal` first, which returns those values.
- Keep a single short dynamic line out of the cached block — either as the first user
  message or as a second, uncached system block: `has_goal: true | false`.

**Verify:** two different customers in a row — the second one should show
`cache_read_input_tokens > 0` on its first call.

**Expected:** the cache is shared across customers instead of one entry per customer.
Watch the behaviour here: if the agent starts forgetting the goal, revert this step.

---

## Step 2 — compact `get_data` output

**Files:** `src/lib/ai/tool-handler.ts`, `src/lib/ai/tools.ts`

`db.getFinancialData` keeps returning the same typed object. Only the string the agent
receives changes: instead of `JSON.stringify(...)` with a repeated key set and a
`transaction_types` array on every row, send a small text table.

Target format:

```
as_of=2026-11-17
columns=month,category,eur,n
actuals
2025-01,Groceries,-412.30,24
2025-01,Restaurants,-180.50,9
plans
2026-12,Entertainment,-120.00,1
types
Groceries=card_payment
Restaurants=card_payment,cash
plan_reasons
2026-12,Entertainment,Christmas gifts are usually higher in December
```

- The `types` block lists each category's transaction types once, not per row.
- `plan_reasons` only for plan rows that have a reason.
- Keep the exact category and type names from the db, and the exact signed amounts with two
  decimals. Do not round, do not drop rows, do not re-group.

Then update the `get_data` description in `tools.ts` so it describes this format in one or
two sentences, and keep the existing warnings ("use only returned names", "do not
calculate").

**Verify:** re-run `src/lib/ai/measure-context.ts` and compare the `get_data` row with the
baseline. The agent must still produce a correct draft plan in scenario 1.

**Expected:** this is the single biggest input saving per turn, because this one result is
larger than everything else combined.

---

## Step 3 — stop the stored history from growing

**Files:** `src/lib/ai/chat-history.ts`

Today every `tool_result` stays in the in-memory history forever and is resent with every
following message. A big `get_data` result gets paid for again on each later turn.

- In `appendHistory`, after adding the new turn, compact all OLDER turns: for every
  `tool_result` block whose content string is longer than ~1500 characters, replace the
  content with:
  `[previous get_data result removed from history. Call get_data again if you need these numbers.]`
- Never delete a block. Every `tool_use` must keep its matching `tool_result`, or the next
  request fails. Shrinking the content is safe, removing the block is not.
- Leave the most recent turn untouched, so an immediate follow-up question does not force a
  re-call.
- Optional, same file: keep at most the last ~10 turns.

**Verify:** scenario 2b (three follow-up questions). `input_tokens` should stay roughly flat
across the three messages instead of climbing. The agent should still answer follow-ups
correctly, calling `get_data` again when it actually needs numbers.

**Known limitation — unverified, pending Anthropic API usage cap reset on 2026-12-01:**
the third follow-up of a live scenario-2b walk (the one that hit `max_tokens` in the
original baseline, see `docs/token-baseline.md`'s "Bug found while measuring") has not
been re-run against Steps 1-3 - the session's API key hit its own usage cap first. The
first two follow-ups measured fine. Re-run the third turn once the cap resets.

**Expected:** the saving grows with conversation length. In a short demo it is small, in a
long one it is the difference between working and hitting the context limit.

---

## Step 4 — slim down the other tool results

**Files:** `src/lib/ai/tool-handler.ts`

- `save_plan`: return a summary instead of all saved rows, for example
  `{ "message": "Plan saved and is now active", "entries_saved": 48, "months": "2026-12..2027-11" }`
  The agent does not need the rows back, it just submitted them.
- `get_goal`: keep `goal` and `progress` as they are, but render `plan` with the same
  compact table formatter from Step 2 instead of raw `PlanRow` objects. Drop `plan_id` and
  `customer_id` — the model never needs them (and fewer ids in the context is also better
  for safety).
- Extract the formatter into one function used by both `get_data` and `get_goal`.

**Verify:** scenario 2 still reports progress and warnings correctly; `get_goal` row in the
measure table gets smaller.

---

## Step 5 — update the baseline file

**File:** `docs/token-baseline.md`

Add an "after" column per step, so the file shows what each change actually did. This is the
material for the Junction write-up / pitch as well.

Done for scenarios 1 and 2, and for the first two of scenario 2b's three follow-ups.
Scenario 2b's third follow-up and the `max_tokens` dead end it originally hit are marked
in `docs/token-baseline.md` as a **known limitation — unverified, pending Anthropic API
usage cap reset on 2026-12-01**, not as done.

---

## Done when

- [ ] Both demo scenarios work in the browser on a phone-size window
- [ ] `npx tsc --noEmit` and `npm run lint` pass
- [ ] `docs/token-baseline.md` has before/after numbers per step
- [ ] Committed and pushed, one commit per step

---

## Needs Alex — do NOT implement without asking him

These would save more, but they live in `src/lib/db/*` and in the plan contract, which is
his area. Bring them as a proposal, with the measured numbers from the baseline.

1. **Compact `save_plan` input.** Today the model writes one full entry per month per
   category (12 months × several categories = a lot of generated output, and this is what
   makes a turn hit `max_tokens`). Alternative contract: the model sends a monthly amount
   per category plus a short list of month-specific exceptions, and the db layer expands it
   into 12 months. Output tokens are the most expensive part of a turn, so this matters.
2. **Seasonality and typical monthly levels computed in SQL.** The prompt currently asks the
   model to compare the same calendar month across 2 years itself, which is exactly why the
   full 2-year history has to be in the context. If the db returns a short summary
   (per category: typical month, and which months repeat higher across years), the agent can
   work from a few lines instead of hundreds of rows. It is also more reliable: comparing
   months is math, and by our own rule the model should not do math.
3. **Small optional expenses, pre-computed.** `junction.tx` has `mcc_code` and
   `merchant_id`, so small optional spending (coffee, cinema, fast food) can be found with
   MCC + an amount threshold + a frequency count, in plain SQL, once. The agent then gets
   3 lines ("coffee ~4x/week, ~3.80 EUR") instead of raw data, and only writes the wording
   of the weekly challenge. This overlaps with his P1 task "sprint (weekly limit + reward)"
   in `docs/tasks.md`, so it is his call where it goes.
