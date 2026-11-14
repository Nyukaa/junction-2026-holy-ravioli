"use client";

import { useState } from "react";
import { Capybara } from "./Capybara";
import { Icon } from "./Icon";

export type Message = { role: "user" | "assistant"; text: string };

const suggestions = [
  "Can I reach my goal sooner?",
  "How much can I save next month?",
  "What affects my goal?",
  "What changed in my spending?",
];

export function Chat({
  messages,
  onSend,
  showSuggestions = true,
}: {
  messages: Message[];
  onSend: (text: string) => void | Promise<void>;
  showSuggestions?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(text: string) {
    const value = text.trim();
    if (!value || loading) return;
    setLoading(true);
    setDraft("");
    try {
      await onSend(value);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-5 mt-2 mb-6 flex flex-col gap-3">
      {showSuggestions && messages.length === 0 && (
        <>
          <h2 className="text-sm font-bold text-slate-900">
            What would you like to know?
          </h2>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((q) => (
              <button
                key={q}
                onClick={() => submit(q)}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:text-[#1a7a3c]"
              >
                {q}
              </button>
            ))}
          </div>
        </>
      )}

      {messages.length > 0 && (
        <div className="flex flex-col gap-2">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-[#1a7a3c] px-3.5 py-2 text-sm text-white"
              >
                {m.text}
              </div>
            ) : (
              <div
                key={i}
                className="flex max-w-[90%] items-end gap-2 self-start"
              >
                <Capybara size={28} />
                <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm leading-relaxed text-slate-800 shadow-sm">
                  {m.text}
                </div>
              </div>
            ),
          )}
          {loading && (
            <div className="flex items-end gap-2 self-start">
              <Capybara size={28} />
              <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm text-slate-400 shadow-sm">
                Thinking…
              </div>
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(draft);
        }}
        className="flex items-center gap-2 rounded-full bg-white px-1.5 py-1.5 shadow-sm"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Ask your coach"
          placeholder="Ask your coach anything…"
          className="flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={loading || !draft.trim()}
          aria-label="Send question"
          className="grid size-9 place-items-center rounded-full bg-[#1a7a3c] text-white transition-opacity disabled:opacity-40"
        >
          <Icon name="send" size={16} />
        </button>
      </form>
    </section>
  );
}
