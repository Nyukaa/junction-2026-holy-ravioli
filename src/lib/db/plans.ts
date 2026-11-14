import { z } from "zod";

/** app.plans row using the default pg type parsers. */
export interface PlanRow {
  // pg returns bigint and numeric as strings to preserve precision.
  plan_id: string;
  customer_id: string;
  plan_date: Date;
  plan_timestamp: Date;
  category: string;
  plan_amount_eur: string;
  transaction_type: string;
  reason: string | null;
}

export type NewPlan = Omit<PlanRow, "plan_id" | "reason"> & {
  reason?: string | null;
};

export const savePlanSchema = z
  .object({
    entries: z
      .array(
        z
          .object({
            plan_date: z.iso.date(),
            plan_timestamp: z.iso
              .datetime({ local: true })
              .refine(
                (value) => !value.endsWith("Z"),
                "Use a local timestamp without a timezone",
              ),
            category: z.string().trim().min(1),
            plan_amount_eur: z
              .string()
              .regex(
                /^-?(?:0|[1-9]\d{0,9})\.\d{2}$/,
                "Use a signed EUR decimal with exactly two decimal places",
              ),
            transaction_type: z.string().trim().min(1),
            reason: z.string().trim().min(1).max(1000),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type PlanEntryInput = z.infer<typeof savePlanSchema>["entries"][number];

export interface MonthlyCategoryTotal {
  month: string;
  category: string;
  amount_eur: string;
  entry_count: number;
  transaction_types: string[];
}

export interface MonthlyPlanTotal extends MonthlyCategoryTotal {
  reasons: string[];
}

export interface FinancialData {
  as_of: string;
  actuals: MonthlyCategoryTotal[];
  plans: MonthlyPlanTotal[];
}
