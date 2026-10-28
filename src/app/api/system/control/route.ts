import { NextRequest, NextResponse } from "next/server";
import { findSystemApp, launchSystemApp, KNOWN_SYSTEM_APPS, isLocalExecutionHost } from "@/lib/system/computer-control";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import { consumeEntitlement, entitlementDenied } from "@/lib/entitlements";

export async function GET(req: NextRequest) {
  // Enumerating installed software spawns processes on the host — never
  // expose it to unauthenticated callers.
  const tokens = getTokenFromCookies(req);
  const payload = tokens.access ? verifyAccessToken(tokens.access) : null;
  if (!payload) {
    return NextResponse.json({ error: "Sign in to use Computer Control." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const app = searchParams.get("app");

  if (!app) {
    return NextResponse.json({
      apps: KNOWN_SYSTEM_APPS.map(a => ({
        id: a.id,
        name: a.name,
        displayName: a.displayName,
        category: a.category,
      })),
      localExecution: isLocalExecutionHost(),
    });
  }

  const detection = await findSystemApp(app);
  return NextResponse.json(detection);
}

export async function POST(req: NextRequest) {
  try {
    const tokens = getTokenFromCookies(req);
    const payload = tokens.access ? verifyAccessToken(tokens.access) : null;
    if (!payload) {
      return NextResponse.json({ error: "Sign in to use Computer Control." }, { status: 401 });
    }

    if (!isLocalExecutionHost()) {
      return NextResponse.json(
        {
          error:
            "Computer Control requires the Likeway Companion running on your own computer. " +
            "Cloud servers cannot launch your desktop apps.",
          companionRequired: true,
        },
        { status: 503 }
      );
    }

    const entitlement = await consumeEntitlement(
      payload.sub,
      payload.plan,
      "computer_control",
      payload.role
    );
    if (!entitlement.allowed) {
      return NextResponse.json(entitlementDenied(entitlement), { status: 402 });
    }

    const body = await req.json();
    const appName = body.appName || body.app;

    if (!appName) {
      return NextResponse.json({ error: "appName is required" }, { status: 400 });
    }

    const result = await launchSystemApp(appName);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to launch app" }, { status: 500 });
  }
}