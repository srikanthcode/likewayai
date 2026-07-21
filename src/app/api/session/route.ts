import { NextRequest, NextResponse } from "next/server";
import { getActiveSession } from "@/lib/memory";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/session — Get active session for recovery
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    const tokens = getTokenFromCookies(req);
    if (!tokens.access) {
      return NextResponse.json({ 
        success: true, 
        activeSession: null,
        message: "No active session" 
      });
    }

    const payload = verifyAccessToken(tokens.access);
    if (!payload) {
      return NextResponse.json({ 
        success: true, 
        activeSession: null,
        message: "Invalid token" 
      });
    }

    const userId = payload.sub;
    const activeSession = await getActiveSession(userId);

    if (!activeSession) {
      return NextResponse.json({
        success: true,
        activeSession: null,
        message: "No recent activity",
      });
    }

    logger.info("Session recovery", { 
      requestId, 
      userId, 
      conversationId: activeSession.conversationId 
    });

    return NextResponse.json({
      success: true,
      activeSession: {
        conversationId: activeSession.conversationId,
        lastMessage: activeSession.lastMessage,
        timestamp: activeSession.timestamp,
        resumeUrl: `/chat?conversation=${activeSession.conversationId}`,
      },
    });

  } catch (error: any) {
    logger.error("Session recovery failed", { requestId, error: error.message });
    return NextResponse.json(
      { success: false, error: "Failed to check session" },
      { status: 500 }
    );
  }
}
