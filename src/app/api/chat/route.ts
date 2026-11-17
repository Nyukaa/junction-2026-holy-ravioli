import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getHistory, appendHistory } from "@/lib/ai/chat-history";
import { runAgentTurn } from "@/lib/ai/run";
import { formatTurnUsage } from "@/lib/ai/usage";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const customerId = req.headers.get("x-customer-id") ?? "demo";
  const { text } = await req.json();
  const db = getDb();

  try {
    const priorHistory = getHistory(customerId);
    const result = await runAgentTurn({
      db,
      customerId,
      text,
      history: priorHistory,
    });

    console.log(formatTurnUsage(customerId, result.usage));
    const toolSizes: Record<string, number> = {};
    for (const call of result.toolCalls) {
      toolSizes[call.name] = (toolSizes[call.name] ?? 0) + call.resultChars;
    }
    console.log(
      "[tools] " +
        (Object.entries(toolSizes)
          .map(([name, chars]) => `${name}=${chars}chars`)
          .join(" ") || "none")
    );

    // Save this turn (user message + all assistant/tool turns) to history
    appendHistory(customerId, result.history.slice(priorHistory.length));

    return NextResponse.json({
      reply: result.reply,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Chat failed" },
      { status: 500 }
    );
  }
}
