"use client";

import { useState } from "react";

export default function AskForm() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setAnswer(data.answer);
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-4 text-left">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask Claude something..."
          rows={3}
          maxLength={2000}
          className="w-full resize-none rounded-lg border border-zinc-300 bg-white p-3 text-base text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="h-11 rounded-lg bg-black px-5 font-medium text-white transition-opacity disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {answer && (
        <div className="whitespace-pre-wrap rounded-lg bg-white p-4 text-base leading-7 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {answer}
        </div>
      )}
    </div>
  );
}
