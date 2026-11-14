"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Capybara } from "./Capybara";
import { CoachHeader } from "./CoachHeader";
import { Icon } from "./Icon";

type PlanOption = "date" | "time" | "spending";

const options: {
  id: PlanOption;
  number: string;
  title: string;
  detail: string;
  description: string;
}[] = [
  {
    id: "date",
    number: "01",
    title: "Keep your target date",
    detail: "Save €125/month · June 2027",
    description: "Increase your monthly savings if your budget allows it.",
  },
  {
    id: "time",
    number: "02",
    title: "Give yourself more time",
    detail: "Save €100/month · September 2027",
    description: "Keep your monthly contribution comfortable.",
  },
  {
    id: "spending",
    number: "03",
    title: "Review flexible spending",
    detail: "Explore small, optional adjustments",
    description:
      "See whether there's room to save more without affecting essentials.",
  },
];

export function Adaptive({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<PlanOption>("time");
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return (
      <main className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <div className="grid size-14 place-items-center rounded-full bg-brand-green text-white">
          <Icon name="check" size={28} />
        </div>
        <Capybara size={84} />
        <span className="text-[11px] font-bold tracking-[0.14em] text-brand-green">
          PLAN UPDATED
        </span>
        <h1 className="text-2xl font-bold text-slate-900">
          Your plan has been updated.
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-slate-600">
          You&apos;re still working towards something that matters to you.
          We&apos;ll take it one step at a time.
        </p>

        <div className="mt-2 grid w-full grid-cols-2 gap-3 rounded-2xl bg-white p-4 text-left shadow-sm">
          <div>
            <span className="text-xs text-slate-500">Monthly savings</span>
            <strong className="mt-0.5 block text-lg font-bold text-slate-900">
              {selected === "date" ? "€125" : "€100"}
            </strong>
          </div>
          <div>
            <span className="text-xs text-slate-500">Target date</span>
            <strong className="mt-0.5 block text-lg font-bold text-slate-900">
              {selected === "time" ? "September 2027" : "June 2027"}
            </strong>
          </div>
        </div>

        <Button
          onClick={onBack}
          className="h-12 w-full rounded-2xl bg-brand-green text-base font-semibold text-white hover:bg-brand-green-dark"
        >
          Back to my goal <Icon name="arrow" size={18} />
        </Button>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-5 pb-6">
      <CoachHeader
        eyebrow="ADAPTIVE PLANNING"
        title="Let's adjust your plan"
        copy="Life doesn't always go according to plan."
        compact
      />

      <section className="mx-5 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Capybara size={38} />
          <span className="text-[11px] font-bold tracking-[0.14em] text-amber-700">
            YOUR COACH NOTICED A CHANGE
          </span>
        </div>
        <h2 className="mt-2 text-base font-bold text-slate-900">
          Looks like this month turned out differently than expected.
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
          I noticed an unexpected expense of{" "}
          <strong className="font-bold">€300</strong> this month. Because of
          that, your original savings plan may need a small adjustment.
        </p>
      </section>

      <section className="mx-5 rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
          <div>
            <span className="text-[10px] tracking-wider text-slate-400">
              YOUR ORIGINAL PLAN
            </span>
            <strong className="mt-1 block text-lg font-bold text-slate-900">
              €100{" "}
              <small className="text-xs font-normal text-slate-500">
                / month
              </small>
            </strong>
            <p className="mt-0.5 text-xs text-slate-500">
              Reach €1,200 by June 2027
            </p>
          </div>
          <div className="grid place-items-center text-slate-400">
            <Icon name="arrow" size={18} />
          </div>
          <div className="rounded-xl bg-amber-50 p-2">
            <span className="text-[10px] tracking-wider text-amber-700">
              THIS MONTH
            </span>
            <strong className="mt-1 block text-lg font-bold text-amber-800">
              −€300
            </strong>
            <p className="mt-0.5 text-xs text-amber-700/80">
              Unexpected expense
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#f0f7f2] p-3 text-xs leading-relaxed text-slate-600">
          <span className="mt-0.5 text-brand-green">
            <Icon name="spark" size={14} />
          </span>
          <span>
            Your available savings are lower than expected. Nothing changes
            unless you approve it.
          </span>
        </div>
      </section>

      <section className="mx-5">
        <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-brand-green">
          <Icon name="spark" size={14} /> COACH RECOMMENDATION
        </span>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          Here are a few ways forward.
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Choose what feels right for you. You can change this again later.
        </p>

        <div className="mt-3 flex flex-col gap-2.5">
          {options.map((option) => {
            const active = selected === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSelected(option.id)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left shadow-sm transition ${
                  active
                    ? "border-brand-green bg-[#d1e8d8]/40"
                    : "border-transparent bg-white hover:border-black/10"
                }`}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                    active
                      ? "bg-brand-green text-white"
                      : "bg-[#d1e8d8] text-brand-green"
                  }`}
                >
                  {option.number}
                </span>
                <span className="flex-1">
                  <strong className="block text-sm font-bold text-slate-900">
                    {option.title}
                  </strong>
                  <b className="mt-0.5 block text-xs font-medium text-brand-green">
                    {option.detail}
                  </b>
                  <small className="mt-0.5 block text-xs leading-snug text-slate-500">
                    {option.description}
                  </small>
                </span>
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                    active ? "border-brand-green" : "border-slate-300"
                  }`}
                >
                  {active && (
                    <i className="size-2.5 rounded-full bg-brand-green" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {selected === "date" && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            €125 is an illustrative scenario. I&apos;ll check affordability
            against your upcoming income and essential expenses before you
            confirm.
          </p>
        )}
      </section>

      <section className="mx-5 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] tracking-wider text-slate-400">
              PREVIEW
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Your updated plan
            </h2>
          </div>
          <span className="text-brand-green">
            <Icon name="trend" size={22} />
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[#f0f7f2] p-3">
            <span className="text-[10px] tracking-wider text-slate-400">
              MONTHLY
            </span>
            <strong className="mt-1 block text-sm font-bold text-slate-900">
              {selected === "date" ? "€125" : "€100"}
            </strong>
          </div>
          <div className="rounded-xl bg-[#f0f7f2] p-3">
            <span className="text-[10px] tracking-wider text-slate-400">
              TARGET
            </span>
            <strong className="mt-1 block text-sm font-bold text-slate-900">
              {selected === "time" ? "Sep 2027" : "Jun 2027"}
            </strong>
          </div>
          <div className="rounded-xl bg-[#f0f7f2] p-3">
            <span className="text-[10px] tracking-wider text-slate-400">
              REMAINING
            </span>
            <strong className="mt-1 block text-sm font-bold text-slate-900">
              €780
            </strong>
          </div>
        </div>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[#d1e8d8]">
          <div className="h-full w-[35%] rounded-full bg-brand-green" />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>€420 saved</span>
          <span>{selected === "time" ? "September 2027" : "June 2027"}</span>
        </div>

        <Button
          onClick={() => setConfirmed(true)}
          className="mt-4 h-12 w-full rounded-2xl bg-brand-green text-base font-semibold text-white hover:bg-brand-green-dark"
        >
          Confirm new plan <Icon name="check" size={18} />
        </Button>
        <button
          onClick={onBack}
          className="mt-2 w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Keep my current plan
        </button>
      </section>

      <p className="px-5 text-center text-[11px] text-slate-400">
        Scenarios are illustrative. You always approve changes.
      </p>
    </main>
  );
}
