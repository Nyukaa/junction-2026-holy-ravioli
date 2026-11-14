"use client";

import { Loader2, PartyPopper } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CoachHeader } from "./CoachHeader";
import { Icon, type IconName } from "./Icon";

export type Goal = "holiday" | "home" | "emergency" | "other";

export type Plan = {
  goal: Goal;
  goalType: string;
  name: string;
  amount: number;
  deadline: string;
  monthsTotal: number;
  monthlySaving: number;
};

const goals: {
  id: Goal;
  icon: IconName;
  title: string;
  description: string;
  defaultName: string;
}[] = [
  {
    id: "holiday",
    icon: "plane",
    title: "A holiday",
    description: "Make your next trip happen.",
    defaultName: "Summer Holiday",
  },
  {
    id: "home",
    icon: "home",
    title: "My first home",
    description: "Start saving for your future home.",
    defaultName: "First Home",
  },
  {
    id: "emergency",
    icon: "shield",
    title: "Emergency fund",
    description: "Build a financial safety net.",
    defaultName: "Emergency Fund",
  },
  {
    id: "other",
    icon: "spark",
    title: "Something else",
    description: "Choose your own goal.",
    defaultName: "My Goal",
  },
];

function defaultDeadline() {
  const d = new Date();
  d.setMonth(d.getMonth() + 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string) {
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) return null;
  return { year: y, month: m };
}

function monthsBetween(target: string) {
  const parsed = parseMonth(target);
  if (!parsed) return 0;
  const now = new Date();
  const diff =
    (parsed.year - now.getFullYear()) * 12 +
    (parsed.month - (now.getMonth() + 1));
  return Math.max(diff, 1);
}

function formatMonth(value: string) {
  const parsed = parseMonth(value);
  if (!parsed) return value;
  return new Date(parsed.year, parsed.month - 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function Onboarding({
  onCreate,
}: {
  onCreate: (plan: Plan) => Promise<void> | void;
}) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("1200");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [submitting, setSubmitting] = useState(false);
  const [showSteps, setShowSteps] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSteps) {
      chatRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [showSteps]);

  const activeGoal = goal ? goals.find((g) => g.id === goal)! : null;
  const amountNum = Math.max(
    parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0,
    0,
  );
  const months = monthsBetween(deadline);
  const monthly = amountNum > 0 ? Math.ceil(amountNum / months) : 0;

  function pickGoal(g: Goal) {
    setGoal(g);
    const preset = goals.find((x) => x.id === g)!;
    if (!name) setName(preset.defaultName);
  }

  async function submit() {
    if (!goal || amountNum <= 0 || submitting) return;
    setSubmitting(true);
    setShowSteps(false);
    try {
      await onCreate({
        goal,
        goalType: activeGoal!.title.toLowerCase(),
        name: name.trim() || activeGoal!.defaultName,
        amount: amountNum,
        deadline: formatMonth(deadline),
        monthsTotal: months,
        monthlySaving: monthly,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-col gap-8 pb-8">
      <section>
        <CoachHeader
          eyebrow="YOUR MONEY COACH"
          title="Let's make a plan for something that matters to you."
        />
        <p className="mt-3 px-5 text-sm leading-relaxed text-slate-600">
          I&apos;ll help you understand your money, set a realistic goal and
          adjust your plan when life changes.
        </p>
      </section>

      {showSteps && (
        <section className="px-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-brand-green text-[11px] font-bold text-white">
              1
            </span>
            <h2 className="text-base font-bold text-slate-900">
              What would you like to save for?
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {goals.map((item) => {
              const selected = goal === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => pickGoal(item.id)}
                  className={`relative flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left shadow-sm transition ${
                    selected
                      ? "border-brand-green bg-[#d1e8d8]/40"
                      : "border-transparent bg-white hover:border-black/10"
                  }`}
                >
                  <span
                    className={`grid size-9 place-items-center rounded-xl ${
                      selected
                        ? "bg-brand-green text-white"
                        : "bg-[#d1e8d8] text-brand-green"
                    }`}
                  >
                    {item.id === "holiday" ? (
                      <PartyPopper size={20} />
                    ) : (
                      <Icon name={item.icon} size={20} />
                    )}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {item.title}
                  </span>
                  <span className="text-xs leading-snug text-slate-500">
                    {item.description}
                  </span>
                  {selected && (
                    <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-brand-green text-white">
                      <Icon name="check" size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {showSteps && goal && (
        <section
          key={goal}
          className="animate-in fade-in-0 slide-in-from-bottom-2 flex flex-col gap-4 px-5 duration-500"
        >
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-brand-green text-[11px] font-bold text-white">
              2
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Shape your goal
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <label className="col-span-2 flex flex-col gap-1.5 text-xs text-slate-500">
              Goal name
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 bg-white text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Target amount
              <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-white px-3 text-sm">
                <span className="text-slate-400">€</span>
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent outline-none placeholder:text-slate-400"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Desired deadline
              <input
                type="month"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm text-slate-900 outline-none"
              />
            </label>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-brand-green">
              <Icon name="spark" size={14} /> AI PLAN PREVIEW
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Let&apos;s make this achievable.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              To reach{" "}
              <strong className="font-bold text-slate-900">
                €{amountNum.toLocaleString("en-GB")}
              </strong>{" "}
              by{" "}
              <strong className="font-bold text-slate-900">
                {formatMonth(deadline)}
              </strong>
              , you&apos;d set aside about{" "}
              <strong className="font-bold text-brand-green">
                €{monthly.toLocaleString("en-GB")} per month
              </strong>
              .
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f0f7f2] p-3">
                <span className="text-xs text-slate-500">Monthly saving</span>
                <strong className="mt-1 block text-lg font-bold text-slate-900">
                  €{monthly.toLocaleString("en-GB")}
                </strong>
              </div>
              <div className="rounded-xl bg-[#f0f7f2] p-3">
                <span className="text-xs text-slate-500">Time to goal</span>
                <strong className="mt-1 block text-lg font-bold text-slate-900">
                  {months} {months === 1 ? "month" : "months"}
                </strong>
              </div>
            </div>

            <Button
              onClick={submit}
              disabled={amountNum <= 0 || submitting}
              className="mt-5 h-12 w-full rounded-2xl bg-brand-green text-base font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Setting up…
                </>
              ) : (
                <>
                  Let&apos;s set a goal! <Icon name="arrow" size={18} />
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-[11px] text-slate-400">
            Plan is illustrative and based on synthetic financial data.
          </p>
        </section>
      )}

      <div ref={chatRef} />
    </main>
  );
}
