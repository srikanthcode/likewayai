import { NextRequest, NextResponse } from "next/server";
import { listConversations } from "@/lib/memory";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "anonymous-user";
    const conversations = await listConversations(userId, 50);
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Failed to list history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
