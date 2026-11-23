// Scratch script (no Anthropic API calls, no DB): exercises the real entries_csv parser
// (src/lib/ai/tool-handler.ts's parseEntriesCsv, exported for this) against the edge
// cases Step 7 of docs/specs/drop-plan-transaction-type.md calls out: a reason containing
// a comma, CRLF line endings, a trailing empty line, and a line with the wrong number of
// fields (which must fail clearly instead of silently misparsing).
//
// Usage: npx tsx scripts/parse-entries-csv-check.ts

import { parseEntriesCsv } from "../src/lib/ai/tool-handler";

let allOk = true;

function expectOk(label: string, csv: string, expected: Record<string, string>[]) {
  try {
    const got = parseEntriesCsv(csv);
    const ok = JSON.stringify(got) === JSON.stringify(expected);
    console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
    if (!ok) {
      console.log("  expected:", JSON.stringify(expected));
      console.log("  got:     ", JSON.stringify(got));
      allOk = false;
    }
  } catch (err) {
    console.log(`FAIL ${label}: threw unexpectedly - ${(err as Error).message}`);
    allOk = false;
  }
}

function expectError(label: string, csv: string) {
  try {
    const got = parseEntriesCsv(csv);
    console.log(`FAIL ${label}: expected an error, got ${JSON.stringify(got)}`);
    allOk = false;
  } catch (err) {
    console.log(`PASS ${label}: threw as expected - ${(err as Error).message}`);
  }
}

// 1. Reason containing a comma - only the first 4 commas are field separators.
expectOk(
  "reason with a comma",
  "2026-09-30,2026-09-30T12:00:00,Restaurants,-45.00,Cut dining out, save for the trip",
  [
    {
      plan_date: "2026-09-30",
      plan_timestamp: "2026-09-30T12:00:00",
      category: "Restaurants",
      plan_amount_eur: "-45.00",
      reason: "Cut dining out, save for the trip",
    },
  ],
);

// 2. CRLF line endings between two entries.
expectOk(
  "CRLF line endings",
  "2026-09-30,2026-09-30T12:00:00,Restaurants,-45.00,Trim dining out\r\n" +
    "2026-10-31,2026-10-31T12:00:00,Groceries,-20.00,Trim groceries a little",
  [
    {
      plan_date: "2026-09-30",
      plan_timestamp: "2026-09-30T12:00:00",
      category: "Restaurants",
      plan_amount_eur: "-45.00",
      reason: "Trim dining out",
    },
    {
      plan_date: "2026-10-31",
      plan_timestamp: "2026-10-31T12:00:00",
      category: "Groceries",
      plan_amount_eur: "-20.00",
      reason: "Trim groceries a little",
    },
  ],
);

// 3. Trailing empty line - must be ignored, not treated as an entry or an error.
expectOk(
  "trailing empty line",
  "2026-09-30,2026-09-30T12:00:00,Restaurants,-45.00,Trim dining out\n\n",
  [
    {
      plan_date: "2026-09-30",
      plan_timestamp: "2026-09-30T12:00:00",
      category: "Restaurants",
      plan_amount_eur: "-45.00",
      reason: "Trim dining out",
    },
  ],
);

// 4. Wrong number of fields (reason missing entirely) - must give a clear error.
expectError("wrong number of fields", "2026-09-30,2026-09-30T12:00:00,Restaurants,-45.00");

console.log(allOk ? "\nAll parseEntriesCsv checks passed." : "\nSome parseEntriesCsv checks FAILED.");
if (!allOk) process.exit(1);
