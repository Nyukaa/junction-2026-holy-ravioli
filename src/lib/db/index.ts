import { Db } from "./types";
import { Goal, Progress, Plan, Warning } from "@/types/contracts";
import { FakeDb } from "./fake";

// TODO: Alex - implement this with real PostgreSQL queries
// For now, this is a stub that returns empty/default values

class DbImpl implements Db {
  async getGoal(customerId: string): Promise<Goal | null> {
    // TODO: Query goals table for this customer
    return null;
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
    // TODO: Insert into goals table
    throw new Error("Not implemented");
  }

  async getPlan(customerId: string): Promise<Plan | null> {
    // TODO: Query goal_plans table for this customer
    return null;
  }

  async savePlan(
    customerId: string,
    plan: { monthly_savings: number; categories: Record<string, number> }
  ): Promise<Plan> {
    // TODO: Insert/update goal_plans table
    throw new Error("Not implemented");
  }

  async getProgress(customerId: string): Promise<Progress> {
    // TODO: Calculate progress based on goal and transactions
    throw new Error("Not implemented");
  }

  async detectWarnings(customerId: string): Promise<Warning[]> {
    // TODO: Check for spending over plan, upcoming events, etc.
    return [];
  }
}

let db: Db | null = null;

export function getDb(): Db {
  if (!db) {
    db = process.env.DB_BACKEND === "fake" ? new FakeDb() : new DbImpl();
  }
  return db;
}
