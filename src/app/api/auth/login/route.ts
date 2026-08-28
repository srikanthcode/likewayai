import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createAccessToken, createRefreshToken, generateSessionId, setAuthCookies, fingerprint, isVipUser } from "@/lib/auth";
import { findUserByEmail, createSession, updateUser, recordLogin } from "@/lib/auth-models";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizePlan } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Rate limiting for login attempts (10 attempts per minute per IP)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const rateLimit = checkRateLimit(`login:${ip}`, { windowMs: 60000, maxRequests: 10 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await updateUser(user._id.toString(), { lastLoginAt: new Date() });

    const sessionId = generateSessionId();
    const fp = fingerprint(req);
    const accessToken = createAccessToken({ id: user._id.toString(), email: user.email, role: user.role, plan: user.plan }, sessionId);
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
      provider: "email",
      device: fp.userAgent.slice(0, 120),
      browser: fp.userAgent,
      ipAddress: fp.ip,
      location: "unknown",
    });

    const vip = isVipUser(user._id.toString(), user.email);
    const cookies = setAuthCookies(accessToken, refreshToken);
    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        // VIP override: always admin + Pro (must match token claims)
        role: vip ? "admin" : user.role,
        plan: vip ? "Pro" : normalizePlan(user.plan),
        onboardingCompleted: user.onboardingCompleted,
      },
      redirect: user.onboardingCompleted ? "/" : "/onboarding",
    });
    for (const c of cookies) {
      response.cookies.set(c.name, c.value, c.options as any);
    }
    return response;
  } catch (error: any) {
    console.error("[Auth] Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
