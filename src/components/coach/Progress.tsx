"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Progress as ApiProgress } from "@/types/contracts";
import { CoachHeader } from "./CoachHeader";
import type { Plan } from "./Onboarding";

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
  const isOnTrack = progress?.on_track ?? true;

  const barColor = isOnTrack ? "bg-green-700" : "bg-yellow-400";
  const accentColor = isOnTrack ? "text-green-700" : "text-yellow-500";

  const statusMessages = [
    "💡 You're right on schedule. Keep it up!",
    "🚀 Great pace! You're making solid progress.",
    "✨ Everything is going according to plan. Stay focused!",
    "🔥 You're crushing it! Keep that momentum going.",
    "🎯 Right on target. You've got this!",
    "⚡ Steady progress! Keep pushing forward.",
    "🌟 Looking good! You're right where you need to be.",
    "💪 Great rhythm! Stay on track and finish strong.",
    "📈 Smooth sailing so far. Keep up the great work!",
    "🏆 Spot on! Your consistency is paying off.",
  ];

  const budgetTips = [
    "Save on food delivery to rescue your Friday coffee and cake.",
    "Choose a walk instead of a taxi — your budget will thank you.",
    "Cook dinner at home tonight so you can treat yourself later.",
    "Brew tea in a thermos and put the savings toward your goal.",
    "Skip one impulse buy and get closer to your dream vacation.",
    "Walk a couple of stops and earn a bonus for dessert.",
    "Set aside your spare change to throw yourself a little treat at the end of the week.",
  ];

  const insight = useMemo(() => {
    const arr = isOnTrack ? statusMessages : budgetTips;
    // eslint-disable-next-line react-hooks/purity
    return arr[Math.floor(Math.random() * arr.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnTrack]);

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
          <span className={`text-base font-semibold ${accentColor}`}>
            {Math.round(percent)}%
          </span>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {plan.deadline}
        </div>

        <div className="mt-4">
          <ArrowBar percent={animatedPercent} color={barColor} />
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
