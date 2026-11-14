import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";
import { tools } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/tool-handler";
import { getSystemPrompt } from "@/lib/ai/prompts";
import { MODEL } from "@/lib/ai/model";
import { getHistory, appendHistory } from "@/lib/ai/chat-history";

export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const customerId = req.headers.get("x-customer-id") ?? "demo";
  const { text } = await req.json();
  const db = getDb();

  try {
    // Get user's goal to customize prompt
    const goal = await db.getGoal(customerId);
    const systemPrompt = getSystemPrompt(goal);

    const userMessage: Anthropic.Messages.MessageParam = {
      role: "user",
      content: text,
    };
    const messages: Anthropic.Messages.MessageParam[] = [
      ...getHistory(customerId),
      userMessage,
    ];

    let response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools,
    });

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
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools,
      });
    }

    // Extract final text response
    const textBlock = response.content.find(
      (block: Anthropic.Messages.ContentBlock) => block.type === "text"
    ) as Anthropic.Messages.TextBlock | undefined;

    // Save this turn (user message + all assistant/tool turns) to history
    appendHistory(customerId, [
      ...messages.slice(getHistory(customerId).length),
      { role: "assistant", content: response.content },
    ]);

    return NextResponse.json({
      reply: textBlock?.text || "I couldn't generate a response",
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Chat failed" },
      { status: 500 }
    );
  }
}
