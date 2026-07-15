import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
  }

  // Get original query parameters (e.g., ?app=antigravity-ide) to preserve them after callback
  const { searchParams } = new URL(req.url);
  
  // Exclude state/code params if they were somehow passed
  const cleanParams = new URLSearchParams();
  searchParams.forEach((val, key) => {
    if (key !== "state" && key !== "code") {
      cleanParams.set(key, val);
    }
  });
  const lwQuery = cleanParams.toString();

  // Generate a random state token to prevent CSRF
  const state = crypto.randomBytes(32).toString("hex");

  const callbackUrl = `${appUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  const response = NextResponse.redirect(googleAuthUrl);
  
  // Store state in cookie for CSRF verification (5 min expiry)
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });

  // Store the original query parameters in a cookie to restore them after the Google callback completes
  if (lwQuery) {
    response.cookies.set("lw_oauth_query", lwQuery, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 300,
    });
  }

  return response;
}
