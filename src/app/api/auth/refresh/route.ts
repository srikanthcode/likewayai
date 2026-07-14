import { NextRequest, NextResponse } from "next/server";
import {
  verifyRefreshToken,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getTokenFromCookies,
  generateSessionId,
  fingerprint,
} from "@/lib/auth";
import {
  findUserById,
  findSessionByToken,
  deleteSessionByToken,
  createSession,
  updateUser,
} from "@/lib/auth-models";

// ── POST /api/auth/refresh ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const tokens = getTokenFromCookies(req);

    if (!tokens.refresh) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    // Verify the refresh token JWT
    const payload = verifyRefreshToken(tokens.refresh);
    if (!payload) {
      const res = NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
      for (const c of clearAuthCookies()) res.cookies.set(c.name, c.value, c.options as any);
      return res;
    }

    // Make sure the session still exists in DB (not revoked)
    const session = await findSessionByToken(tokens.refresh);
    if (!session) {
      const res = NextResponse.json({ error: "Session revoked" }, { status: 401 });
      for (const c of clearAuthCookies()) res.cookies.set(c.name, c.value, c.options as any);
      return res;
    }

    // Load the user
    const user = await findUserById(payload.sub);
    if (!user) {
      const res = NextResponse.json({ error: "User not found" }, { status: 401 });
      for (const c of clearAuthCookies()) res.cookies.set(c.name, c.value, c.options as any);
      return res;
    }

    // ── Rotate refresh token (delete old, issue new) ──────────────────────
    await deleteSessionByToken(tokens.refresh);

    const fp = fingerprint(req);
    const newSessionId = generateSessionId();
    const accessToken = createAccessToken(
      { id: user._id.toString(), email: user.email, role: user.role, plan: user.plan },
      newSessionId
    );
    const refreshToken = createRefreshToken(user._id.toString(), newSessionId);

    await createSession({
      userId: user._id.toString(),
      refreshToken,
      deviceName: fp.userAgent.slice(0, 120),
      browser: fp.userAgent,
      operatingSystem: "unknown",
      ipAddress: fp.ip,
      location: "unknown",
      lastActiveAt: new Date(),
    });

    // Update last login time
    await updateUser(user._id.toString(), { lastLoginAt: new Date() });

    const cookies = setAuthCookies(accessToken, refreshToken);
    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan,
        onboardingCompleted: user.onboardingCompleted,
        emailVerified: user.emailVerified,
        provider: user.provider,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });

    for (const c of cookies) {
      response.cookies.set(c.name, c.value, c.options as any);
    }
    return response;
  } catch (error: any) {
    console.error("[Auth/refresh]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
