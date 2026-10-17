import { NextRequest, NextResponse } from "next/server";
import {
  createPendingApproval,
  resolvePendingApproval,
} from "@/lib/integrations/integration-registry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { approvalId, approved } = await req.json();

    if (!approvalId) {
      return NextResponse.json({ error: "approvalId is required" }, { status: 400 });
    }

    const resolved = resolvePendingApproval(approvalId, Boolean(approved));
    if (!resolved) {
      return NextResponse.json(
        { error: "Approval request not found or already expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      approved: Boolean(approved),
      action: resolved.toolName,
      target: resolved.target,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process approval" },
      { status: 500 }
    );
  }
}
