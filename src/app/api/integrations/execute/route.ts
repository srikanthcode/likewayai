import { NextRequest, NextResponse } from "next/server";
import { executeIntegrationTool } from "@/lib/integrations/integration-registry";
import { requireIdentity, unauthorizedResponse } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Tool execution acts with the user's connected credentials — never run it
    // for a caller we cannot identify.
    const identity = requireIdentity(req);
    if (!identity) return unauthorizedResponse();
    const userId = identity.userId!;
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
