"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CoachHeader } from "./CoachHeader";
import { Icon } from "./Icon";
import type { Plan } from "./Onboarding";

type Status = "on-track" | "slightly-behind" | "behind" | "ahead";

function getStatus(
  saved: number,
  goalAmount: number,
  monthsPassed: number,
  monthsTotal: number,
): Status {
  const actual = saved / goalAmount;
  const planned = monthsPassed / monthsTotal;
  const delta = actual - planned;
  if (delta >= 0.05) return "ahead";
  if (delta >= -0.05) return "on-track";
  if (delta >= -0.15) return "slightly-behind";
  return "behind";
}

const insights: Record<Status, string> = {
  "on-track": "You're right on schedule. Keep it up!",
  ahead: "You're ahead of plan — nice work. You could reach your goal sooner.",
  "slightly-behind":
    "You're a bit behind. A small top-up next month would bring you back on track.",
  behind:
    "You're more than 15% below pace. Let's adjust so your goal stays realistic.",
};

const statusStyles: Record<Status, { fill: string; text: string }> = {
  "on-track": { fill: "bg-[#1a7a3c]", text: "text-[#1a7a3c]" },
  ahead: { fill: "bg-[#1a7a3c]", text: "text-[#1a7a3c]" },
  "slightly-behind": { fill: "bg-[#f59e0b]", text: "text-[#b45309]" },
  behind: { fill: "bg-[#f97316]", text: "text-[#c2410c]" },
};

const chevronClip = "polygon(0 0, 80% 0, 100% 50%, 80% 100%, 0 100%, 20% 50%)";

function ArrowBar({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const filled = Math.round(clamped / 10);
  return (
    <div className="flex h-10 gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`h-full flex-1 ${i < filled ? color : "bg-[#d1e8d8]"}`}
          style={{ clipPath: chevronClip }}
        />
      ))}
    </div>
  );
}

export function Progress({
  plan,
  onAdapt,
}: {
  plan: Plan;
  onAdapt: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  // Demo state — these would come from real data in production
  const saved = Math.round(plan.amount * 0.35);
  const monthsPassed = Math.max(1, Math.round(plan.monthsTotal * 0.33));
  const remaining = plan.amount - saved;
  const percent = (saved / plan.amount) * 100;

  const status = getStatus(saved, plan.amount, monthsPassed, plan.monthsTotal);
  const styles = statusStyles[status];
  const insight = insights[status];

  return (
    <main className="flex flex-col gap-5 pb-2">
      <CoachHeader
        eyebrow="GOOD MORNING, ALEX"
        title={`Your ${plan.goal === "holiday" ? "holiday" : "goal"} is getting closer.`}
        copy="Here's how your plan is progressing."
        compact
      />

      <Card className="mx-5 gap-0 rounded-2xl bg-white p-5 shadow-sm ring-0">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-[#d1e8d8] px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-[#1a7a3c]">
            YOUR GOAL
          </span>
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            <Icon name="calendar" size={12} /> {plan.deadline}
          </span>
        </div>

        <h2 className="mt-3 text-2xl font-bold text-slate-900">{plan.name}</h2>

        <div className="mt-4">
          <div className="text-3xl font-bold text-slate-900">
            € {saved.toLocaleString("en-GB")}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            of €{plan.amount.toLocaleString("en-GB")} saved · €
            {remaining.toLocaleString("en-GB")} to go
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className={`text-sm font-medium ${styles.text}`}>
              {Math.round(percent)}% complete
            </span>
            <span className="text-sm text-slate-500">{plan.deadline}</span>
          </div>
          <ArrowBar percent={percent} color={styles.fill} />
        </div>

        <div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-4">
          <span className="text-lg leading-none" aria-hidden="true">
            💡
          </span>
          <p className="text-sm leading-relaxed text-slate-700">{insight}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
          <Button
            onClick={onAdapt}
            className="h-12 w-full rounded-full border-2 border-green-700 bg-transparent text-base font-semibold text-green-700 hover:bg-green-50"
          >
            Change plan
          </Button>
          <Button
            onClick={() => setShowDetails((v) => !v)}
            className="h-12 w-full rounded-full border-2 border-green-700 bg-transparent text-base font-semibold text-green-700 hover:bg-green-50"
          >
            {showDetails ? "Hide details" : "Show details"}
          </Button>
        </div>

        {showDetails && (
          <div className="animate-in fade-in-0 slide-in-from-top-2 mt-4 space-y-2 rounded-2xl bg-slate-50 p-3 duration-300">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span>Oct · Monthly saving</span>
              <strong className="text-slate-900">+€{plan.monthlySaving}</strong>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span>Sep · Monthly saving</span>
              <strong className="text-slate-900">+€{plan.monthlySaving}</strong>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span>Aug · Partial</span>
              <strong className="text-slate-900">
                +€{Math.round(plan.monthlySaving * 0.6)}
              </strong>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
              <span className="text-slate-500">Target per month</span>
              <strong className="text-slate-900">€{plan.monthlySaving}</strong>
            </div>
          </div>
        )}
      </Card>

      <p className="px-5 text-center text-[11px] text-slate-400">
        Illustrative insights based on synthetic financial data.
      </p>
    </main>
  );
}
