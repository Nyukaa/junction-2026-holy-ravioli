/**
 * Run by hand, not imported by the app. Prints how big each part of the
 * agent's context is today, using the token counting endpoint.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx src/lib/ai/measure-context.ts <customerId>
 */
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";
import { executeTool } from "@/lib/ai/tool-handler";
import { getSystemPrompt } from "@/lib/ai/prompts";
import { tools } from "@/lib/ai/tools";
import { MODEL } from "@/lib/ai/model";
import { Goal } from "@/types/contracts";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// One throwaway user message, used both as the baseline and as the carrier
// for whatever single piece we want to measure.
const PLACEHOLDER_MESSAGES: Anthropic.Messages.MessageParam[] = [
  { role: "user", content: "." },
];

const FAKE_GOAL: Goal = {
  id: "fake-goal",
  customer_id: "fake",
  name: "Snowboarding trip to the Alps",
  target_amount: 2000,
  target_date: "2026-06-01",
  reason: "A long weekend with friends",
  created_at: new Date().toISOString(),
};

async function countTokens(params: {
  system?: string;
  tools?: Anthropic.Messages.Tool[];
  content?: string;
}): Promise<number> {
  const messages: Anthropic.Messages.MessageParam[] = params.content
    ? [{ role: "user", content: params.content }]
    : PLACEHOLDER_MESSAGES;
  const result = await client.messages.countTokens({
    model: MODEL,
    messages,
    ...(params.system ? { system: params.system } : {}),
    ...(params.tools ? { tools: params.tools } : {}),
  });
  return result.input_tokens;
}

async function main() {
  const customerId = process.argv[2];
  if (!customerId) {
    console.error("Usage: npx tsx src/lib/ai/measure-context.ts <customerId>");
    process.exit(1);
  }

  const baseline = await countTokens({});

  const db = getDb();
  const [getDataResult, getGoalResult] = await Promise.all([
    executeTool("get_data", {}, db, customerId),
    executeTool("get_goal", {}, db, customerId),
  ]);

  const rows: Array<[string, number]> = [
    [
      "system prompt, no goal (scenario 1)",
      (await countTokens({ system: getSystemPrompt(null) })) - baseline,
    ],
    [
      "system prompt, with goal (scenario 2)",
      (await countTokens({ system: getSystemPrompt(FAKE_GOAL) })) - baseline,
    ],
    ["tools schemas (all 5)", (await countTokens({ tools })) - baseline],
    [
      "get_data result, as sent today",
      (await countTokens({ content: getDataResult })) - baseline,
    ],
    [
      "get_goal result, as sent today",
      (await countTokens({ content: getGoalResult })) - baseline,
    ],
  ];

  console.log(`\nContext size for customer ${customerId}:\n`);
  console.log("| part | tokens |");
  console.log("| --- | --- |");
  for (const [part, tokens] of rows) {
    console.log(`| ${part} | ${tokens} |`);
  }
  console.log("");
}

main();
