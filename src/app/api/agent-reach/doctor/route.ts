import { NextResponse } from "next/server";
import { runDoctor } from "@/lib/agent-reach";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const report = await runDoctor();
    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to run Agent Reach doctor",
      },
      { status: 500 }
    );
  }
}
