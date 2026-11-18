import { Db } from "@/lib/db/types";
import { FinancialData, savePlanSchema } from "@/lib/db/plans";
import { z } from "zod";

/**
 * Renders getFinancialData's rows as a compact text table instead of JSON,
 * so the same data costs far fewer tokens: one "month,category,eur,n" line
 * per actual/plan row (same order as the db, no re-grouping), a "types"
 * section listing each category's transaction types once instead of on
 * every row, and a "plan_reasons" section only for plan rows that have one.
 */
function formatFinancialData(data: FinancialData): string {
  const lines: string[] = [];
  lines.push(`as_of=${data.as_of}`);
  lines.push("columns=month,category,eur,n");

  lines.push("actuals");
  for (const row of data.actuals) {
    lines.push(`${row.month},${row.category},${row.amount_eur},${row.entry_count}`);
  }

  lines.push("plans");
  for (const row of data.plans) {
    lines.push(`${row.month},${row.category},${row.amount_eur},${row.entry_count}`);
  }

  const typesByCategory = new Map<string, Set<string>>();
  for (const row of [...data.actuals, ...data.plans]) {
    const types = typesByCategory.get(row.category) ?? new Set<string>();
    for (const type of row.transaction_types) types.add(type);
    typesByCategory.set(row.category, types);
  }
  lines.push("types");
  for (const [category, types] of typesByCategory) {
    lines.push(`${category}=${[...types].join(",")}`);
  }

  const reasonRows = data.plans.filter((row) => row.reasons.length > 0);
  if (reasonRows.length > 0) {
    lines.push("plan_reasons");
    for (const row of reasonRows) {
      lines.push(`${row.month},${row.category},${row.reasons.join("; ")}`);
    }
  }

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
        return JSON.stringify({ goal, progress, plan });
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
        const plan = await db.savePlan(customerId, entries);
        return JSON.stringify({
          message: "Plan saved and is now active",
          plan,
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
