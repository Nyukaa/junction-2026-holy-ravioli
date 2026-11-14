"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
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
  isThinking = false,
}: {
  messages: Message[];
  onSend: (text: string) => void | Promise<void>;
  showSuggestions?: boolean;
  isThinking?: boolean;
}) {
  const [draft, setDraft] = useState("");

  async function submit(text: string) {
    const value = text.trim();
    if (!value || isThinking) return;
    setDraft("");
    await onSend(value);
  }

  return (
    <section className="mx-5 mt-2 mb-6 flex flex-col gap-3">
      {showSuggestions && messages.length === 0 && !isThinking && (
        <>
          <h2 className="text-sm font-bold text-slate-900">
            What would you like to know?
          </h2>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((q) => (
              <button
                key={q}
                onClick={() => submit(q)}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:text-brand-green"
              >
                {q}
              </button>
            ))}
          </div>
        </>
      )}

      {(messages.length > 0 || isThinking) && (
        <div className="flex flex-col gap-2">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-brand-green px-3.5 py-2 text-sm text-white"
              >
                {m.text}
              </div>
            ) : (
              <div
                key={i}
                className="flex max-w-[90%] items-end gap-2 self-start"
              >
                <Capybara size={28} />
                <div className="prose prose-sm max-w-none rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm prose-strong:text-brand-green prose-headings:text-brand-green prose-ol:my-2 prose-ol:pl-5 prose-ul:my-2 prose-ul:pl-5 prose-li:my-0.5 prose-p:my-1">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              </div>
            ),
          )}
          {isThinking && (
            <div className="flex items-end gap-2 self-start">
              <Capybara size={28} />
              <div className="flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-green-700 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-green-700 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-green-700 [animation-delay:300ms]" />
                </div>
                <span className="text-sm text-muted-foreground">
                  Thinking...
                </span>
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
          disabled={isThinking || !draft.trim()}
          aria-label="Send question"
          className="grid size-9 place-items-center rounded-full bg-brand-green text-white transition-opacity disabled:opacity-40"
        >
          <Icon name="send" size={16} />
        </button>
      </form>
    </section>
  );
}
