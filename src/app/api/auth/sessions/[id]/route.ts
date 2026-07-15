import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, getTokenFromCookies } from "@/lib/auth";
import { deleteSession, getUserSessions } from "@/lib/auth-models";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokens = getTokenFromCookies(req);
    if (!tokens.access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAccessToken(tokens.access);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Verify the session belongs to this user
    const userSessions = await getUserSessions(payload.sub);
    const sessionBelongsToUser = userSessions.some(
      (s: any) => s._id?.toString() === sessionId
    );

    if (!sessionBelongsToUser) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await deleteSession(sessionId);
    return NextResponse.json({ success: true, message: "Session revoked" });
  } catch (error: any) {
    console.error("[Auth] Delete session by ID error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
