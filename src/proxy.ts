import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Route groups ───────────────────────────────────────────────────────────
const PUBLIC = ["/landing", "/pricing", "/learn", "/legal", "/login", "/signup", "/success"];
const AUTH_ONLY = ["/login", "/signup"];
const PROTECTED = ["/account", "/settings", "/onboarding"];
// "/" (root) is handled separately — it's the chat/main screen

// ── Proxy ─────────────────────────────────────────────────────────────
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Read both new and legacy cookie names
  const accessToken =
    req.cookies.get("lw_at")?.value ||
    req.cookies.get("likeway_access_token")?.value;
  const refreshToken =
    req.cookies.get("lw_rt")?.value ||
    req.cookies.get("likeway_refresh_token")?.value;

  // A session exists if EITHER token is present
  const hasSession = Boolean(accessToken || refreshToken);

  // ── 0. Public pages — always accessible (no auth needed) ───────────────
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // ── 1. Redirect logged-in users away from login / signup ────────────────
  if (hasSession && AUTH_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
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
  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
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
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|api/).*)",
  ],
};
