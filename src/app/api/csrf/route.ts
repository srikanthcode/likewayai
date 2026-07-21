import { NextRequest, NextResponse } from "next/server";
import { generateCsrfToken, getTokenFromCookies, verifyAccessToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Get user session from cookies
  const tokens = getTokenFromCookies(req);
  
  let sessionId = "anonymous";
  
  if (tokens.access) {
    const payload = verifyAccessToken(tokens.access);
    if (payload) {
      sessionId = payload.sessionId || payload.sub;
    }
  }

  // Generate a new CSRF token tied to this session
  const csrfToken = generateCsrfToken(sessionId);

  return NextResponse.json({
    token: csrfToken,
    sessionId,
    expiresIn: 3600, // 1 hour
  });
}
