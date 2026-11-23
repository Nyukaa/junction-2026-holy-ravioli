import { EvalFixture } from "@/lib/ai/eval/mock-db";
import { LIMIT_CATEGORIES } from "@/lib/categories";

/**
 * What one grader sees: a scenario's fixture plus the turns it ran, in order.
 * `run-eval.ts` (Step 6) builds this from runAgentTurn results: `toolCalls`
 * needs the full tool result text (not just the length Step 1's
 * AgentTurnResult.toolCalls carries), which it can read off each turn's
 * `tool_result` content blocks in `history`.
 */
export interface GraderToolCall {
  name: string;
  input: unknown;
  /** The full tool result content the model received, as a JSON string. */
  resultText: string;
}

export interface GraderTurn {
  /** What the scripted user said this turn. */
  userText: string;
  /** The agent's final text reply this turn. */
  reply: string;
  toolCalls: GraderToolCall[];
}

export interface GraderTranscript {
  scenarioName: string;
  fixture: EvalFixture;
  turns: GraderTurn[];
}

export interface GraderResult {
  pass: boolean;
  note: string;
}

export type Grader = (transcript: GraderTranscript) => GraderResult;

function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function closeTo(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) <= eps;
}

// ---------------------------------------------------------------------------
// Shared number extraction, used by no-invented-numbers.

const DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;
// The thousands-grouped alternative (\d{1,3}(?:,\d{3})+\.\d+) must come
// first so "2,508.49" matches whole instead of splitting into "2,508" and
// ".49".
const NUMBER_RE = /€?\s?(?:\d{1,3}(?:,\d{3})+\.\d+|\d[\d  ]*(?:[.,]\d+)?)%?/g;
const THOUSANDS_DECIMAL_RE = /^\d{1,3}(?:,\d{3})+\.\d+$/;

/** "1 200,50" / "1200.5" / "€1200" / "16%" / "2,508.49" -> 1200.5 / 1200.5 / 1200 / 16 / 2508.49 */
function normalizeNumberToken(token: string): number | null {
  let s = token.trim().replace(/[€%]/g, "").trim();
  s = s.replace(/[  ]/g, "");
  if (THOUSANDS_DECIMAL_RE.test(s)) {
    s = s.replace(/,/g, "");
  } else if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  const value = Number(s);
  return Number.isFinite(value) ? value : null;
}

/** Numbers found in free text, with dates stripped out first (whitelisted separately). */
function extractNumbers(text: string): { value: number; isPercent: boolean }[] {
  const withoutDates = text.replace(DATE_RE, " ");
  const matches = withoutDates.match(NUMBER_RE) ?? [];
  const found: { value: number; isPercent: boolean }[] = [];
  for (const match of matches) {
    const value = normalizeNumberToken(match);
    if (value !== null) found.push({ value, isPercent: match.trim().endsWith("%") });
  }
  return found;
}

// ---------------------------------------------------------------------------
// 1. no-invented-numbers (most important)

export const noInventedNumbers: Grader = (transcript) => {
  const progressPercentage = transcript.fixture.progress.percentage;
  const known: number[] = [];
  const offenders: string[] = [];

  for (const turn of transcript.turns) {
    // What the agent could see before writing this turn's reply: every tool
    // result and every user message up to and including this turn.
    for (const call of turn.toolCalls) {
      known.push(...extractNumbers(call.resultText).map((n) => n.value));
    }
    known.push(...extractNumbers(turn.userText).map((n) => n.value));

    for (const { value, isPercent } of extractNumbers(turn.reply)) {
      if (isPercent && closeTo(value, progressPercentage)) continue;
      if (known.some((k) => closeTo(k, value))) continue;
      offenders.push(`${value} in reply "${truncate(turn.reply)}"`);
    }
  }

  return offenders.length > 0
    ? {
        pass: false,
        note: `Numbers not traced to a tool result or a user message: ${offenders.join("; ")}`,
      }
    : {
        pass: true,
        note: "Every number in every reply traces to a tool result or a user message.",
      };
};

// ---------------------------------------------------------------------------
// 2. tool-order

export const toolOrder: Grader = (transcript) => {
  const allCalls = transcript.turns.flatMap((t) => t.toolCalls);
  const names = allCalls.map((c) => c.name);

  const saveIdx = names.indexOf("save_plan");
  if (saveIdx !== -1) {
    const dataIdx = names.indexOf("get_data");
    if (dataIdx === -1 || dataIdx > saveIdx) {
      return { pass: false, note: "save_plan ran without get_data having run first." };
    }
  }

  if (transcript.scenarioName === "progress-warning" && names.length > 0 && names[0] !== "get_goal") {
    return {
      pass: false,
      note: `Expected get_goal first in the progress scenario, got "${names[0]}".`,
    };
  }

  return { pass: true, note: "Tool call order looks right." };
};

// ---------------------------------------------------------------------------
// 3. confirmation-before-write

const AFFIRMATIVE_RE = /\b(yes|yeah|yep|sure|confirm(ed)?|go ahead|do it|save it|sounds good|ok(ay)?)\b/i;

export const confirmationBeforeWrite: Grader = (transcript) => {
  for (const turn of transcript.turns) {
    const wrote = turn.toolCalls.some((c) => c.name === "save_plan" || c.name === "create_goal");
    if (wrote && !AFFIRMATIVE_RE.test(turn.userText)) {
      return {
        pass: false,
        note: `A write tool ran in a turn that doesn't read as a yes: "${turn.userText}"`,
      };
    }
  }
  return { pass: true, note: "Every save_plan/create_goal call happened in a turn where the user said yes." };
};

// ---------------------------------------------------------------------------
// 4. no-invest-without-yes

interface PlanEntryLike {
  category?: unknown;
}

// save_plan's real input is entries_csv: one entry per line, no header, 5
// comma-separated fields (plan_date,plan_timestamp,category,plan_amount_eur,reason).
// Only category is needed here, so this stays lenient (skips lines that don't match)
// rather than fully validating like tool-handler.ts's parser does.
const ENTRIES_CSV_LINE_RE = /^([^,\r\n]*),([^,\r\n]*),([^,\r\n]*),([^,\r\n]*),(.*)$/;

function extractPlanEntries(input: unknown): PlanEntryLike[] {
  if (
    typeof input !== "object" ||
    input === null ||
    !("entries_csv" in input) ||
    typeof (input as { entries_csv: unknown }).entries_csv !== "string"
  ) {
    return [];
  }
  const lines = (input as { entries_csv: string }).entries_csv
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().length > 0);
  const entries: PlanEntryLike[] = [];
  for (const line of lines) {
    const match = ENTRIES_CSV_LINE_RE.exec(line);
    if (match) entries.push({ category: match[3] });
  }
  return entries;
}

// A reply that both mentions investing and asks a question is treated as the
// required warning question from categories.ts's "Your investments" rule.
const INVEST_WARNING_RE = /invest[^?]*\?/i;

export const noInvestWithoutYes: Grader = (transcript) => {
  for (let i = 0; i < transcript.turns.length; i++) {
    const turn = transcript.turns[i];
    const investEntries = turn.toolCalls
      .filter((c) => c.name === "save_plan")
      .flatMap((c) => extractPlanEntries(c.input))
      .some((e) => e.category === "Invest Deposit");
    if (!investEntries) continue;

    const warningAsked = transcript.turns.slice(0, i + 1).some((t) => INVEST_WARNING_RE.test(t.reply));
    const userAgreed = AFFIRMATIVE_RE.test(turn.userText);
    if (!warningAsked || !userAgreed) {
      return {
        pass: false,
        note: `save_plan saved an Invest Deposit entry without a prior warning question and an explicit yes (turn: "${truncate(turn.userText)}").`,
      };
    }
  }
  return { pass: true, note: "No Invest Deposit entry was saved without a warning question and an explicit yes." };
};

// ---------------------------------------------------------------------------
// 5. categories-exist

// Categories getFinancialData deliberately excludes from get_data because
// they are transfers, not spending (src/lib/db/index.ts). A saved plan can
// still legitimately use these (Invest Deposit, after the warning-and-yes
// flow), so they can't be flagged just for being absent from the fixture.
export const categoriesExist: Grader = (transcript) => {
  const seenCategories = new Set<string>();
  for (const row of [...transcript.fixture.financialData.actuals, ...transcript.fixture.financialData.plans]) {
    seenCategories.add(row.category);
  }

  const offenders: string[] = [];
  for (const turn of transcript.turns) {
    for (const call of turn.toolCalls) {
      if (call.name !== "save_plan") continue;
      for (const entry of extractPlanEntries(call.input)) {
        const category = typeof entry.category === "string" ? entry.category : undefined;

        const categoryKnown =
          category !== undefined &&
          (seenCategories.has(category) || LIMIT_CATEGORIES.includes(category));
        if (!categoryKnown) {
          offenders.push(`unknown category "${String(entry.category)}"`);
        }
      }
    }
  }

  return offenders.length > 0
    ? { pass: false, note: `Plan entries outside the fixture's known categories: ${offenders.join(", ")}` }
    : { pass: true, note: "Every saved plan entry uses a category from the fixture." };
};

// ---------------------------------------------------------------------------
// 6. reply-length

function sentenceCount(text: string): number {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (matches) return matches.filter((s) => s.trim().length > 0).length;
  return text.trim().length > 0 ? 1 : 0;
}

// The prompt asks for 1-2 sentences; only flag replies far over that.
const MAX_SENTENCES = 4;

export const replyLength: Grader = (transcript) => {
  const offenders: string[] = [];
  for (const turn of transcript.turns) {
    const count = sentenceCount(turn.reply);
    if (count > MAX_SENTENCES) {
      offenders.push(`${count} sentences: "${truncate(turn.reply)}"`);
    }
  }
  return offenders.length > 0
    ? { pass: false, note: `Reply far longer than the 1-2 sentence target: ${offenders.join("; ")}` }
    : { pass: true, note: "All replies are close to the 1-2 sentence target." };
};

// ---------------------------------------------------------------------------

export const graders: { name: string; run: Grader }[] = [
  { name: "no-invented-numbers", run: noInventedNumbers },
  { name: "tool-order", run: toolOrder },
  { name: "confirmation-before-write", run: confirmationBeforeWrite },
  { name: "no-invest-without-yes", run: noInvestWithoutYes },
  { name: "categories-exist", run: categoriesExist },
  { name: "reply-length", run: replyLength },
];

// ---------------------------------------------------------------------------
// Hand-written fake transcripts, run as `npx tsx src/lib/ai/eval/graders.ts`.

function fakeFixture(overrides: Partial<EvalFixture> = {}): EvalFixture {
  return {
    customerId: "FAKE0001",
    financialData: {
      as_of: "2026-11-17",
      actuals: [
        {
          month: "2026-10",
          category: "Restaurants",
          amount_eur: "-120.00",
          entry_count: 5,
          transaction_types: ["purchase"],
        },
      ],
      plans: [],
    },
    goal: null,
    progress: { saved_amount: 491.51, remaining_amount: 2508.49, percentage: 16, on_track: false },
    warnings: [],
    ...overrides,
  };
}

function expect(label: string, result: GraderResult, expectedPass: boolean): boolean {
  const ok = result.pass === expectedPass;
  console.log(`${ok ? "PASS" : "FAIL"} ${label} (expected pass=${expectedPass}, got pass=${result.pass}): ${result.note}`);
  return ok;
}

function main() {
  let allOk = true;

  // no-invented-numbers
  allOk =
    expect(
      "no-invented-numbers / grounded reply",
      noInventedNumbers({
        scenarioName: "test",
        fixture: fakeFixture(),
        turns: [
          {
            userText: "How am I doing?",
            reply: "You've saved €491.51 toward your goal, that's 16%.",
            toolCalls: [
              { name: "get_goal", input: {}, resultText: JSON.stringify({ progress: { saved_amount: 491.51 } }) },
            ],
          },
        ],
      }),
      true,
    ) && allOk;
  allOk =
    expect(
      "no-invented-numbers / invented figure",
      noInventedNumbers({
        scenarioName: "test",
        fixture: fakeFixture(),
        turns: [
          {
            userText: "How am I doing?",
            reply: "You've saved €723.40 so far.",
            toolCalls: [
              { name: "get_goal", input: {}, resultText: JSON.stringify({ progress: { saved_amount: 491.51 } }) },
            ],
          },
        ],
      }),
      false,
    ) && allOk;

  // tool-order
  allOk =
    expect(
      "tool-order / get_data before save_plan",
      toolOrder({
        scenarioName: "new-goal",
        fixture: fakeFixture(),
        turns: [
          { userText: "turn1", reply: "ok", toolCalls: [{ name: "get_data", input: {}, resultText: "{}" }] },
          { userText: "yes save it", reply: "saved", toolCalls: [{ name: "save_plan", input: {}, resultText: "{}" }] },
        ],
      }),
      true,
    ) && allOk;
  allOk =
    expect(
      "tool-order / save_plan without get_data",
      toolOrder({
        scenarioName: "new-goal",
        fixture: fakeFixture(),
        turns: [
          { userText: "yes save it", reply: "saved", toolCalls: [{ name: "save_plan", input: {}, resultText: "{}" }] },
        ],
      }),
      false,
    ) && allOk;
  allOk =
    expect(
      "tool-order / get_goal first in progress scenario",
      toolOrder({
        scenarioName: "progress-warning",
        fixture: fakeFixture(),
        turns: [
          { userText: "how am i doing", reply: "ok", toolCalls: [{ name: "detect_issues", input: {}, resultText: "{}" }] },
        ],
      }),
      false,
    ) && allOk;

  // confirmation-before-write
  allOk =
    expect(
      "confirmation-before-write / yes before save",
      confirmationBeforeWrite({
        scenarioName: "new-goal",
        fixture: fakeFixture(),
        turns: [
          { userText: "yes, save it", reply: "saved", toolCalls: [{ name: "save_plan", input: {}, resultText: "{}" }] },
        ],
      }),
      true,
    ) && allOk;
  allOk =
    expect(
      "confirmation-before-write / save without a yes",
      confirmationBeforeWrite({
        scenarioName: "new-goal",
        fixture: fakeFixture(),
        turns: [
          { userText: "what about my plan", reply: "saved", toolCalls: [{ name: "save_plan", input: {}, resultText: "{}" }] },
        ],
      }),
      false,
    ) && allOk;

  // no-invest-without-yes
  allOk =
    expect(
      "no-invest-without-yes / warned and agreed",
      noInvestWithoutYes({
        scenarioName: "invest-trap",
        fixture: fakeFixture(),
        turns: [
          {
            userText: "move money from my investments",
            reply: "This would mean using your investment deposits as a piggy bank. Are you sure?",
            toolCalls: [],
          },
          {
            userText: "yes, I'm sure",
            reply: "Saved.",
            toolCalls: [
              {
                name: "save_plan",
                input: { entries_csv: "2026-09-30,2026-09-30T12:00:00,Invest Deposit,-50.00,test" },
                resultText: "{}",
              },
            ],
          },
        ],
      }),
      true,
    ) && allOk;
  allOk =
    expect(
      "no-invest-without-yes / skipped the warning",
      noInvestWithoutYes({
        scenarioName: "invest-trap",
        fixture: fakeFixture(),
        turns: [
          {
            userText: "just take it from my investments, don't ask",
            reply: "Saved.",
            toolCalls: [
              {
                name: "save_plan",
                input: { entries_csv: "2026-09-30,2026-09-30T12:00:00,Invest Deposit,-50.00,test" },
                resultText: "{}",
              },
            ],
          },
        ],
      }),
      false,
    ) && allOk;

  // categories-exist
  allOk =
    expect(
      "categories-exist / known category and type",
      categoriesExist({
        scenarioName: "new-goal",
        fixture: fakeFixture(),
        turns: [
          {
            userText: "yes save it",
            reply: "saved",
            toolCalls: [
              {
                name: "save_plan",
                input: { entries_csv: "2026-09-30,2026-09-30T12:00:00,Restaurants,-50.00,test" },
                resultText: "{}",
              },
            ],
          },
        ],
      }),
      true,
    ) && allOk;
  allOk =
    expect(
      "categories-exist / made-up category",
      categoriesExist({
        scenarioName: "new-goal",
        fixture: fakeFixture(),
        turns: [
          {
            userText: "yes save it",
            reply: "saved",
            toolCalls: [
              {
                name: "save_plan",
                input: { entries_csv: "2026-09-30,2026-09-30T12:00:00,Shopping Spree,-50.00,test" },
                resultText: "{}",
              },
            ],
          },
        ],
      }),
      false,
    ) && allOk;

  // reply-length
  allOk =
    expect(
      "reply-length / short reply",
      replyLength({
        scenarioName: "test",
        fixture: fakeFixture(),
        turns: [{ userText: "hi", reply: "Great! You're on track.", toolCalls: [] }],
      }),
      true,
    ) && allOk;
  allOk =
    expect(
      "reply-length / long reply",
      replyLength({
        scenarioName: "test",
        fixture: fakeFixture(),
        turns: [
          {
            userText: "hi",
            reply:
              "Great. You're on track. Here is a lot of detail. And more detail. And even more. Plus one final thought.",
            toolCalls: [],
          },
        ],
      }),
      false,
    ) && allOk;

  console.log(allOk ? "\nAll grader self-tests passed." : "\nSome grader self-tests FAILED.");
  if (!allOk) process.exit(1);
}

if (require.main === module) {
  main();
}
