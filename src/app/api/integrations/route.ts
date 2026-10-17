import { NextRequest, NextResponse } from "next/server";
import {
  INTEGRATIONS_CATALOG,
  getUserConnectedApps,
  toggleAppConnection,
} from "@/lib/integrations/integration-registry";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getUserId(req: NextRequest): string {
  try {
    const cookie = req.cookies.get("lw_at")?.value || req.cookies.get("likeway_access_token")?.value;
    if (cookie) {
      const payload = verifyAccessToken(cookie);
      if (payload?.sub) return payload.sub;
    }
  } catch (e) {
    // ignore auth error and fallback
  }
  return req.headers.get("x-user-id") || "guest-user";
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const connectedAppIds = getUserConnectedApps(userId);

    const catalog = INTEGRATIONS_CATALOG.map((item) => ({
      ...item,
      isConnected: connectedAppIds.has(item.id),
      toolsCount: item.tools.length,
      toolsList: item.tools.map((t) => ({
        name: t.name,
        description: t.description,
        requiresApproval: t.requiresApproval,
      })),
    }));

    return NextResponse.json({
      success: true,
      integrations: catalog,
      connectedCount: connectedAppIds.size,
    });
  } catch (err: any) {
    console.error("[API integrations error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const { appId, action } = await req.json();

    if (!appId) {
      return NextResponse.json({ error: "appId is required" }, { status: 400 });
    }

    const connect = action !== "disconnect";
    const isNowConnected = toggleAppConnection(userId, appId, connect);

    return NextResponse.json({
      success: true,
      appId,
      isConnected: isNowConnected,
      message: isNowConnected
        ? `Successfully connected ${appId}`
        : `Successfully disconnected ${appId}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update integration connection" },
      { status: 500 }
    );
  }
}
