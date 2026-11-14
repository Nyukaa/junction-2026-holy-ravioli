"use client";

import { useEffect, useState } from "react";
import { Adaptive } from "@/components/coach/Adaptive";
import { BottomNav, type Tab } from "@/components/coach/BottomNav";
import { Chat, type Message } from "@/components/coach/Chat";
import { Onboarding, type Plan } from "@/components/coach/Onboarding";
import { PhoneShell } from "@/components/coach/PhoneShell";
import { Progress } from "@/components/coach/Progress";
import { fetchStatus, sendChat } from "@/lib/api-client";
import type { Goal } from "@/types/contracts";

type Step = "onboarding" | "progress" | "adapt";

const comingSoonCopy: Record<
  Exclude<Tab, "coach">,
  { title: string; copy: string }
> = {
  home: { title: "Home", copy: "Your money overview is on the way." },
  progress: {
    title: "Progress",
    copy: "Detailed savings analytics coming soon.",
  },
  plan: {
    title: "Plan",
    copy: "Your upcoming savings calendar will live here.",
  },
  profile: { title: "Profile", copy: "Account settings coming soon." },
};

function Placeholder({ tab }: { tab: Exclude<Tab, "coach"> }) {
  const info = comingSoonCopy[tab];
  return (
    <main className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="text-[11px] font-bold tracking-[0.14em] text-[#1a7a3c]">
        COMING SOON
      </span>
      <h1 className="text-2xl font-bold text-slate-900">{info.title}</h1>
      <p className="text-sm leading-relaxed text-slate-600">{info.copy}</p>
    </main>
  );
}

function monthsUntil(targetIso: string): number {
  const target = new Date(targetIso);
  const now = new Date();
  const diff =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  return Math.max(diff, 1);
}

function formatDeadline(targetIso: string): string {
  return new Date(targetIso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function planFromGoal(goal: Goal, monthlyFromPlan?: number): Plan {
  const monthsTotal = monthsUntil(goal.target_date);
  return {
    goal: "holiday",
    name: goal.name,
    amount: goal.target_amount,
    deadline: formatDeadline(goal.target_date),
    monthsTotal,
    monthlySaving:
      monthlyFromPlan ?? Math.ceil(goal.target_amount / monthsTotal),
  };
}

export default function PrototypePage() {
  const [activeTab, setActiveTab] = useState<Tab>("coach");
  const [step, setStep] = useState<Step>("onboarding");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchStatus();
        if (cancelled) return;
        if (status.goal) {
          setPlan(planFromGoal(status.goal));
          setStep("progress");
        }
      } catch (err) {
        if (!cancelled)
          setBootError(
            err instanceof Error ? err.message : "Could not load status",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSend(text: string) {
    setMessages((m) => [...m, { role: "user", text }]);
    try {
      const { reply } = await sendChat(text);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "I couldn't reach the coach. Please try again.",
        },
      ]);
    }
  }

  return (
    <PhoneShell nav={<BottomNav active={activeTab} onChange={setActiveTab} />}>
      {activeTab === "coach" ? (
        <>
          {bootError && (
            <div className="mx-5 mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              {bootError}
            </div>
          )}
          {step === "onboarding" && (
            <Onboarding
              onCreate={(p) => {
                setPlan(p);
                setStep("progress");
              }}
            />
          )}
          {step === "progress" && plan && (
            <Progress plan={plan} onAdapt={() => setStep("adapt")} />
          )}
          {step === "adapt" && plan && (
            <Adaptive onBack={() => setStep("progress")} />
          )}

          {plan && (
            <Chat
              messages={messages}
              onSend={handleSend}
              showSuggestions={step === "progress"}
            />
          )}
        </>
      ) : (
        <Placeholder tab={activeTab} />
      )}
    </PhoneShell>
  );
}
