import { z } from "zod";
import type { Goal, Progress, Warning } from "@/types/contracts";

export const createGoalSchema = z
  .object({
    name: z.string().trim().min(1),
    target_amount: z.number().positive().max(9999999999.99).multipleOf(0.01),
    target_date: z.iso.date(),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict();

export interface CategoryBudget {
  category: string;
  actual_amount_eur: string;
  plan_amount_eur: string | null;
}

export interface GoalSnapshot {
  goal: Goal;
  today: string;
  actual_net_eur: string;
  planned_net_eur: string;
  has_plan: boolean;
  categories: CategoryBudget[];
}

export function moneyToCents(amount: string): bigint {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(amount)) {
    throw new Error("Invalid database EUR amount");
  }
  const negative = amount.startsWith("-");
  const [whole, fraction = ""] = amount.replace(/^-/, "").split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

export function centsToAmount(cents: bigint): number {
  const value = Number(cents);
  if (!Number.isSafeInteger(value)) {
    throw new Error("EUR amount exceeds the supported precision");
  }
  return value / 100;
}

function formatCents(cents: bigint): string {
  const absolute = cents < BigInt(0) ? -cents : cents;
  return `${cents < BigInt(0) ? "-" : ""}${absolute / BigInt(100)}.${String(
    absolute % BigInt(100),
  ).padStart(2, "0")}`;
}

function targetCents(goal: Goal): bigint {
  return moneyToCents(goal.target_amount.toFixed(2));
}

function nonNegative(value: bigint): bigint {
  return value > BigInt(0) ? value : BigInt(0);
}

function dateDay(date: string): number {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

/** Follow dated plan cash flow when present, otherwise the goal's daily timeline. */
function expectedSavings(snapshot: GoalSnapshot): bigint {
  const target = targetCents(snapshot.goal);
  if (snapshot.today >= snapshot.goal.target_date) return target;
  if (snapshot.has_plan) {
    const planned = moneyToCents(snapshot.planned_net_eur);
    return planned > target ? target : planned;
  }

  const start = dateDay(snapshot.goal.created_at);
  const duration = dateDay(snapshot.goal.target_date) - start;
  if (duration <= 0)
    throw new Error("Goal target date must follow its creation day");
  const elapsed = Math.max(0, dateDay(snapshot.today) - start);
  return (target * BigInt(elapsed)) / BigInt(duration);
}

export function calculateProgress(snapshot: GoalSnapshot | null): Progress {
  if (!snapshot) {
    return {
      saved_amount: 0,
      remaining_amount: 0,
      percentage: 0,
      on_track: true,
    };
  }
  const actual = moneyToCents(snapshot.actual_net_eur);
  const saved = nonNegative(actual);
  const target = targetCents(snapshot.goal);
  const percentage = Number(
    (saved * BigInt(100) + target / BigInt(2)) / target,
  );
  return {
    saved_amount: centsToAmount(saved),
    remaining_amount: centsToAmount(nonNegative(target - saved)),
    percentage: Math.min(100, percentage),
    on_track: actual >= expectedSavings(snapshot),
  };
}

export function calculateWarnings(snapshot: GoalSnapshot | null): Warning[] {
  if (!snapshot) return [];
  const warnings: Warning[] = [];
  const hasMonthlyBudget = snapshot.categories.some(
    (category) => category.plan_amount_eur !== null,
  );

  if (hasMonthlyBudget) {
    for (const category of snapshot.categories) {
      // Signed cash flow includes refunds; income and transfers are not spending.
      const spending = nonNegative(-moneyToCents(category.actual_amount_eur));
      const budget = nonNegative(
        -moneyToCents(category.plan_amount_eur ?? "0"),
      );
      const extra = spending - budget;
      if (extra <= BigInt(0)) continue;
      warnings.push({
        type: "spending_over",
        severity: "medium",
        message: `You spent EUR ${formatCents(extra)} more than planned on ${category.category} this month.`,
        suggested_action: `Reduce optional spending by EUR ${formatCents(extra)}, or review this category's plan.`,
      });
    }
  }

  const behind =
    expectedSavings(snapshot) - moneyToCents(snapshot.actual_net_eur);
  if (behind > BigInt(0)) {
    const overdue = snapshot.today >= snapshot.goal.target_date;
    warnings.push({
      type: "behind_plan",
      severity: overdue ? "high" : "medium",
      message: `You are EUR ${formatCents(behind)} behind ${snapshot.has_plan ? "your savings plan" : "your goal timeline"}.`,
      suggested_action: `Reduce optional spending by EUR ${formatCents(behind)}, or choose a later goal date.`,
    });
  }

  const year = snapshot.today.slice(0, 4);
  const christmas = `${year}-12-25`;
  if (
    snapshot.today >= `${year}-11-25` &&
    snapshot.today < christmas &&
    snapshot.goal.target_date >= christmas &&
    moneyToCents(snapshot.actual_net_eur) < targetCents(snapshot.goal)
  ) {
    warnings.push({
      type: "upcoming_event",
      severity: "low",
      message:
        "Christmas is coming. Leave room in your plan for seasonal spending.",
      suggested_action:
        "Review optional spending before committing to holiday purchases.",
    });
  }
  return warnings;
}
