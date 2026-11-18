import { Db } from "@/lib/db/types";
import { FinancialData, PlanRow, savePlanSchema } from "@/lib/db/plans";
import { z } from "zod";

interface CompactRow {
  month: string;
  category: string;
  amount_eur: string;
  entry_count: number;
  transaction_types: string[];
  reasons: string[];
}

function formatRowLines(section: string, rows: CompactRow[]): string[] {
  const lines = [section];
  for (const row of rows) {
    lines.push(`${row.month},${row.category},${row.amount_eur},${row.entry_count}`);
  }
  return lines;
}

function formatTypeLines(rows: CompactRow[]): string[] {
  const typesByCategory = new Map<string, Set<string>>();
  for (const row of rows) {
    const types = typesByCategory.get(row.category) ?? new Set<string>();
    for (const type of row.transaction_types) types.add(type);
    typesByCategory.set(row.category, types);
  }
  const lines = ["types"];
  for (const [category, types] of typesByCategory) {
    lines.push(`${category}=${[...types].join(",")}`);
  }
  return lines;
}

function formatReasonLines(rows: CompactRow[]): string[] {
  const reasonRows = rows.filter((row) => row.reasons.length > 0);
  if (reasonRows.length === 0) return [];
  const lines = ["plan_reasons"];
  for (const row of reasonRows) {
    lines.push(`${row.month},${row.category},${row.reasons.join("; ")}`);
  }
  return lines;
}

/**
 * Renders getFinancialData's rows as a compact text table instead of JSON,
 * so the same data costs far fewer tokens: one "month,category,eur,n" line
 * per actual/plan row (same order as the db, no re-grouping), a "types"
 * section listing each category's transaction types once instead of on
 * every row, and a "plan_reasons" section only for plan rows that have one.
 */
function formatFinancialData(data: FinancialData): string {
  const actuals: CompactRow[] = data.actuals.map((row) => ({ ...row, reasons: [] }));
  const plans: CompactRow[] = data.plans;

  const lines: string[] = [`as_of=${data.as_of}`, "columns=month,category,eur,n"];
  lines.push(
    ...formatRowLines("actuals", actuals),
    ...formatRowLines("plans", plans),
    ...formatTypeLines([...actuals, ...plans]),
    ...formatReasonLines(plans),
  );
  return lines.join("\n");
}

/**
 * Renders getPlan's raw PlanRow[] (one row per plan entry, with plan_id and
 * customer_id the model never needs) through the same compact table shape as
 * formatFinancialData, so get_goal's plan costs the same reduced tokens.
 */
function formatPlan(rows: PlanRow[]): string {
  const compactRows: CompactRow[] = rows.map((row) => ({
    // plan_date is a SQL `date`; pg's default parser builds the Date at
    // local midnight, so local getters (not toISOString's UTC) recover the
    // calendar month pg's to_char(plan_date, 'YYYY-MM') would give elsewhere.
    month: `${row.plan_date.getFullYear()}-${String(row.plan_date.getMonth() + 1).padStart(2, "0")}`,
    category: row.category,
    amount_eur: row.plan_amount_eur,
    entry_count: 1,
    transaction_types: [row.transaction_type],
    reasons: row.reason ? [row.reason] : [],
  }));

  const lines: string[] = ["columns=month,category,eur,n"];
  lines.push(
    ...formatRowLines("plan", compactRows),
    ...formatTypeLines(compactRows),
    ...formatReasonLines(compactRows),
  );
  return lines.join("\n");
}

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  db: Db,
  customerId: string,
): Promise<string> {
  try {
    switch (toolName) {
      case "get_goal": {
        const goal = await db.getGoal(customerId);
        if (!goal) {
          return JSON.stringify({ message: "No goal set yet" });
        }
        const progress = await db.getProgress(customerId);
        const plan = await db.getPlan(customerId);
        return JSON.stringify({ goal, progress, plan: formatPlan(plan) });
      }

      case "create_goal": {
        const goal = await db.createGoal(customerId, {
          name: toolInput.name as string,
          target_amount: toolInput.target_amount as number,
          target_date: toolInput.target_date as string,
          reason: (toolInput.reason as string) || undefined,
        });
        return JSON.stringify({
          message: "Goal created",
          goal,
        });
      }

      case "save_plan": {
        const { entries } = savePlanSchema.parse(toolInput);
        await db.savePlan(customerId, entries);
        // entries were just submitted by the model, so it doesn't need them
        // echoed back - a short summary is enough.
        const months = entries
          .map((entry) => entry.plan_date.slice(0, 7))
          .sort((a, b) => a.localeCompare(b));
        return JSON.stringify({
          message: "Plan saved and is now active",
          entries_saved: entries.length,
          months: `${months[0]}..${months.at(-1)}`,
        });
      }

      case "get_data": {
        z.object({}).strict().parse(toolInput);
        return formatFinancialData(await db.getFinancialData(customerId));
      }

      case "detect_issues": {
        const warnings = await db.detectWarnings(customerId);
        return JSON.stringify({ warnings });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    console.error(`Tool ${toolName} failed:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return JSON.stringify({ error: message });
  }
}
