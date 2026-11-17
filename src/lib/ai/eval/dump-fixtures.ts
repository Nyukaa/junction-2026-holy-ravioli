/**
 * Run by hand, not imported by the app. Writes the real results of
 * getFinancialData, getGoal, getProgress and detectWarnings for the given
 * customers into JSON fixture files, so the offline eval can replay them
 * through a mock Db with no Aiven connection.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx src/lib/ai/eval/dump-fixtures.ts <customerId> [<customerId> ...]
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { getDb } from "@/lib/db";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

async function main() {
  const customerIds = process.argv.slice(2);
  if (customerIds.length === 0) {
    console.error(
      "Usage: npx tsx src/lib/ai/eval/dump-fixtures.ts <customerId> [<customerId> ...]"
    );
    process.exit(1);
  }

  mkdirSync(FIXTURES_DIR, { recursive: true });
  const db = getDb();

  for (const customerId of customerIds) {
    const [financialData, goal, progress, warnings] = await Promise.all([
      db.getFinancialData(customerId),
      db.getGoal(customerId),
      db.getProgress(customerId),
      db.detectWarnings(customerId),
    ]);

    const fixture = { customerId, financialData, goal, progress, warnings };
    const filePath = path.join(FIXTURES_DIR, `${customerId}.json`);
    writeFileSync(filePath, JSON.stringify(fixture, null, 2) + "\n");
    console.log(`wrote ${filePath}`);
  }
}

main();
