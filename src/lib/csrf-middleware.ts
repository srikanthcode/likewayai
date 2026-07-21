/**
 * CSRF Protection Middleware
 * 
 * Protects state-changing API routes (POST, PUT, DELETE, PATCH)
 * by validating CSRF tokens from the request.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateCsrfToken, getTokenFromCookies } from "./auth";

// Routes that require CSRF protection (state-changing operations)
const CSRF_PROTECTED_ROUTES = [
  "/api/chat",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/subscription",
  "/api/user",
  "/api/projects",
  "/api/support",
];

// Methods that are state-changing and need CSRF protection
const STATE_CHANGING_METHODS = ["POST", "PUT", "DELETE", "PATCH"];

export function csrfProtection(req: NextRequest): NextResponse | null {
  // Skip CSRF for non-state-changing methods
  if (!STATE_CHANGING_METHODS.includes(req.method)) {
    return null;
  }

  // Check if this route needs CSRF protection
  const pathname = req.nextUrl.pathname;
  const needsCsrf = CSRF_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  
  if (!needsCsrf) {
    return null;
  }

  // Skip CSRF for API key authenticated requests (programmatic access)
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    return null;
  }

  // Get CSRF token from header or body
  const csrfToken = req.headers.get("x-csrf-token") || 
                    req.headers.get("csrf-token");

  // Get session ID from cookies
  const tokens = getTokenFromCookies(req);
  const sessionId = req.headers.get("x-session-id") || "anonymous";

  if (!csrfToken) {
    // In development, allow requests without CSRF token
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[CSRF] Missing CSRF token for ${req.method} ${pathname}`);
      return null;
    }
    
    return NextResponse.json(
      { error: "CSRF token required" },
      { status: 403 }
    );
  }

  // Validate CSRF token
  if (!validateCsrfToken(csrfToken, sessionId)) {
    console.warn(`[CSRF] Invalid CSRF token for ${req.method} ${pathname}`);
    return NextResponse.json(
      { error: "Invalid CSRF token" },
      { status: 403 }
    );
  }

  return null; // Validation passed
}

// Helper to get CSRF token for client-side
export function getCsrfHeaders(sessionId: string): Record<string, string> {
  // Client should call /api/csrf to get a fresh token
  return {
    "X-Session-Id": sessionId,
  };
}
