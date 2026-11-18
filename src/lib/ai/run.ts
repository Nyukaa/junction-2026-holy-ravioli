import Anthropic from "@anthropic-ai/sdk";
import { Db } from "@/lib/db/types";
import { tools } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/tool-handler";
import { getSystemPrompt } from "@/lib/ai/prompts";
import { MODEL } from "@/lib/ai/model";
import { createTurnUsage, addUsage, TurnUsage } from "@/lib/ai/usage";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AgentTurnResult {
  reply: string;
  history: Anthropic.Messages.MessageParam[];
  usage: TurnUsage;
  toolCalls: { name: string; input: unknown; resultChars: number }[];
}

export async function runAgentTurn(args: {
  db: Db;
  customerId: string;
  text: string;
  history: Anthropic.Messages.MessageParam[];
}): Promise<AgentTurnResult> {
  const { db, customerId, text, history } = args;

  // Get user's goal to customize prompt
  const goal = await db.getGoal(customerId);
  const systemPrompt = getSystemPrompt(goal);
  // Request prefix order is tools -> system -> messages, so one breakpoint at
  // the end of system covers the tool schemas too. Reused as-is (same object)
  // on every call in this turn so the cache actually hits.
  const system: Anthropic.Messages.TextBlockParam[] = [
    { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
  ];

  const userMessage: Anthropic.Messages.MessageParam = {
    role: "user",
    content: text,
  };
  const messages: Anthropic.Messages.MessageParam[] = [...history, userMessage];

  const usage = createTurnUsage();
  const toolCalls: AgentTurnResult["toolCalls"] = [];

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system,
    messages,
    tools,
  });
  addUsage(usage, response.usage);

  // Agent loop: handle tool calls. Claude may call several tools in one
  // turn, so every tool_use block must get a matching tool_result block.
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (block: Anthropic.Messages.ContentBlock) => block.type === "tool_use"
    ) as Anthropic.Messages.ToolUseBlock[];

    if (toolUseBlocks.length === 0) break;

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const toolUseBlock of toolUseBlocks) {
      // Execute tool (thin wrapper around db methods)
      const toolResult = await executeTool(
        toolUseBlock.name,
        toolUseBlock.input as Record<string, unknown>,
        db,
        customerId
      );
      toolCalls.push({
        name: toolUseBlock.name,
        input: toolUseBlock.input,
        resultChars: toolResult.length,
      });
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUseBlock.id,
        content: toolResult,
      });
    }

    // Continue conversation with all tool results for this turn
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system,
      messages,
      tools,
    });
    addUsage(usage, response.usage);
  }

  if (response.stop_reason === "max_tokens") {
    console.error(
      "Chat response hit max_tokens before finishing (likely a large save_plan call)"
    );
  }

  // Extract final text response
  const textBlock = response.content.find(
    (block: Anthropic.Messages.ContentBlock) => block.type === "text"
  ) as Anthropic.Messages.TextBlock | undefined;

  return {
    reply: textBlock?.text || "I couldn't generate a response",
    history: [...messages, { role: "assistant", content: response.content }],
    usage,
    toolCalls,
  };
}
