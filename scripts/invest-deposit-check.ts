// Scratch script (no Anthropic API calls): verifies Step 5's category-based transfer
// filter still excludes Invest Deposit from spending/progress math, by actually saving
// a plan with an Invest Deposit entry through the real savePlan and comparing getProgress
// /detectWarnings before/after. Also runs a positive control with a normal spending entry
// (Restaurants), which must show a change — otherwise the Invest Deposit case proves
// nothing (it could "pass" just because nothing in this plumbing reacts to new entries
// at all). savePlan replaces a customer's whole plan, so the original rows are read first
// (formatted as savePlanSchema expects, straight from SQL to avoid JS Date/timezone
// round-tripping) and written back after each case to restore the customer's plan exactly.
//
// Usage: npx tsx scripts/invest-deposit-check.ts

import { getDb } from "../src/lib/db";
import type { Db } from "../src/lib/db/types";
import { getPool } from "../src/lib/db/pool";
import type { PlanEntryInput } from "../src/lib/db/plans";
import type { Progress, Warning } from "../src/types/contracts";

const CUSTOMER_ID = "CUST00001"; // has an active goal and real Invest Deposit actuals

function sameProgress(a: Progress, b: Progress): boolean {
  return (
    a.saved_amount === b.saved_amount &&
    a.remaining_amount === b.remaining_amount &&
    a.percentage === b.percentage &&
    a.on_track === b.on_track
  );
}

interface Case {
  label: string;
  category: string;
  planAmountEur: string;
  reason: string;
  /** Whether getProgress/detectWarnings are expected to change when this entry is added. */
  expectChange: boolean;
}

const CASES: Case[] = [
  {
    label: "Invest Deposit (transfer, should be excluded)",
    category: "Invest Deposit",
    planAmountEur: "-50.00",
    reason: "Scratch test: verify Invest Deposit is excluded from spending/progress math.",
    expectChange: false,
  },
  {
    label: "Restaurants (positive control, normal spending, should count)",
    category: "Restaurants",
    planAmountEur: "-50.00",
    reason: "Scratch test: positive control, a normal spending entry must affect progress.",
    expectChange: true,
  },
];

async function runCase(
  db: Db,
  originalEntries: PlanEntryInput[],
  windowEntry: PlanEntryInput,
  progressBefore: Progress,
  warningsBefore: Warning[],
  testCase: Case,
) {
  console.log(`\n--- ${testCase.label} ---`);
  console.log("progress before:", progressBefore);
  console.log("warnings before:", JSON.stringify(warningsBefore));

  try {
    const testEntry: PlanEntryInput = {
      plan_date: windowEntry.plan_date,
      plan_timestamp: windowEntry.plan_timestamp,
      category: testCase.category,
      plan_amount_eur: testCase.planAmountEur,
      reason: testCase.reason,
    };
    await db.savePlan(CUSTOMER_ID, [...originalEntries, testEntry]);

    const progressAfter = await db.getProgress(CUSTOMER_ID);
    const warningsAfter = await db.detectWarnings(CUSTOMER_ID);
    console.log("progress after:", progressAfter);
    console.log("warnings after:", JSON.stringify(warningsAfter));

    const changed =
      !sameProgress(progressAfter, progressBefore) ||
      JSON.stringify(warningsAfter) !== JSON.stringify(warningsBefore);
    const ok = changed === testCase.expectChange;
    console.log(
      ok
        ? `PASS: ${testCase.expectChange ? "progress/warnings changed, as expected" : "progress/warnings unchanged, as expected"}.`
        : `FAIL: expected ${testCase.expectChange ? "a change" : "no change"}, got ${changed ? "a change" : "no change"}.`,
    );
  } finally {
    await db.savePlan(CUSTOMER_ID, originalEntries);
    const progressRestored = await db.getProgress(CUSTOMER_ID);
    const warningsRestored = await db.detectWarnings(CUSTOMER_ID);
    const restored =
      sameProgress(progressRestored, progressBefore) &&
      JSON.stringify(warningsRestored) === JSON.stringify(warningsBefore);
    console.log(
      restored
        ? "Cleanup OK: test row removed, plan and progress restored to baseline."
        : "Cleanup WARNING: restored progress/warnings do not match baseline, check app.plans by hand.",
    );
  }
}

async function main() {
  const pool = getPool();
  const db = getDb();

  const backupResult = await pool.query<PlanEntryInput>(
    `SELECT to_char(plan_date, 'YYYY-MM-DD') AS plan_date,
            to_char(plan_timestamp, 'YYYY-MM-DD"T"HH24:MI:SS') AS plan_timestamp,
            category, plan_amount_eur::text AS plan_amount_eur, reason
     FROM app.plans WHERE customer_id = $1 ORDER BY plan_id`,
    [CUSTOMER_ID],
  );
  const originalEntries = backupResult.rows;
  if (originalEntries.length === 0) {
    throw new Error(`${CUSTOMER_ID} has no existing plan rows to restore afterward`);
  }

  // getGoalSnapshot's savings_categories only counts plan_date in (goal.created_at, today] —
  // pick an existing row that actually falls in that window, not just entries[0] (which may
  // land in the goal-creation month itself and be silently excluded, masking any real effect).
  const goal = await db.getGoal(CUSTOMER_ID);
  if (!goal) throw new Error(`${CUSTOMER_ID} has no active goal`);
  const { as_of: today } = await db.getFinancialData(CUSTOMER_ID);
  const windowEntry = originalEntries.find(
    (e) => e.plan_date > goal.created_at.slice(0, 10) && e.plan_date <= today,
  );
  if (!windowEntry) {
    throw new Error(
      `No existing plan row for ${CUSTOMER_ID} falls within (${goal.created_at.slice(0, 10)}, ${today}] — can't pick a date that the progress math actually counts`,
    );
  }

  const progressBefore = await db.getProgress(CUSTOMER_ID);
  const warningsBefore = await db.detectWarnings(CUSTOMER_ID);

  for (const testCase of CASES) {
    await runCase(db, originalEntries, windowEntry, progressBefore, warningsBefore, testCase);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
