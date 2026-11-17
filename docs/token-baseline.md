# Token baseline (before optimization)

Measured against `main` with the Step 1/2 usage logging in place, no prompt/tool/caching
changes. Walked both demo scenarios from `docs/idea.md` via `POST /api/chat` (same request
shape the phone-size browser UI sends), reading the `[usage]`/`[tools]` lines each call
produces. This is the "before" column for `docs/specs/token-optimization.md`.

## Demo scenarios

| scenario | API calls | input | output | cache_read | est. cost |
| --- | --- | --- | --- | --- | --- |
| 1. new goal, up to saved plan | 6 | 59,729 | 6,008 | 0 | $0.269 |
| 2. progress check with a warning | 2 | 18,224 | 224 | 0 | $0.058 |
| 2b. three follow-up questions in a row | 4 | 113,932 | 8,895 | 0 | $0.475 |

Customers used: a goal-less customer for scenario 1, a customer with an existing goal and
active warnings (overspent category + behind plan) for scenarios 2 and 2b.

### Per-turn breakdown

**Scenario 1** (4 user turns, 6 `messages.create` calls total):

| turn | calls | input | output | tools called |
| --- | --- | --- | --- | --- |
| "I want to save for a trip..." | 1 | 3,596 | 24 | none |
| "I need about 2000 euros" | 2 | 13,202 | 826 | get_data, get_goal |
| "Yes that's right, set limits..." | 1 | 10,335 | 348 | none |
| "yes save it" | 2 | 32,596 | 4,810 | create_goal, save_plan |

**Scenario 2b** (3 follow-up turns on top of scenario 2, same customer/history):

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
  or raise `max_tokens`) regardless of the cost work.
