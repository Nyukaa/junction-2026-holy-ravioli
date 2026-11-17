/**
 * Runner for the offline agent eval. No Aiven connection (mock Db), but real
 * Claude calls happen, so this costs real tokens.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx src/lib/ai/eval/run-eval.ts
 */
import { writeFileSync } from "fs";
import path from "path";
import type Anthropic from "@anthropic-ai/sdk";
import { runAgentTurn } from "@/lib/ai/run";
import { createTurnUsage, estimateCost, formatTurnUsage, TurnUsage } from "@/lib/ai/usage";
import { createMockDb } from "@/lib/ai/eval/mock-db";
import { scenarios } from "@/lib/ai/eval/scenarios";
import { graders, GraderToolCall, GraderTranscript, GraderTurn } from "@/lib/ai/eval/graders";

interface ScenarioReport {
  name: string;
  description: string;
  turns: GraderTurn[];
  usage: TurnUsage;
  estCost: number;
  graders: { name: string; pass: boolean; note: string }[];
}

/**
 * Pulls the tool_result content strings out of the messages this turn added
 * to history, in the order they were produced. run.ts pushes one toolCalls
 * entry per tool_use block in exactly the same order it pushes the matching
 * tool_result block, so zipping the two arrays by index lines them up.
 */
function extractToolResultTexts(messages: Anthropic.Messages.MessageParam[]): string[] {
  const texts: string[] = [];
  for (const message of messages) {
    if (message.role !== "user" || !Array.isArray(message.content)) continue;
    for (const block of message.content) {
      if (typeof block === "object" && block !== null && "type" in block && block.type === "tool_result") {
        const content = (block as Anthropic.Messages.ToolResultBlockParam).content;
        texts.push(typeof content === "string" ? content : JSON.stringify(content));
      }
    }
  }
  return texts;
}

function mergeUsage(target: TurnUsage, addition: TurnUsage): void {
  target.calls += addition.calls;
  target.input += addition.input;
  target.output += addition.output;
  target.cacheRead += addition.cacheRead;
  target.cacheWrite += addition.cacheWrite;
}

async function runScenario(scenario: (typeof scenarios)[number]): Promise<ScenarioReport> {
  const db = createMockDb(scenario.fixture);
  const usage = createTurnUsage();
  const turns: GraderTurn[] = [];
  let history: Anthropic.Messages.MessageParam[] = [];

  for (const userText of scenario.turns) {
    const priorLength = history.length;
    const result = await runAgentTurn({
      db,
      customerId: scenario.fixture.customerId,
      text: userText,
      history,
    });
    history = result.history;
    mergeUsage(usage, result.usage);

    const resultTexts = extractToolResultTexts(history.slice(priorLength));
    const toolCalls: GraderToolCall[] = result.toolCalls.map((call, i) => ({
      name: call.name,
      input: call.input,
      resultText: resultTexts[i] ?? "",
    }));

    turns.push({ userText, reply: result.reply, toolCalls });
  }

  const transcript: GraderTranscript = { scenarioName: scenario.name, fixture: scenario.fixture, turns };
  const graderResults = graders.map((grader) => ({ name: grader.name, ...grader.run(transcript) }));

  return {
    name: scenario.name,
    description: scenario.description,
    turns,
    usage,
    estCost: estimateCost(usage),
    graders: graderResults,
  };
}

function printSummary(reports: ScenarioReport[], total: TurnUsage): void {
  console.log("\n=== Agent eval summary ===\n");

  const rows = reports.map((report) => {
    const row: Record<string, string> = { scenario: report.name };
    for (const grader of report.graders) {
      row[grader.name] = grader.pass ? "PASS" : "FAIL";
    }
    row.in = String(report.usage.input);
    row.out = String(report.usage.output);
    row.cache_read = String(report.usage.cacheRead);
    row.est_cost = `$${report.estCost.toFixed(3)}`;
    return row;
  });
  console.table(rows);

  for (const report of reports) {
    for (const grader of report.graders) {
      if (!grader.pass) {
        console.log(`[FAIL] ${report.name} / ${grader.name}: ${grader.note}`);
      }
    }
  }

  console.log("");
  for (const report of reports) {
    console.log(formatTurnUsage(report.name, report.usage));
  }
  console.log(formatTurnUsage("TOTAL", total));
}

async function main() {
  const reports: ScenarioReport[] = [];
  for (const scenario of scenarios) {
    console.log(`Running scenario: ${scenario.name}...`);
    reports.push(await runScenario(scenario));
  }

  const total = createTurnUsage();
  for (const report of reports) mergeUsage(total, report.usage);

  const passCount = reports.reduce((n, r) => n + r.graders.filter((g) => g.pass).length, 0);
  const failCount = reports.reduce((n, r) => n + r.graders.filter((g) => !g.pass).length, 0);

  const jsonOutput = {
    generatedAt: new Date().toISOString(),
    scenarios: reports,
    totals: { usage: total, estCost: estimateCost(total), passCount, failCount },
  };
  const jsonPath = path.join(process.cwd(), "eval-output.json");
  writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2) + "\n");

  const htmlPath = path.join(process.cwd(), "eval-output.html");
  writeFileSync(htmlPath, renderHtml(reports, total));

  printSummary(reports, total);
  console.log(`\nWrote ${jsonPath}`);
  console.log(`Wrote ${htmlPath}`);

  if (failCount > 0) process.exitCode = 1;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderHtml(reports: ScenarioReport[], total: TurnUsage): string {
  const graderNames = graders.map((g) => g.name);

  const headerCells = [
    "<th>Scenario</th>",
    ...graderNames.map((name) => `<th>${escapeHtml(name)}</th>`),
    "<th>In tokens</th>",
    "<th>Out tokens</th>",
    "<th>Cache read</th>",
    "<th>Est. cost</th>",
  ].join("");

  const bodyRows = reports
    .map((report) => {
      const cells = [
        `<td>${escapeHtml(report.name)}</td>`,
        ...report.graders.map((g) => {
          const title = escapeHtml(g.note);
          return `<td class="${g.pass ? "pass" : "fail"}" title="${title}">${g.pass ? "PASS" : "FAIL"}</td>`;
        }),
        `<td>${report.usage.input}</td>`,
        `<td>${report.usage.output}</td>`,
        `<td>${report.usage.cacheRead}</td>`,
        `<td>$${report.estCost.toFixed(3)}</td>`,
      ].join("");
      return `<tr>${cells}</tr>`;
    })
    .join("\n");

  const totalGraderCells = graderNames
    .map((name) => {
      const passed = reports.filter((r) => r.graders.find((g) => g.name === name)?.pass).length;
      return `<td>${passed}/${reports.length}</td>`;
    })
    .join("");
  const totalRow = `<tr class="total"><td>Total</td>${totalGraderCells}<td>${total.input}</td><td>${total.output}</td><td>${total.cacheRead}</td><td>$${estimateCost(total).toFixed(3)}</td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Agent eval report</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #111; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: left; font-size: 0.9rem; }
  th { background: #f3f3f3; }
  td.pass { background: #e6f4ea; color: #1a7431; font-weight: 600; }
  td.fail { background: #fbe9e7; color: #b3261e; font-weight: 600; }
  tr.total td { font-weight: 600; background: #f3f3f3; }
  h1 { font-size: 1.3rem; }
  p.meta { color: #666; font-size: 0.85rem; }
</style>
</head>
<body>
<h1>Agent eval report</h1>
<p class="meta">Generated ${new Date().toISOString()}</p>
<table>
<thead><tr>${headerCells}</tr></thead>
<tbody>
${bodyRows}
${totalRow}
</tbody>
</table>
</body>
</html>
`;
}

main();
