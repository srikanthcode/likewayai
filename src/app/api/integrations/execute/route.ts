import { NextRequest, NextResponse } from "next/server";
import { executeIntegrationTool } from "@/lib/integrations/integration-registry";
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

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const { toolName, params } = await req.json();

    if (!toolName) {
      return NextResponse.json({ error: "toolName is required" }, { status: 400 });
    }

    const result = await executeIntegrationTool(userId, toolName, params || {});

    return NextResponse.json({
      success: result.success,
      toolName,
      data: result.data,
      error: result.error,
      executedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || "Tool execution failed",
    }, { status: 500 });
  }
}
