// Scratch script: dumps getFinancialData/getProgress/detectWarnings for a couple of
// real customers, so a before/after diff can confirm a refactor didn't change behavior.
// getGoalSnapshot itself is private to DbImpl, so this goes through the two public
// methods that call it (getProgress, detectWarnings) instead.
//
// Usage: npx tsx scripts/snapshot-check.ts <output-path.json>

import { writeFileSync } from "node:fs";
import { getDb } from "../src/lib/db";
import { getPool } from "../src/lib/db/pool";

async function main() {
  const outPath = process.argv[2];
  if (!outPath) {
    console.error("Usage: npx tsx scripts/snapshot-check.ts <output-path.json>");
    process.exit(1);
  }

  const pool = getPool();
  const { rows } = await pool.query<{ customer_id: string }>(
    "SELECT DISTINCT customer_id FROM junction.cust ORDER BY customer_id LIMIT 2",
  );
  const customerIds = rows.map((r) => r.customer_id);
  if (customerIds.length === 0) {
    throw new Error("No customers found in junction.cust");
  }

  const db = getDb();
  const snapshot: Record<string, unknown> = {};
  for (const customerId of customerIds) {
    snapshot[customerId] = {
      financialData: await db.getFinancialData(customerId),
      progress: await db.getProgress(customerId),
      warnings: await db.detectWarnings(customerId),
    };
  }

  writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(`Wrote snapshot for ${customerIds.join(", ")} to ${outPath}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
