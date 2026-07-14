import { NextRequest, NextResponse } from "next/server";
import {
  createAccessToken,
  createRefreshToken,
  generateSessionId,
  setAuthCookies,
  fingerprint,
} from "@/lib/auth";
import {
  findUserByEmail,
  createUser,
  createSession,
  updateUser,
  recordLogin,
} from "@/lib/auth-models";

// ── Shared: create a full session after OAuth ──────────────────────────────
async function issueSession(user: any, isNew: boolean, req: NextRequest) {
  const sessionId = generateSessionId();
  const fp = fingerprint(req);

  const accessToken = createAccessToken(
    { id: user._id.toString(), email: user.email, role: user.role, plan: user.plan },
    sessionId
  );
  const refreshToken = createRefreshToken(user._id.toString(), sessionId);

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

  await recordLogin({
    userId: user._id.toString(),
    provider: "google",
    device: fp.userAgent.slice(0, 120),
    browser: fp.userAgent,
    ipAddress: fp.ip,
    location: "unknown",
  });

  return { accessToken, refreshToken, sessionId };
}

// ── POST /api/auth/google ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, avatar } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await findUserByEmail(normalizedEmail);
    let isNew = false;

    if (!user) {
      user = await createUser({
        name: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        avatar: avatar || "",
        provider: "google",
        emailVerified: true,
        role: "user",
        plan: "free",
        onboardingCompleted: false,
        lastLoginAt: new Date(),
      });
      isNew = true;
    } else {
      await updateUser(user._id.toString(), {
        lastLoginAt: new Date(),
        name: name || user.name,
        avatar: avatar || user.avatar,
        emailVerified: true,
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Failed to process login" }, { status: 500 });
    }

    const { accessToken, refreshToken } = await issueSession(user, isNew, req);

    const redirectPath = isNew || !user.onboardingCompleted ? "/onboarding" : "/";
    const cookies = setAuthCookies(accessToken, refreshToken);

    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan,
        onboardingCompleted: user.onboardingCompleted || false,
      },
      redirect: redirectPath,
    });

    for (const c of cookies) {
      response.cookies.set(c.name, c.value, c.options as any);
    }
    return response;
  } catch (error: any) {
    console.error("[Auth/Google POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
