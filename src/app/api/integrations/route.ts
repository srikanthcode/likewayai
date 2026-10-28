import { NextRequest, NextResponse } from "next/server";
import {
  INTEGRATIONS_CATALOG,
  getUserConnectedApps,
  toggleAppConnection,
} from "@/lib/integrations/integration-registry";
import { getAppCredential } from "@/lib/integrations/credentials-store";
import { requireIdentity, unauthorizedResponse } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Integration state and credential metadata belong to one account only.
    const identity = requireIdentity(req);
    if (!identity) return unauthorizedResponse();
    const userId = identity.userId!;
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
    const identity = requireIdentity(req);
    if (!identity) return unauthorizedResponse();
    const userId = identity.userId!;
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
