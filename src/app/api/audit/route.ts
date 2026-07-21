import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/security";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/audit — Get audit logs for the authenticated user
export async function GET(req: NextRequest) {
  try {
    // Get user from session
    const tokens = getTokenFromCookies(req);
    if (!tokens.access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAccessToken(tokens.access);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = payload.sub;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const logs = await getAuditLogs(userId, limit);

    return NextResponse.json({
      success: true,
      userId,
      logs,
      total: logs.length,
    });

  } catch (error: any) {
    console.error("[Audit API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
