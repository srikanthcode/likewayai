import { NextRequest, NextResponse } from "next/server";
import {
  verifyAccessToken,
  verifyRefreshToken,
  getTokenFromCookies,
  clearAuthCookies,
} from "@/lib/auth";
import {
  deleteSessionByToken,
  deleteAllUserSessions,
} from "@/lib/auth-models";

// ── POST /api/auth/logout ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Always clear cookies regardless of what else happens
  const cookieClears = clearAuthCookies();

  try {
    const tokens = getTokenFromCookies(req);
    const body = await req.json().catch(() => ({ all: false }));
    const logoutAll = Boolean(body.all);

    let userId: string | null = null;
    const currentRefreshToken: string | null = tokens.refresh || null;

    // Get userId from access token if valid
    if (tokens.access) {
      const payload = verifyAccessToken(tokens.access);
      if (payload) userId = payload.sub;
    }

    // Fallback: get userId from refresh token
    if (!userId && tokens.refresh) {
      const payload = verifyRefreshToken(tokens.refresh);
      if (payload) userId = payload.sub;
    }

    if (logoutAll && userId) {
      // Delete ALL sessions for this user
      await deleteAllUserSessions(userId);
    } else if (currentRefreshToken) {
      // Delete only the current session
      await deleteSessionByToken(currentRefreshToken);
    }

    const response = NextResponse.json({ success: true });
    for (const c of cookieClears) {
      response.cookies.set(c.name, c.value, c.options as any);
    }
    return response;
  } catch (error: any) {
    console.error("[Auth/logout]", error);
    // Still clear cookies even on error
    const response = NextResponse.json({ success: true });
    for (const c of cookieClears) {
      response.cookies.set(c.name, c.value, c.options as any);
    }
    return response;
  }
}
