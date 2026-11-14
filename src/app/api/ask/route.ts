import { NextResponse } from "next/server";
import { z } from "zod";
import { askClaude } from "@/lib/ai";

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body must be { prompt: string }" },
      { status: 400 },
    );
  }

  try {
    const answer = await askClaude(parsed.data.prompt);
    return NextResponse.json({ answer });
  } catch (error) {
    console.error("ask route error:", error);
    return NextResponse.json(
      { error: "Failed to get answer from Claude" },
      { status: 500 },
    );
  }
}
