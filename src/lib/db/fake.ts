import { Db } from "./types";
import { Goal, Progress, Warning } from "@/types/contracts";
import {
  FinancialData,
  MonthlyPlanTotal,
  PlanEntryInput,
  PlanRow,
  savePlanSchema,
} from "./plans";

// In-memory fake Db with fixtures, so the chat/status routes work
// before Alex's real PostgreSQL implementation is ready.
// Enable with DB_BACKEND=fake in .env.local

const goals = new Map<string, Goal>();
const plans = new Map<string, PlanRow[]>();
let nextPlanId = 1;
const fakeToday = "2024-10-31";
const transferTypes = new Set([
  "salary_sweep",
  "investment_deposit",
  "investment_withdrawal",
]);

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
    },
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

  async getPlan(customerId: string): Promise<PlanRow[]> {
    return plans.get(customerId) ?? [];
  }

  async savePlan(
    customerId: string,
    entries: PlanEntryInput[],
  ): Promise<PlanRow[]> {
    const validated = savePlanSchema.parse({ entries }).entries;
    const data = await this.getFinancialData(customerId);
    const categories = new Set(data.actuals.map((row) => row.category));
    const types = new Set(data.actuals.flatMap((row) => row.transaction_types));
    for (const entry of validated) {
      if (
        !categories.has(entry.category) ||
        !types.has(entry.transaction_type)
      ) {
        throw new Error(
          "Use categories and transaction types from this customer's transaction data",
        );
      }
    }
    const saved: PlanRow[] = validated.map((entry) => ({
      ...entry,
      plan_id: String(nextPlanId++),
      customer_id: customerId,
      plan_date: new Date(`${entry.plan_date}T00:00:00`),
      plan_timestamp: new Date(entry.plan_timestamp),
    }));
    plans.set(customerId, saved);
    return saved;
  }

  async getFinancialData(customerId: string): Promise<FinancialData> {
    const grouped = new Map<string, MonthlyPlanTotal>();
    for (const entry of plans.get(customerId) ?? []) {
      if (transferTypes.has(entry.transaction_type)) continue;
      const month = `${entry.plan_date.getFullYear()}-${String(
        entry.plan_date.getMonth() + 1,
      ).padStart(2, "0")}`;
      const key = JSON.stringify([month, entry.category]);
      const group = grouped.get(key) ?? {
        month,
        category: entry.category,
        amount_eur: "0.00",
        entry_count: 0,
        transaction_types: [],
        reasons: [],
      };
      const cents =
        BigInt(group.amount_eur.replace(".", "")) +
        BigInt(entry.plan_amount_eur.replace(".", ""));
      const absolute = cents < BigInt(0) ? -cents : cents;
      group.amount_eur = `${cents < BigInt(0) ? "-" : ""}${absolute / BigInt(100)}.${String(
        absolute % BigInt(100),
      ).padStart(2, "0")}`;
      group.entry_count++;
      if (!group.transaction_types.includes(entry.transaction_type)) {
        group.transaction_types.push(entry.transaction_type);
      }
      if (entry.reason && !group.reasons.includes(entry.reason)) {
        group.reasons.push(entry.reason);
      }
      grouped.set(key, group);
    }
    return {
      as_of: fakeToday,
      actuals: [
        {
          month: "2024-10",
          category: "dining",
          amount_eur: "-180.00",
          entry_count: 6,
          transaction_types: ["card_payment"],
        },
        {
          month: "2024-10",
          category: "groceries",
          amount_eur: "-320.00",
          entry_count: 8,
          transaction_types: ["card_payment"],
        },
        {
          month: "2024-10",
          category: "salary",
          amount_eur: "2400.00",
          entry_count: 1,
          transaction_types: ["salary"],
        },
        {
          month: "2024-10",
          category: "transport",
          amount_eur: "-80.00",
          entry_count: 4,
          transaction_types: ["card_payment"],
        },
      ],
      plans: [...grouped.values()]
        .map((group) => ({
          ...group,
          transaction_types: group.transaction_types.sort(),
          reasons: group.reasons.sort(),
        }))
        .sort(
          (a, b) =>
            a.month.localeCompare(b.month) ||
            a.category.localeCompare(b.category),
        ),
    };
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
