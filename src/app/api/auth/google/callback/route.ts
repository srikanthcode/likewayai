

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // ── Handle OAuth errors from Google ─────────────────────────────────────
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=google_${error}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", req.url));
  }    // ── CSRF: verify state token ─────────────────────────────────────────────
  const storedState = req.cookies.get("google_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", req.url));
  }

  try {
    // ── Exchange authorization code for tokens ───────────────────────────
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[Google OAuth] Token exchange failed:", errText);
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", req.url));
    }

    const tokens = await tokenRes.json();

    // ── Fetch Google user profile ─────────────────────────────────────────
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.redirect(new URL("/login?error=userinfo_failed", req.url));
    }

    const gUser = await userInfoRes.json();
    const email = gUser.email?.toLowerCase()?.trim();
    const name = gUser.name || email?.split("@")[0] || "User";
    const avatar = gUser.picture || "";

    if (!email) {
      return NextResponse.redirect(new URL("/login?error=no_email", req.url));
    }

    // ── Find or create user ───────────────────────────────────────────────
    let user = await findUserByEmail(email);
    let isNew = false;

    if (!user) {
      user = await createUser({
        name,
        email,
        avatar,
        provider: "google",
        emailVerified: Boolean(gUser.verified_email),
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
      const { ObjectId } = await import("mongodb");
      user = {
        _id: new ObjectId(),
        name: name || "User",
        email,
        avatar: avatar || "",
        provider: "google",
        emailVerified: true,
        role: "user",
        plan: "free",
        onboardingCompleted: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };
      isNew = true;
    }

    // ── Create session + issue JWT tokens ─────────────────────────────────
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

    // ── Set cookies and redirect ──────────────────────────────────────────
    const originalQuery = req.cookies.get("lw_oauth_query")?.value || "";
    const redirectSuffix = originalQuery ? `?${originalQuery}` : "";
    const redirectPath = isNew || !user.onboardingCompleted 
      ? `/onboarding${redirectSuffix}` 
      : `/${redirectSuffix}`;

    const cookies = setAuthCookies(accessToken, refreshToken);

    // Use req.url (same origin) to ensure cookies are set for the right domain
    const res = NextResponse.redirect(new URL(redirectPath, req.url));
    // Clear state & query cookies
    res.cookies.set("google_oauth_state", "", { maxAge: 0, path: "/" });
    res.cookies.set("lw_oauth_query", "", { maxAge: 0, path: "/" });
    for (const c of cookies) {
      res.cookies.set(c.name, c.value, c.options as any);
    }
    return res;
  } catch (err: any) {
    console.error("[Google OAuth] Callback error:", err);
    return NextResponse.redirect(new URL("/login?error=internal_error", req.url));
  }
}
