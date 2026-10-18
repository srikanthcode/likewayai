import { NextRequest, NextResponse } from "next/server";
import { reach } from "@/lib/agent-reach";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'url' parameter" },
        { status: 400 }
      );
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
