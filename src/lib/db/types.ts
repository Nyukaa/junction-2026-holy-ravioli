import { Goal, Progress, Warning } from "@/types/contracts";
import { FinancialData, PlanEntryInput, PlanRow } from "./plans";

export interface Db {
  getGoal(customerId: string): Promise<Goal | null>;
  createGoal(
    customerId: string,
    goal: {
      name: string;
      target_amount: number;
      target_date: string;
      reason?: string;
    },
  ): Promise<Goal>;
  getPlan(customerId: string): Promise<PlanRow[]>;
  savePlan(customerId: string, entries: PlanEntryInput[]): Promise<PlanRow[]>;
  getFinancialData(customerId: string): Promise<FinancialData>;
  getProgress(customerId: string): Promise<Progress>;
  detectWarnings(customerId: string): Promise<Warning[]>;
}
