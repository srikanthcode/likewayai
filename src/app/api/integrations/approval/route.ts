import { NextRequest, NextResponse } from "next/server";
import {
  getPendingApproval,
  resolvePendingApproval,
} from "@/lib/integrations/integration-registry";
import { requireIdentity, unauthorizedResponse, canAccessResource } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Approving a tool action is an authorization decision — it must be made by
    // the account the action belongs to.
    const identity = requireIdentity(req);
    if (!identity) return unauthorizedResponse();

    const { approvalId, approved } = await req.json();

    if (!approvalId) {
      return NextResponse.json({ error: "approvalId is required" }, { status: 400 });
    }

    // Peek at the owner without resolving, so an attacker cannot approve (or
    // reject) someone else's pending action.
    const pending = getPendingApproval(approvalId);
    if (!pending || !canAccessResource(identity, pending.userId)) {
      return NextResponse.json(
        { error: "Approval request not found or already expired" },
        { status: 404 }
      );
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
