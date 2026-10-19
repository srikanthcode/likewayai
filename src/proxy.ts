import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Route groups ───────────────────────────────────────────────────────────
const PUBLIC = ["/pricing", "/learn", "/legal", "/login", "/signup", "/success"];
const AUTH_ONLY = ["/login", "/signup"];
const PROTECTED = ["/account", "/settings", "/onboarding"];
// "/" (root) is handled separately — it's the chat/main screen

// ── Proxy (formerly middleware) ────────────────────────────────────────────
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Redirect removed /landing to root ────────────────────────────────────
  if (pathname === "/landing" || pathname.startsWith("/landing/")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Read both new and legacy cookie names
  const accessToken =
    req.cookies.get("lw_at")?.value ||
    req.cookies.get("likeway_access_token")?.value;
  const refreshToken =
    req.cookies.get("lw_rt")?.value ||
    req.cookies.get("likeway_refresh_token")?.value;

  // Guest mode cookie set when user clicks "Continue without signing up"
  const isGuest =
    req.cookies.get("lw_guest")?.value === "true" ||
    req.cookies.get("likeway_guest_mode")?.value === "true";

  // Authenticated user has real tokens
  const isAuthUser = Boolean(accessToken || refreshToken);
  // A session for root "/" exists if authenticated OR continuing as guest
  const hasSession = Boolean(isAuthUser || isGuest);

  // ── 0. Public pages — always accessible (no auth needed) ───────────────
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // ── 1. Redirect logged-in users away from login / signup ────────────────
  // Only redirect authenticated users away from login/signup.
  // Guests must still be allowed to visit /login and /signup if they decide to create an account.
  if (isAuthUser && AUTH_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ── 2. Protect root "/" — redirect to /login if no session ──────────────
  if (!hasSession && pathname === "/") {
    const url = new URL("/login", req.url);
    req.nextUrl.searchParams.forEach((val, key) => {
      url.searchParams.set(key, val);
    });
    return NextResponse.redirect(url);
  }

  // ── 3. Protect other app routes ─────────────────────────────────────────
  // Protected pages like /account and /settings require true authentication
  if (!isAuthUser && PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    req.nextUrl.searchParams.forEach((val, key) => {
      if (key !== "next") {
        url.searchParams.set(key, val);
      }
    });
    return NextResponse.redirect(url);
  }

  // ── 4. Let the request through ──────────────────────────────────────────
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *  - _next/static  (static files)
     *  - _next/image   (image optimization)
     *  - favicon.ico, robots.txt, sitemap.xml
     *  - /api/*        (API routes handle their own auth)
     *  - /_             (Next.js internals)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon-.*\\.png|robots\\.txt|sitemap\\.xml|api/).*)",
  ],
};
