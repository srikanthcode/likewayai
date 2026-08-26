import { NextRequest, NextResponse } from "next/server";
import { AIOrchestrator } from "@/lib/orchestrator/ai-orchestrator";
import { AppError } from "@/lib/errors/error-types";
import { TelemetryTracer } from "@/lib/telemetry/tracer";

export const maxDuration = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const traceId = TelemetryTracer.createTraceId();

  try {
    const body = await req.json();
    const { prompt, history, isVoice = false } = body;
    const userId = req.headers.get("x-user-id") || body.userId || "anonymous";

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const orchestrator = AIOrchestrator.getInstance();
    const result = await orchestrator.process({
      prompt,
      history,
      isVoice,
      userId,
      traceId,
    });

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (err: any) {
    console.error(`[AI Gateway] Error (trace: ${traceId}):`, err);

    if (err instanceof AppError) {
      return NextResponse.json(err.toJSON(), { status: err.statusCode, headers: corsHeaders });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          category: "UNKNOWN_ERROR",
          message: err?.message || "Internal gateway processing error",
          traceId,
        },
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
