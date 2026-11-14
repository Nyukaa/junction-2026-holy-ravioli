import { Db } from "./types";
import { Goal, Progress, Warning } from "@/types/contracts";
import { FakeDb } from "./fake";
import { getPool } from "./pool";
import {
  FinancialData,
  MonthlyCategoryTotal,
  MonthlyPlanTotal,
  PlanEntryInput,
  PlanRow,
  savePlanSchema,
} from "./plans";

// Goal/progress methods remain stubs until their database implementation is ready.

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
    },
  ): Promise<Goal> {
    // TODO: Insert into goals table
    throw new Error("Not implemented");
  }

  async getPlan(customerId: string): Promise<PlanRow[]> {
    const result = await getPool().query<PlanRow>(
      `SELECT * FROM app.plans
       WHERE customer_id = $1
       ORDER BY plan_date, category, plan_id`,
      [customerId],
    );
    return result.rows;
  }

  async savePlan(
    customerId: string,
    entries: PlanEntryInput[],
  ): Promise<PlanRow[]> {
    const validated = savePlanSchema.parse({ entries }).entries;
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      // Serialize replacements without needing write privileges on raw customers.
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
        [customerId],
      );
      const customer = await client.query(
        "SELECT customer_id FROM junction.cust WHERE customer_id = $1",
        [customerId],
      );
      if (customer.rowCount !== 1) {
        throw new Error("Unknown customer");
      }

      const clock = await client.query<{ today: string }>(
        "SELECT to_char(today, 'YYYY-MM-DD') AS today FROM app.demo_clock WHERE singleton = true",
      );
      if (!clock.rows[0]) {
        throw new Error("Demo clock is not configured");
      }
      const known = await client.query<{
        category: string;
        transaction_type: string;
      }>(
        `SELECT DISTINCT category, transaction_type FROM junction.tx
         WHERE customer_id = $1 AND tx_date <= $2::date`,
        [customerId, clock.rows[0].today],
      );
      const categories = new Set(known.rows.map((row) => row.category));
      const transactionTypes = new Set(
        known.rows.map((row) => row.transaction_type),
      );
      for (const entry of validated) {
        if (
          !categories.has(entry.category) ||
          !transactionTypes.has(entry.transaction_type)
        ) {
          throw new Error(
            "Use categories and transaction types from this customer's transaction data",
          );
        }
      }

      await client.query("DELETE FROM app.plans WHERE customer_id = $1", [
        customerId,
      ]);
      const result = await client.query<PlanRow>(
        `INSERT INTO app.plans
           (customer_id, plan_date, plan_timestamp, category,
            plan_amount_eur, transaction_type, reason)
         SELECT $1, entry.plan_date, entry.plan_timestamp, entry.category,
                entry.plan_amount_eur, entry.transaction_type, entry.reason
         FROM jsonb_to_recordset($2::jsonb) AS entry(
           plan_date date, plan_timestamp timestamp, category text,
           plan_amount_eur numeric(12,2), transaction_type text, reason text)
         RETURNING *`,
        [customerId, JSON.stringify(validated)],
      );
      await client.query("COMMIT");
      return result.rows;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getFinancialData(customerId: string): Promise<FinancialData> {
    const pool = getPool();
    const clock = await pool.query<{ today: string }>(
      "SELECT to_char(today, 'YYYY-MM-DD') AS today FROM app.demo_clock WHERE singleton = true",
    );
    const today = clock.rows[0]?.today;
    if (!today) {
      throw new Error("Demo clock is not configured");
    }
    const [actuals, plans] = await Promise.all([
      pool.query<MonthlyCategoryTotal>(
        `SELECT to_char(tx_date, 'YYYY-MM') AS month, category,
                SUM(tx_amount_eur)::text AS amount_eur,
                COUNT(*)::int AS entry_count,
                array_agg(DISTINCT transaction_type ORDER BY transaction_type) AS transaction_types
         FROM junction.tx
         WHERE customer_id = $1 AND tx_date <= $2::date
           AND transaction_type NOT IN
               ('salary_sweep', 'investment_deposit', 'investment_withdrawal')
         GROUP BY to_char(tx_date, 'YYYY-MM'), category
         ORDER BY month, category`,
        [customerId, today],
      ),
      pool.query<MonthlyPlanTotal>(
        `SELECT to_char(plan_date, 'YYYY-MM') AS month, category,
                SUM(plan_amount_eur)::text AS amount_eur,
                COUNT(*)::int AS entry_count,
                array_agg(DISTINCT transaction_type ORDER BY transaction_type) AS transaction_types,
                COALESCE(
                  array_agg(DISTINCT reason ORDER BY reason) FILTER (WHERE reason IS NOT NULL),
                  ARRAY[]::text[]
                ) AS reasons
         FROM app.plans
         WHERE customer_id = $1
           AND transaction_type NOT IN
               ('salary_sweep', 'investment_deposit', 'investment_withdrawal')
         GROUP BY to_char(plan_date, 'YYYY-MM'), category
         ORDER BY month, category`,
        [customerId],
      ),
    ]);
    return { as_of: today, actuals: actuals.rows, plans: plans.rows };
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
