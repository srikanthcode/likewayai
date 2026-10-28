import { NextRequest, NextResponse } from "next/server";
import { reach } from "@/lib/agent-reach";
import { assertSafeUrl, SsrfError } from "@/lib/ssrf-guard";
import { requireIdentity, unauthorizedResponse } from "@/lib/request-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // Fetching an arbitrary URL server-side is a privileged operation.
    const identity = requireIdentity(req);
    if (!identity) return unauthorizedResponse();

    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'url' parameter" },
        { status: 400 }
      );
    }

    // Reject loopback, private, link-local and metadata endpoints before any
    // network call happens.
    try {
      await assertSafeUrl(url);
    } catch (err) {
      if (err instanceof SsrfError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
      throw err;
    }

    const result = await reach(url);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to extract content with Agent Reach",
      },
      { status: 500 }
    );
  }
}
