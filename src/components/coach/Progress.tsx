"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Progress as ApiProgress } from "@/types/contracts";
import { CoachHeader } from "./CoachHeader";
import type { Plan } from "./Onboarding";

type Status = "on-track" | "behind";

const insights: Record<Status, string> = {
  "on-track": "You're right on schedule. Keep it up!",
  behind:
    "You're a bit behind. A small top-up next month would bring you back on track.",
};

const statusStyles: Record<Status, { fill: string; text: string }> = {
  "on-track": { fill: "bg-brand-green", text: "text-brand-green" },
  behind: { fill: "bg-[#f59e0b]", text: "text-[#b45309]" },
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
  progress,
  onAdapt,
}: {
  plan: Plan;
  progress: ApiProgress | null;
  onAdapt: () => void;
}) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [insightVisible, setInsightVisible] = useState(false);

  const saved = progress?.saved_amount ?? 0;
  const percent = progress?.percentage ?? 0;
  const onTrack = progress?.on_track ?? true;

  const status: Status = onTrack ? "on-track" : "behind";
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
        </div>
      </Card>
    </main>
  );
}
