# Token baseline (before / after optimization)

Measured against `main` with the Step 1/2 usage logging in place, no prompt/tool/caching
changes. Walked both demo scenarios from `docs/idea.md` via `POST /api/chat` (same request
shape the phone-size browser UI sends), reading the `[usage]`/`[tools]` lines each call
produces. This is the "before" column for `docs/specs/token-optimization.md`.

The "after" column is Step 5 of `token-optimization.md`: dev server restarted (clean
in-memory chat history), Steps 1-3 (prompt caching, compact `get_data`, history
compaction) in place, same two scenarios walked again against the fresh server.
Step 4 (slim down `get_goal`/`save_plan`) is not implemented yet, so `get_goal`'s raw
`plan` array is still full JSON in the "after" numbers below.

## Demo scenarios

| scenario | API calls (before → after) | input (before → after) | output (before → after) | cache_read (before → after) | est. cost (before → after) |
| --- | --- | --- | --- | --- | --- |
| 1. new goal, up to saved plan | 6 → 7 | 59,729 → 20,744 | 6,008 → 3,775 | 0 → 21,342 | $0.269 → $0.139 |
| 2. progress check with a warning | 2 → 2 | 18,224 → 20,826 | 224 → 258 | 0 → 3,059 | $0.058 → $0.079 |
| 2b. three follow-up questions in a row | 4 → 2 (of 3, see note) | 113,932 → 22,029 (2 turns) | 8,895 → 657 (2 turns) | 0 → 6,118 | $0.475 → $0.078 (2 turns) |

**Known limitation — unverified, pending Anthropic API usage cap reset on 2026-12-01:**
scenario 2b's third follow-up (the one that hit `max_tokens` in the "before" run, see
"Bug found while measuring" below) has no "after" number and the `max_tokens` dead end
has not been re-checked against Steps 1-3. Re-run that turn once the cap resets.

Customers used: a goal-less customer for scenario 1 (`CUST00007`, before used a different
goal-less customer, since that one has a goal now from earlier manual testing), a customer
with an existing goal and active warnings (overspent category + behind plan) for
scenarios 2 and 2b (`CUST00011`, same customer as "before").

**Scenario 2 "after" isn't a clean apples-to-apples read:** this run, the model chose to
also call `get_data` (to back up a specific Entertainment range in its suggestion),
where the "before" run apparently didn't. That's model nondeterminism (seen elsewhere in
the eval harness's 3-run flakiness), not a regression — and even with the extra tool
call, `get_data`'s own 19,635-char compact result is far smaller than the ~42k-char JSON
that same data would have been pre-Step-2. `get_goal` alone was 27,998 chars here — that's
still raw `PlanRow[]` JSON, the exact thing Step 4 (not yet done) targets.

**Scenario 2b "after" is incomplete:** the first two follow-ups are measured below and
show the expected effect of Step 3 (history compaction) — input dropped from 20,952 to
1,077 between the two back-to-back follow-ups, instead of climbing, because the first
follow-up's large tool results got compacted out of history before the second one ran.
The third follow-up (the one that hit `max_tokens` in the "before" run) could not be
measured this time: the Anthropic API key used for this session hit its own usage cap
mid-run (`"You have reached your specified API usage limits... regain access on
2026-12-01"`), not a bug in the app — `GET /api/status` (no model call) kept working fine
throughout. Whether the `max_tokens` dead end from the "before" run is still reproducible
needs a re-check once the cap resets.

### Per-turn breakdown

**Scenario 1 — before** (4 user turns, 6 `messages.create` calls total):

| turn | calls | input | output | tools called |
| --- | --- | --- | --- | --- |
| "I want to save for a trip..." | 1 | 3,596 | 24 | none |
| "I need about 2000 euros" | 2 | 13,202 | 826 | get_data, get_goal |
| "Yes that's right, set limits..." | 1 | 10,335 | 348 | none |
| "yes save it" | 2 | 32,596 | 4,810 | create_goal, save_plan |

**Scenario 1 — after** (4 user turns, 7 `messages.create` calls total, `CUST00007`):

| turn | calls | input | output | tools called |
| --- | --- | --- | --- | --- |
| "I want to save for a snowboarding trip to the Alps in 3 months" | 1 | 99 | 24 | none |
| "I need about 2000 euros" | 2 | 2,720 | 664 | get_data, get_goal |
| "Yes that is right, cut Restaurants to 150 and Entertainment to 100/month" | 1 | 3,234 | 338 | none |
| "yes save it" | 3 | 14,691 | 2,749 | get_data, create_goal, save_plan |

The last turn calls `get_data` again even though turn 2 already had it: by the time turn
4 runs, turn 2 is 2 turns old, so Step 3's compaction already replaced its `get_data`
result with the "removed from history" notice — exactly the intended behavior ("calling
`get_data` again when it actually needs numbers").

**Scenario 2b — after, 2 of 3 follow-ups measured** (same `CUST00011` conversation as
scenario 2 above; see the usage-cap note):

| turn | calls | input | output | tools called |
| --- | --- | --- | --- | --- |
| "What if I cut Entertainment to 10 euros a month instead?" | 1 | 20,952 | 393 | none |
| "Actually, can I push my goal date back a month instead?" | 1 | 1,077 | 264 | none |
| "Let's keep the date. Set Entertainment to 50 euros a month instead" | - | - | - | known limitation — unverified, pending Anthropic API usage cap reset on 2026-12-01 |

**Scenario 2b — before** (3 follow-up turns on top of scenario 2, same customer/history):

| turn | calls | input | output | tools called | note |
| --- | --- | --- | --- | --- | --- |
| "What if I cut Entertainment to 10..." | 2 | 47,842 | 410 | get_data | |
| "Can I push my goal date back a month?" | 1 | 32,884 | 293 | none | |
| "Let's keep the date, 50 euro limit" | 1 | 33,206 | 8,192 | none | **hit max_tokens, no reply returned** |

This confirms the Notes section's suspicion: input tokens for this customer were already
33k-48k per call by the third follow-up, almost entirely resent history + the large
`get_data` tool result from earlier in the same conversation, not new information.

## Bug found while measuring

The third follow-up in scenario 2b hit `max_tokens` (8,192 output tokens, `stop_reason:
"max_tokens"`) and the API returned `{"reply": "I couldn't generate a response"}` with no
assistant text at all — a dead end for the user, not just an expensive call. Logged by the
existing `console.error` from Step 2/the original code. This is a correctness bug on top of
the cost problem; `token-optimization.md` should address both.

**Status: known limitation — unverified, pending Anthropic API usage cap reset on
2026-12-01.** Steps 1-3 shrank this customer's input tokens a lot (see the "after" column
above), which should make this less likely, but it has not been re-run against the
optimized code — the session's API key hit its own usage cap before that turn could be
retried. Treat this bug as still open until it's re-checked.

## Step 3: static context sizes

Measured with `npx tsx src/lib/ai/measure-context.ts <customerId>` (uses
`client.messages.countTokens`, no generation).

**CUST00001**

| part | tokens |
| --- | --- |
| system prompt, no goal (scenario 1) | 2,170 |
| system prompt, with goal (scenario 2) | 1,677 |
| tools schemas (all 5) | 1,395 |
| `get_data` result, as sent today | 9,629 |
| `get_goal` result, as sent today | 3,098 |

**CUST00002**

| part | tokens |
| --- | --- |
| system prompt, no goal (scenario 1) | 2,170 |
| system prompt, with goal (scenario 2) | 1,677 |
| tools schemas (all 5) | 1,395 |
| `get_data` result, as sent today | 12,029 |
| `get_goal` result, as sent today | 2,481 |

The system prompt and tool schemas are fixed overhead resent on every single call (2-4
times per user message). `get_data` is the single biggest line item and is called at least
once per new-goal conversation and again on most follow-ups that touch the plan — it alone
is bigger than the whole system prompt.

## Notes for `token-optimization.md`

- Prompt caching (`cache_read`/`cache_write` are 0 everywhere above) is the obvious first
  lever: system prompt + tools schemas + early history repeat byte-for-byte across calls in
  the same turn and across turns in the same conversation.
- `get_data`/`get_goal` results are large (3k-12k tokens) and get resent in full every time
  they're in history, even though only the latest call's result matters for most questions.
- Scenario 2b shows cost compounding with conversation length even with no new information;
  three follow-ups cost more than the entire new-goal-and-save flow (scenario 1).
- The `max_tokens` dead end above should be fixed (e.g. lower `save_plan`/large-reply risk,
  or raise `max_tokens`) regardless of the cost work. **Known limitation — unverified,
  pending Anthropic API usage cap reset on 2026-12-01:** not yet re-checked against
  Steps 1-3.
