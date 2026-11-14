import { Goal, Progress, Plan, Warning } from "@/types/contracts";

export interface Db {
  getGoal(customerId: string): Promise<Goal | null>;
  createGoal(
    customerId: string,
    goal: {
      name: string;
      target_amount: number;
      target_date: string;
      reason?: string;
    }
  ): Promise<Goal>;
  getPlan(customerId: string): Promise<Plan | null>;
  savePlan(
    customerId: string,
    plan: { monthly_savings: number; categories: Record<string, number> }
  ): Promise<Plan>;
  getProgress(customerId: string): Promise<Progress>;
  detectWarnings(customerId: string): Promise<Warning[]>;
}
