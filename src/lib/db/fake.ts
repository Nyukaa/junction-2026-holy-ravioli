import { Db } from "./types";
import { Goal, Progress, Plan, Warning } from "@/types/contracts";

// In-memory fake Db with fixtures, so the chat/status routes work
// before Alex's real PostgreSQL implementation is ready.
// Enable with DB_BACKEND=fake in .env.local

const goals = new Map<string, Goal>();
const plans = new Map<string, Plan>();

export class FakeDb implements Db {
  async getGoal(customerId: string): Promise<Goal | null> {
    return goals.get(customerId) ?? null;
  }

  async createGoal(
    customerId: string,
    goal: {
      name: string;
      target_amount: number;
      target_date: string;
      reason?: string;
    }
  ): Promise<Goal> {
    const created: Goal = {
      id: `goal_${customerId}`,
      customer_id: customerId,
      name: goal.name,
      target_amount: goal.target_amount,
      target_date: goal.target_date,
      reason: goal.reason,
      created_at: new Date().toISOString(),
    };
    goals.set(customerId, created);
    return created;
  }

  async getPlan(customerId: string): Promise<Plan | null> {
    return plans.get(customerId) ?? null;
  }

  async savePlan(
    customerId: string,
    plan: { monthly_savings: number; categories: Record<string, number> }
  ): Promise<Plan> {
    const saved: Plan = {
      monthly_savings: plan.monthly_savings,
      categories: plan.categories,
      created_at: new Date().toISOString(),
    };
    plans.set(customerId, saved);
    return saved;
  }

  async getProgress(customerId: string): Promise<Progress> {
    const goal = goals.get(customerId);
    if (!goal) {
      return {
        saved_amount: 0,
        remaining_amount: 0,
        percentage: 0,
        on_track: true,
      };
    }
    // Fixture: pretend the customer already saved 600
    const saved_amount = 600;
    return {
      saved_amount,
      remaining_amount: goal.target_amount - saved_amount,
      percentage: Math.round((saved_amount / goal.target_amount) * 100),
      on_track: true,
    };
  }

  async detectWarnings(customerId: string): Promise<Warning[]> {
    const goal = goals.get(customerId);
    if (!goal) return [];

    // Fixture: scenario 2 - unexpected laptop repair
    return [
      {
        type: "spending_over",
        message: "Unexpected €500 laptop repair. You're now €500 behind plan.",
        severity: "high",
        suggested_action:
          "Cut €500 from dining/shopping this month, or delay your goal by one month.",
      },
    ];
  }
}
