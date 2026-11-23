import { Db } from "./types";
import { Goal, Progress, Warning } from "@/types/contracts";
import { CATEGORY_GROUPS } from "@/lib/categories";
import { getPool } from "./pool";
import type { Pool, PoolClient } from "pg";
import {
  calculateProgress,
  calculateWarnings,
  centsToAmount,
  createGoalSchema,
  moneyToCents,
  type CategoryBudget,
  type GoalSnapshot,
  type MonthlyCategoryBudget,
} from "./logic/goals";
import {
  FinancialData,
  MonthlyCategoryTotal,
  MonthlyPlanTotal,
  PlanEntryInput,
  PlanRow,
  savePlanSchema,
} from "./plans";

// Plans have no transaction_type to filter transfers by (Step 1-3 of
// docs/specs/drop-plan-transaction-type.md); category is already a 1:1 stand-in for
// the "moves" + "invest" groups (Salary Sweep, Invest Withdraw, Invest Deposit).
const TRANSFER_CATEGORIES = CATEGORY_GROUPS.filter(
  (g) => g.id === "moves" || g.id === "invest",
).flatMap((g) => g.categories);

interface GoalRow {
  id: string;
  customer_id: string;
  name: string;
  target_amount_eur: string;
  target_date: string;
  reason: string | null;
  created_at: string;
}

const goalColumns = `
  goal_id::text AS id, customer_id, name, target_amount_eur::text,
  to_char(target_date, 'YYYY-MM-DD') AS target_date, reason,
  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at`;

function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    customer_id: row.customer_id,
    name: row.name,
    target_amount: centsToAmount(moneyToCents(row.target_amount_eur)),
    target_date: row.target_date,
    ...(row.reason === null ? {} : { reason: row.reason }),
    created_at: row.created_at,
  };
}

async function readToday(queryable: Pool | PoolClient): Promise<string> {
  const clock = await queryable.query<{ today: string }>(
    "SELECT to_char(today, 'YYYY-MM-DD') AS today FROM app.demo_clock WHERE singleton = true",
  );
  if (!clock.rows[0]) throw new Error("Demo clock is not configured");
  return clock.rows[0].today;
}

async function readGoal(
  queryable: Pool | PoolClient,
  customerId: string,
  today: string,
): Promise<Goal | null> {
  const result = await queryable.query<GoalRow>(
    `SELECT ${goalColumns} FROM app.goals
     WHERE customer_id = $1 AND created_at::date <= $2::date`,
    [customerId, today],
  );
  return result.rows[0] ? mapGoal(result.rows[0]) : null;
}

class DbImpl implements Db {
  async getGoal(customerId: string): Promise<Goal | null> {
    const pool = getPool();
    return readGoal(pool, customerId, await readToday(pool));
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
    const validated = createGoalSchema.parse(goal);
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const today = await readToday(client);
      if (validated.target_date <= today) {
        throw new Error(
          "Goal target date must be after the demo clock's current day",
        );
      }
      const customer = await client.query(
        "SELECT customer_id FROM junction.cust WHERE customer_id = $1",
        [customerId],
      );
      if (customer.rowCount !== 1) throw new Error("Unknown customer");
      const result = await client.query<GoalRow>(
        `INSERT INTO app.goals
           (customer_id, name, target_amount_eur, target_date, reason, created_at)
         VALUES ($1, $2, $3::numeric(12,2), $4::date, $5, $6::date)
         ON CONFLICT (customer_id) DO NOTHING
         RETURNING ${goalColumns}`,
        [
          customerId,
          validated.name,
          validated.target_amount.toFixed(2),
          validated.target_date,
          validated.reason ?? null,
          today,
        ],
      );
      if (!result.rows[0]) {
        throw new Error("This customer already has a goal");
      }
      await client.query("COMMIT");
      return mapGoal(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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

      const today = await readToday(client);
      const known = await client.query<{ category: string }>(
        `SELECT DISTINCT category FROM junction.tx
         WHERE customer_id = $1 AND tx_date <= $2::date`,
        [customerId, today],
      );
      const categories = new Set(known.rows.map((row) => row.category));
      for (const entry of validated) {
        if (!categories.has(entry.category)) {
          throw new Error(
            "Use categories from this customer's transaction data",
          );
        }
      }

      await client.query("DELETE FROM app.plans WHERE customer_id = $1", [
        customerId,
      ]);
      const result = await client.query<PlanRow>(
        `INSERT INTO app.plans
           (customer_id, plan_date, plan_timestamp, category,
            plan_amount_eur, reason)
         SELECT $1, entry.plan_date, entry.plan_timestamp, entry.category,
                entry.plan_amount_eur, entry.reason
         FROM jsonb_to_recordset($2::jsonb) AS entry(
           plan_date date, plan_timestamp timestamp, category text,
           plan_amount_eur numeric(12,2), reason text)
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
    const today = await readToday(pool);
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
                COALESCE(
                  array_agg(DISTINCT reason ORDER BY reason) FILTER (WHERE reason IS NOT NULL),
                  ARRAY[]::text[]
                ) AS reasons
         FROM app.plans
         WHERE customer_id = $1
           AND NOT (category = ANY($2::text[]))
         GROUP BY to_char(plan_date, 'YYYY-MM'), category
         ORDER BY month, category`,
        [customerId, TRANSFER_CATEGORIES],
      ),
    ]);
    return { as_of: today, actuals: actuals.rows, plans: plans.rows };
  }

  async getProgress(customerId: string): Promise<Progress> {
    return calculateProgress(await this.getGoalSnapshot(customerId));
  }

  async detectWarnings(customerId: string): Promise<Warning[]> {
    return calculateWarnings(await this.getGoalSnapshot(customerId));
  }

  private async getGoalSnapshot(
    customerId: string,
  ): Promise<GoalSnapshot | null> {
    const client = await getPool().connect();
    try {
      // Goal, clock, savings and budgets must describe the same database revision.
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const today = await readToday(client);
      const goal = await readGoal(client, customerId, today);
      if (!goal) {
        await client.query("COMMIT");
        return null;
      }

      const savings = await client.query<{
        planned_net_eur: string;
        has_plan: boolean;
      }>(
        `SELECT
           COALESCE((SELECT SUM(plan_amount_eur) FROM app.plans
             WHERE customer_id = $1 AND plan_date > $2::date AND plan_date <= $3::date
               AND transaction_type NOT IN
                 ('salary_sweep', 'investment_deposit', 'investment_withdrawal')), 0)::text
             AS planned_net_eur,
           EXISTS (SELECT 1 FROM app.plans
             WHERE customer_id = $1 AND plan_date > $2::date
               AND transaction_type NOT IN
                 ('salary_sweep', 'investment_deposit', 'investment_withdrawal')) AS has_plan`,
        [customerId, goal.created_at.slice(0, 10), today],
      );
      const savingsCategories = await client.query<MonthlyCategoryBudget>(
        `WITH actuals AS (
           SELECT to_char(tx_date, 'YYYY-MM') AS month, category,
                  SUM(tx_amount_eur) AS amount
           FROM junction.tx
           WHERE customer_id = $1 AND tx_date > $2::date AND tx_date <= $3::date
             AND transaction_type NOT IN
               ('salary_sweep', 'investment_deposit', 'investment_withdrawal')
           GROUP BY to_char(tx_date, 'YYYY-MM'), category
         ), budgets AS (
           SELECT to_char(plan_date, 'YYYY-MM') AS month, category,
                  SUM(plan_amount_eur) AS amount
           FROM app.plans
           WHERE customer_id = $1 AND plan_date > $2::date AND plan_date <= $3::date
             AND plan_amount_eur < 0
             AND transaction_type NOT IN
               ('salary_sweep', 'investment_deposit', 'investment_withdrawal')
           GROUP BY to_char(plan_date, 'YYYY-MM'), category
         )
         SELECT budgets.month, budgets.category,
                COALESCE(actuals.amount, 0)::text AS actual_amount_eur,
                budgets.amount::text AS plan_amount_eur
         FROM budgets LEFT JOIN actuals USING (month, category)
         ORDER BY budgets.month, budgets.category`,
        [customerId, goal.created_at.slice(0, 10), today],
      );
      const categories = await client.query<CategoryBudget>(
        `WITH actuals AS (
           SELECT category, SUM(tx_amount_eur) AS amount
           FROM junction.tx
           WHERE customer_id = $1
             AND tx_date >= date_trunc('month', $2::date)::date
             AND tx_date <= $2::date
             AND transaction_type NOT IN
               ('salary_sweep', 'investment_deposit', 'investment_withdrawal')
           GROUP BY category
         ), budgets AS (
           SELECT category, SUM(plan_amount_eur) AS amount
           FROM app.plans
           WHERE customer_id = $1
             AND plan_date >= date_trunc('month', $2::date)::date
             AND plan_date < (date_trunc('month', $2::date) + INTERVAL '1 month')::date
             AND transaction_type NOT IN
               ('salary_sweep', 'investment_deposit', 'investment_withdrawal')
           GROUP BY category
         )
         SELECT COALESCE(actuals.category, budgets.category) AS category,
                COALESCE(actuals.amount, 0)::text AS actual_amount_eur,
                budgets.amount::text AS plan_amount_eur
         FROM actuals FULL OUTER JOIN budgets USING (category)
         ORDER BY category`,
        [customerId, today],
      );
      await client.query("COMMIT");
      return {
        goal,
        today,
        ...savings.rows[0],
        savings_categories: savingsCategories.rows,
        categories: categories.rows,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

let db: Db | null = null;

export function getDb(): Db {
  if (!db) {
    db = new DbImpl();
  }
  return db;
}
