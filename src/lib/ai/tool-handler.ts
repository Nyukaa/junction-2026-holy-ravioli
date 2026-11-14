import { Db } from "@/lib/db/types";

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  db: Db,
  customerId: string
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
        const plan = await db.savePlan(customerId, {
          monthly_savings: toolInput.monthly_savings as number,
          categories: toolInput.categories as Record<string, number>,
        });
        return JSON.stringify({
          message: "Plan saved and is now active",
          plan,
        });
      }

      case "detect_issues": {
        const warnings = await db.detectWarnings(customerId);
        return JSON.stringify({ warnings });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return JSON.stringify({ error: message });
  }
}
