"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CoachHeader } from "./CoachHeader";
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
  "on-track": { fill: "bg-brand-green", text: "text-brand-green" },
  ahead: { fill: "bg-brand-green", text: "text-brand-green" },
  "slightly-behind": { fill: "bg-[#f59e0b]", text: "text-[#b45309]" },
  behind: { fill: "bg-[#f97316]", text: "text-[#c2410c]" },
};

const chevronClip = "polygon(0 0, 80% 0, 100% 50%, 80% 100%, 0 100%, 20% 50%)";

function ArrowBar({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return (
    <div className="relative h-10">
      <div className="absolute inset-0 flex h-full gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-full flex-1 bg-[#d1e8d8]"
            style={{ clipPath: chevronClip }}
          />
        ))}
      </div>
      <div
        className="absolute inset-0 flex h-full gap-0.5"
        style={{
          clipPath: `inset(0 ${100 - clamped}% 0 0)`,
          transition: "clip-path 1s ease-out",
        }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-full flex-1 ${color}`}
            style={{ clipPath: chevronClip }}
          />
        ))}
      </div>
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
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [insightVisible, setInsightVisible] = useState(false);

  // Demo state — these would come from real data in production
  const saved = Math.round(plan.amount * 0.35);
  const monthsPassed = Math.max(1, Math.round(plan.monthsTotal * 0.33));
  const percent = (saved / plan.amount) * 100;

  const status = getStatus(saved, plan.amount, monthsPassed, plan.monthsTotal);
  const styles = statusStyles[status];
  const insight = insights[status];

  useEffect(() => {
    const t1 = setTimeout(() => setAnimatedPercent(percent), 50);
    const t2 = setTimeout(() => setInsightVisible(true), 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [percent]);

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
          <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
          <span className="text-base font-semibold text-brand-green">
            {Math.round(percent)}%
          </span>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {plan.deadline}
        </div>

        <div className="mt-4">
          <ArrowBar percent={animatedPercent} color={styles.fill} />
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-900">
              €{saved.toLocaleString("en-GB")} saved
            </span>
            <span className="text-muted-foreground">
              Target €{plan.amount.toLocaleString("en-GB")}
            </span>
          </div>
        </div>

        <div
          className={`mt-4 flex items-start gap-2 border-t border-slate-100 pt-4 transition-opacity duration-[400ms] ease-out ${
            insightVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="text-lg leading-none" aria-hidden="true">
            💡
          </span>
          <p className="text-sm leading-relaxed text-slate-700">{insight}</p>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <Button
            onClick={onAdapt}
            className="h-12 w-full rounded-2xl bg-brand-green text-base font-semibold text-white hover:bg-brand-green-dark"
          >
            Change plan
          </Button>
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="mt-2 w-full text-center text-sm font-semibold text-brand-green hover:underline"
          >
            {showDetails ? "Hide details" : "Show details"}
          </button>
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
