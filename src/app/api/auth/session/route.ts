import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, getTokenFromCookies } from "@/lib/auth";
import { getUserSessions, deleteSessionByToken } from "@/lib/auth-models";

// ── GET /api/auth/session  — list all sessions ────────────────────────────
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

    const sessions = await getUserSessions(payload.sub);
    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error("[Auth/session GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE /api/auth/session  — revoke a session by refreshToken ──────────
export async function DELETE(req: NextRequest) {
  try {
    const tokens = getTokenFromCookies(req);
    if (!tokens.access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAccessToken(tokens.access);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    // Verify the session belongs to this user
    const sessions = await getUserSessions(payload.sub);
    const target = sessions.find((s: any) => s._id?.toString() === sessionId);

    if (!target) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Delete by refreshToken (avoids ObjectId cast issues)
    await deleteSessionByToken(target.refreshToken);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Auth/session DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
