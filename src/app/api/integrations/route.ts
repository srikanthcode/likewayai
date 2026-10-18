import { NextRequest, NextResponse } from "next/server";
import {
  INTEGRATIONS_CATALOG,
  getUserConnectedApps,
  toggleAppConnection,
} from "@/lib/integrations/integration-registry";
import { getAppCredential } from "@/lib/integrations/credentials-store";
import { verifyAccessToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getUserId(req: NextRequest): string {
  try {
    const cookie = req.cookies.get("lw_at")?.value || req.cookies.get("likeway_access_token")?.value;
    if (cookie) {
      const payload = verifyAccessToken(cookie);
      if (payload?.sub) return payload.sub;
    }
  } catch {}
  return req.headers.get("x-user-id") || "guest-user";
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const connectedAppIds = getUserConnectedApps(userId);

    const catalog = INTEGRATIONS_CATALOG.map((item) => {
      const isConnected = connectedAppIds.has(item.id);
      const cred = getAppCredential(userId, item.id);

      return {
        ...item,
        isConnected,
        connectedAccount: isConnected && cred ? {
          username: cred.username,
          email: cred.email,
          avatarUrl: cred.avatarUrl,
          details: cred.meta?.publicRepos
            ? `${cred.meta.publicRepos} public repos`
            : cred.meta?.latencyMs
            ? `Latency: ${cred.meta.latencyMs}ms`
            : cred.meta?.serverInfo || undefined,
        } : isConnected && item.id === "browser_automation" ? {
          username: "Autonomous Engine",
          details: "Ready for live web navigation & fetch",
        } : undefined,
        toolsCount: item.tools.length,
        toolsList: item.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
          requiresApproval: t.requiresApproval,
          risk: t.risk,
        })),
      };
    });

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
