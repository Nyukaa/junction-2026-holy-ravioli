import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";
import { tools } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/tool-handler";
import { getSystemPrompt } from "@/lib/ai/prompts";

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

    const messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: text },
    ];

    let response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools,
    });

    // Agent loop: handle tool calls
    while (response.stop_reason === "tool_use") {
      const toolUseBlock = response.content.find(
        (block) => block.type === "tool_use"
      ) as Anthropic.Messages.ToolUseBlock | undefined;

      if (!toolUseBlock) break;

      // Execute tool (thin wrapper around db methods)
      const toolResult = await executeTool(
        toolUseBlock.name,
        toolUseBlock.input as Record<string, unknown>,
        db,
        customerId
      );

      // Continue conversation with tool result
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUseBlock.id,
            content: toolResult,
          },
        ],
      });

      response = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools,
      });
    }

    // Extract final text response
    const textBlock = response.content.find(
      (block) => block.type === "text"
    ) as Anthropic.Messages.TextBlock | undefined;

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
