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
    provider: "google",
    device: fp.userAgent.slice(0, 120),
    browser: fp.userAgent,
    ipAddress: fp.ip,
    location: "unknown",
  });

  return { accessToken, refreshToken, sessionId };
}

// ── Verify a Google ID token against Google's public keys ──────────────────
// We never trust { name, email } from the request body. The client must send
// the `id_token` Google issued, and the audience must match our OAuth client.
async function verifyGoogleIdToken(
  idToken: string
): Promise<{ email: string; name?: string; picture?: string; emailVerified: boolean } | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;

    const claims = await res.json();

    // The token MUST have been minted for OUR client id.
    const expectedAud = process.env.GOOGLE_CLIENT_ID;
    if (!expectedAud || claims.aud !== expectedAud) {
      console.error("[Auth/Google] id_token audience mismatch", {
        aud: claims.aud,
        hasExpected: Boolean(expectedAud),
      });
      return null;
    }

    const emailVerified =
      claims.email_verified === true || claims.email_verified === "true";
    if (!claims.email || !emailVerified) return null;

    return {
      email: String(claims.email).toLowerCase().trim(),
      name: claims.name || undefined,
      picture: claims.picture || undefined,
      emailVerified: true,
    };
  } catch (err: any) {
    console.error("[Auth/Google] id_token verification failed:", err?.message || err);
    return null;
  }
}

// ── POST /api/auth/google ──────────────────────────────────────────────────
// Requires a cryptographically verified Google `id_token`. For the standard
// browser flow use /api/auth/google/redirect (server-side code exchange).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { idToken } = body as { idToken?: string };

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "A Google id_token is required. Use /api/auth/google/redirect for the browser flow." },
        { status: 401 }
      );
    }

    const claims = await verifyGoogleIdToken(idToken);
    if (!claims) {
      return NextResponse.json({ error: "Invalid or unverified Google token" }, { status: 401 });
    }

    const normalizedEmail = claims.email;
    let user = await findUserByEmail(normalizedEmail);
    let isNew = false;

    if (!user) {
      user = await createUser({
        name: claims.name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        avatar: claims.picture || "",
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
        name: claims.name || user.name,
        avatar: claims.picture || user.avatar,
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
