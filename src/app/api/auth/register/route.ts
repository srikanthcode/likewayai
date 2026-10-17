import { NextRequest, NextResponse } from "next/server";
import { hashPassword, createAccessToken, createRefreshToken, generateSessionId, setAuthCookies, fingerprint } from "@/lib/auth";
import { findUserByEmail, createUser, createSession, recordLogin } from "@/lib/auth-models";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Rate limiting for registration attempts (5 attempts per minute per IP)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const rateLimit = checkRateLimit(`register:${ip}`, { windowMs: 60000, maxRequests: 5 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const user = await createUser({
      name: name.trim(),
      email: normalizedEmail,
      avatar: "",
      provider: "email",
      passwordHash,
      emailVerified: false,
      role: "user",
      plan: "free",
      onboardingCompleted: false,
      lastLoginAt: new Date(),
    });

    if (!user) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    const sessionId = generateSessionId();
    const fp = fingerprint(req);
    const accessToken = createAccessToken({ id: user._id.toString(), email: user.email, role: user.role, plan: user.plan }, sessionId);
    const refreshToken = createRefreshToken(user._id.toString(), sessionId, user.role, user.plan);

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
      provider: "email",
      device: fp.userAgent.slice(0, 120),
      browser: fp.userAgent,
      ipAddress: fp.ip,
      location: "unknown",
    });

    const cookies = setAuthCookies(accessToken, refreshToken);
    const response = NextResponse.json({
      user: { id: user._id.toString(), name: user.name, email: user.email, avatar: user.avatar, role: user.role, plan: user.plan, onboardingCompleted: false },
      redirect: "/onboarding",
    });
    for (const c of cookies) {
      response.cookies.set(c.name, c.value, c.options as any);
    }
    return response;
  } catch (error: any) {
    console.error("[Auth] Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
