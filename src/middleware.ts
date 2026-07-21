import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = ["/landing", "/pricing", "/learn", "/legal", "/login", "/signup", "/success"];
const AUTH_ONLY = ["/login", "/signup"];
const PROTECTED = ["/account", "/settings", "/onboarding"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const accessToken =
    req.cookies.get("lw_at")?.value ||
    req.cookies.get("likeway_access_token")?.value;
  const refreshToken =
    req.cookies.get("lw_rt")?.value ||
    req.cookies.get("likeway_refresh_token")?.value;

  const hasSession = Boolean(accessToken || refreshToken);

  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  if (hasSession && AUTH_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!hasSession && pathname === "/") {
    const url = new URL("/login", req.url);
    req.nextUrl.searchParams.forEach((val, key) => {
      url.searchParams.set(key, val);
    });
    return NextResponse.redirect(url);
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon-.*\\.png|robots\\.txt|sitemap\\.xml|api/).*)",
  ],
};
