# Spec: drop transaction_type from app.plans

**Owner:** Anna (both sides this time — Alex gave the OK)
**Branch:** work on main, per your decision

## Goal

`transaction_type` on a planned entry is never used for any decision — it's always a
placeholder. Stop using it: from what the model writes and from every query that touches
it. The `app.plans` column itself stays (made nullable, not dropped — might be useful
again later). `junction.tx` (real transactions) keeps its own `transaction_type`
untouched — this is only about `app.plans`.

## Why this touches more than tools.ts

`transaction_type` on `app.plans` is used in 3 places besides the insert itself:
1. `savePlan`'s validation (checks the model didn't invent a type)
2. `getFinancialData`'s plan query (returns it in `transaction_types`, and uses it to
   exclude transfers — `Salary Sweep`, `Invest Withdraw`, `Invest Deposit` — from spending)
3. `getGoalSnapshot`'s three queries (same transfer-exclusion filter, for progress/warnings)

All 3 need to switch to filtering by **category** instead, since the category list for
transfers is already fixed (`categories.ts`'s "moves" + "invest" groups: `Salary Sweep`,
`Invest Withdraw`, `Invest Deposit`). Getting this wrong silently breaks progress/warning
math, which is why this is split into small, separately-verified steps.

## Out of scope

- `junction.tx.transaction_type` — untouched, actuals keep their real type
- The "exceptions"/aggregation idea for `save_plan` — not doing that, still one entry per
  month per category (per your earlier decision)

---

## Step 1 — migration (make the column nullable, don't drop it yet)

**File:** `db/migrations/005_plans_transaction_type_nullable.sql` (new — never edit 002)

```sql
-- Apply after 004_app_goals.sql.
-- transaction_type on app.plans was never used for any decision (always a
-- placeholder for planned entries). This only drops the NOT NULL constraint so
-- Steps 2-7 can stop writing it; the column itself is dropped later, in Step 8,
-- once nothing in the app reads or writes it anymore. junction.tx keeps its
-- real transaction_type untouched throughout.
ALTER TABLE app.plans ALTER COLUMN transaction_type DROP NOT NULL;
```

Apply it: `psql "$DATABASE_URL" -f db/migrations/005_plans_transaction_type_nullable.sql`

**Done when:** the column is nullable on Aiven. App code still writes/reads it until
Step 2, so nothing breaks yet — this migration is safe to apply ahead of the code change.

---

## Step 2 — types

**File:** `src/lib/db/plans.ts`

- `PlanRow`: remove `transaction_type`.
- `NewPlan`: remove it from the `Omit<...>` base type too.
- `savePlanSchema` / `PlanEntryInput`: remove the `transaction_type` field and its zod
  validator.
- `MonthlyCategoryTotal` currently has `transaction_types: string[]` — this must stay for
  **actuals** (junction.tx still has real types). Split `MonthlyPlanTotal` so it does NOT
  extend `MonthlyCategoryTotal` anymore (or extend a smaller shared base without
  `transaction_types`) — plans no longer have transaction types to report.

**Done when:** `npx tsc --noEmit` shows the resulting errors in `db/index.ts` and
`tool-handler.ts` (expected at this point — fix those next, don't silence anything here).

---

## Step 3 — db/index.ts: savePlan

- Remove the `transactionTypes` set and the `!transactionTypes.has(entry.transaction_type)`
  check from the validation loop — **keep** the `!categories.has(entry.category)` check
  exactly as it is. Category validation against known categories is not going away; only
  the transaction-type half of this validation is being removed.
- `known` query: drop `transaction_type` from its `SELECT DISTINCT` (categories only now).
- The `INSERT ... SELECT ... FROM jsonb_to_recordset($2::jsonb) AS entry(...)` — remove
  `transaction_type text` from that column list and from the `INSERT`'s column list.

**Done when:** `npx tsc --noEmit` passes for this function.

---

## Step 4 — db/index.ts: getFinancialData

- The plans query: remove `array_agg(DISTINCT transaction_type ...) AS transaction_types`.
- Its `WHERE ... transaction_type NOT IN ('salary_sweep', 'investment_deposit',
  'investment_withdrawal')` → replace with
  `category NOT IN ('Salary Sweep', 'Invest Withdraw', 'Invest Deposit')` (exact category
  names from `categories.ts`'s "moves" + "invest" groups — copy them from there, don't
  retype by hand).
- The actuals query (junction.tx) is untouched — it still has real transaction types and
  still filters by `transaction_type NOT IN (...)`, unchanged.

**Done when:** `npx tsc --noEmit` passes. Manually sanity-check one customer's
`getFinancialData` plan rows still exclude any Invest Deposit entries from being counted
as spending.

---

## Step 5 — db/index.ts: getGoalSnapshot

Same substitution, 3 places (`savings`, `savings_categories`, `categories` CTEs) — every
`app.plans ... transaction_type NOT IN (...)` becomes
`category NOT IN ('Salary Sweep', 'Invest Withdraw', 'Invest Deposit')`.

**This is the correctness-sensitive one** — it feeds `getProgress`/`detectWarnings`
directly. Verify concretely, not just by reading the diff:

```
For a customer with an active goal, save a plan that includes one Invest Deposit entry
(simulating the "use investments as a piggy bank" flow) plus normal spending entries.
Then call getProgress and getGoalSnapshot's categories for that customer directly, and
confirm the Invest Deposit entry is still excluded from spending/progress math, exactly
as before this change.
```

**Done when:** that check passes and `npx tsc --noEmit` / `npm run lint` pass for the
whole file.

---

## Step 6 — src/lib/ai/tool-handler.ts: formatPlan

`formatPlan` currently builds `transaction_types: [row.transaction_type]` per row — that
field no longer exists on `PlanRow`. Drop the "types" section entirely for plan output
(only `get_data`'s actuals still have real types to show); `formatPlan` becomes: plan rows
+ `plan_reasons`, no `types` block.

**Done when:** `npx tsc --noEmit`, `npm run lint`, and the grader self-tests
(`npx tsx src/lib/ai/eval/graders.ts`) all pass.

---

## Step 7 — the compact save_plan input (the part we already designed)

Now that `transaction_type` is gone from the data model entirely, this is simpler than
originally planned — no "resolve it server-side" logic needed, there's nothing to resolve.

**Files:** `src/lib/ai/tools.ts`, `src/lib/ai/tool-handler.ts`

- `save_plan`'s `input_schema`: replace the `entries` array-of-objects with a single
  string field (e.g. `entries_csv`), one line per entry, no header, 5 comma-separated
  fields: `plan_date,plan_timestamp,category,plan_amount_eur,reason`. Update the
  description with this exact format and one example line. Keep the existing
  `plan_amount_eur` format rule (signed, two decimals) in the description.
- `tool-handler.ts`: parse `entries_csv` line by line with a regex split on the first 4
  commas (not a naive `.split(",")` — `reason` is free text and may contain a comma),
  build the `PlanEntryInput[]` shape (now only 4 fields per entry), pass to
  `db.savePlan` unchanged otherwise.
- Keep one line per month per category — still no aggregation/exceptions.

**Done when:** `npx tsc --noEmit`, `npm run lint`, grader self-tests pass. No live model
call needed to verify the parser — write 2-3 example CSV lines by hand in a scratch script
and confirm they parse into the expected objects.

---

## Step 8 — verify the column is unused (no column drop)

No migration here — the column stays, nullable, in case it's useful again later. This
step only confirms the app has actually stopped touching it, once Steps 2-7 are deployed.

```
grep -rn transaction_type src docs
```

**Done when:** that grep returns nothing except hits inside migration files themselves
(`db/migrations/005_plans_transaction_type_nullable.sql`) and this spec, which necessarily
talks about the migration by name. Any hit in actual app code (`src/lib/db/*`,
`src/lib/ai/*`) at this point is a bug — something from Steps 2-7 was missed. The column
itself stays on `app.plans`, nullable and unused — dropping it is a separate decision for
later, not part of this spec.

---

## Done when (whole spec)

- [ ] Migration applied on Aiven (005 makes the column nullable), nothing in
      `002_app_plans.sql` edited, column not dropped
- [ ] `grep -rn transaction_type src docs` returns nothing except hits inside migration
      files and this spec (Step 8's check)
- [ ] The Invest Deposit exclusion check from Step 5 passes
- [ ] `npx tsc --noEmit`, `npm run lint`, grader self-tests all pass
- [ ] Committed (can be one commit or a few small ones, your call), pushed