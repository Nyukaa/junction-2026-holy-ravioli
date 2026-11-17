import { Db } from "@/lib/db/types";
import { Goal, Progress, Warning } from "@/types/contracts";
import {
  FinancialData,
  PlanEntryInput,
  PlanRow,
  savePlanSchema,
} from "@/lib/db/plans";
import { createGoalSchema } from "@/lib/db/logic/goals";

/** Shape written by `dump-fixtures.ts` for one customer. */
export interface EvalFixture {
  customerId: string;
  financialData: FinancialData;
  goal: Goal | null;
  progress: Progress;
  warnings: Warning[];
}

/**
 * In-memory Db for the offline eval: no Aiven connection, deterministic.
 * Read methods replay the fixture as-is. Write methods validate like the
 * real db where that is cheap (no DB round trip) and keep what they were
 * given so a grader can inspect exactly what the agent tried to save.
 */
export function createMockDb(fixture: EvalFixture): Db {
  let goal: Goal | null = fixture.goal;
  // Not captured by dump-fixtures.ts, so every eval run starts with no
  // saved plan regardless of what the real customer has today.
  let plan: PlanRow[] = [];
  let nextPlanId = 1;

  return {
    async getGoal(): Promise<Goal | null> {
      return goal;
    },

    async createGoal(
      customerId: string,
      input: {
        name: string;
        target_amount: number;
        target_date: string;
        reason?: string;
      },
    ): Promise<Goal> {
      const validated = createGoalSchema.parse(input);
      if (validated.target_date <= fixture.financialData.as_of) {
        throw new Error(
          "Goal target date must be after the demo clock's current day",
        );
      }
      goal = {
        id: `mock-${customerId}-goal`,
        customer_id: customerId,
        name: validated.name,
        target_amount: validated.target_amount,
        target_date: validated.target_date,
        reason: validated.reason,
        created_at: fixture.financialData.as_of,
      };
      return goal;
    },

    async getPlan(): Promise<PlanRow[]> {
      return plan;
    },

    async savePlan(
      customerId: string,
      entries: PlanEntryInput[],
    ): Promise<PlanRow[]> {
      const validated = savePlanSchema.parse({ entries }).entries;
      // save_plan replaces ALL previous entries for this customer.
      plan = validated.map((entry) => ({
        plan_id: String(nextPlanId++),
        customer_id: customerId,
        plan_date: new Date(entry.plan_date),
        plan_timestamp: new Date(entry.plan_timestamp),
        category: entry.category,
        plan_amount_eur: entry.plan_amount_eur,
        transaction_type: entry.transaction_type,
        reason: entry.reason,
      }));
      return plan;
    },

    async getFinancialData(): Promise<FinancialData> {
      return fixture.financialData;
    },

    async getProgress(): Promise<Progress> {
      return fixture.progress;
    },

    async detectWarnings(): Promise<Warning[]> {
      return fixture.warnings;
    },
  };
}
