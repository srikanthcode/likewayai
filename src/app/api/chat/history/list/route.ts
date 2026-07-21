import { NextRequest, NextResponse } from "next/server";
import { listConversations, searchConversations } from "@/lib/memory";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/chat/history/list — List conversations or search
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  
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

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    // If search query provided, use semantic search
    if (query && query.trim().length > 0) {
      logger.info("Conversation search", { requestId, userId, query: query.substring(0, 50) });
      
      const results = await searchConversations(userId, query, limit);
      
      return NextResponse.json({
        success: true,
        mode: "search",
        query,
        conversations: results,
        total: results.length,
      });
    }

    // Otherwise, list all conversations
    const conversations = await listConversations(userId, limit);
    
    return NextResponse.json({
      success: true,
      mode: "list",
      conversations,
      total: conversations.length,
    });

  } catch (error: any) {
    logger.error("Failed to list history", { requestId, error: error.message });
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
