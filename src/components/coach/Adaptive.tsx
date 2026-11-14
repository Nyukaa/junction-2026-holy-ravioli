"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CoachHeader } from "./CoachHeader";

const AUTO_MESSAGE =
  "I want to change my savings plan. Can you analyze my current progress and suggest some alternatives?";

export function Adaptive({
  onBack,
  onAutoSend,
}: {
  onBack: () => void;
  onAutoSend: (text: string) => void | Promise<void>;
}) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    void onAutoSend(AUTO_MESSAGE);
  }, [onAutoSend]);

  return (
    <main className="flex flex-col gap-5 pb-2">
      <CoachHeader
        eyebrow="ADAPTIVE PLANNING"
        title="Let's adjust your plan"
        copy="Life doesn't always go according to plan."
        compact
      />

      <div className="px-5">
        <Button
          onClick={onBack}
          variant="outline"
          className="h-11 w-full rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to progress
        </Button>
      </div>
    </main>
  );
}
