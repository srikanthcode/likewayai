import { NextRequest, NextResponse } from "next/server";
import { listConversations } from "@/lib/memory";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const tokens = getTokenFromCookies(req);
    if (!tokens.access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = verifyAccessToken(tokens.access);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = payload.sub;

    const conversations = await listConversations(userId, 50);
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Failed to list history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
