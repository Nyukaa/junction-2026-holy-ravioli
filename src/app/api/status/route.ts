import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const customerId = req.headers.get("x-customer-id") ?? "demo";
  const db = getDb();

  try {
    const goal = await db.getGoal(customerId);
    const progress = goal ? await db.getProgress(customerId) : null;
    const warnings = goal ? await db.detectWarnings(customerId) : [];

    return NextResponse.json({
      goal,
      progress,
      warnings,
      customerId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}
