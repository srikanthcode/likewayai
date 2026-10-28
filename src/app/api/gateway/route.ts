import { NextRequest, NextResponse } from "next/server";
import { AIOrchestrator } from "@/lib/orchestrator/ai-orchestrator";
import { AppError } from "@/lib/errors/error-types";
import { TelemetryTracer } from "@/lib/telemetry/tracer";
import { getRequestIdentity } from "@/lib/request-auth";
import { consumeEntitlement, entitlementDenied, resolveEffectivePlan } from "@/lib/entitlements";

export const maxDuration = 60;

// Same-origin only. The gateway runs the AI orchestrator, so a wildcard CORS
// policy plus no auth would let any website spend this account's credits.
function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allowed = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.FRONTEND_URL,
  ].filter((v): v is string => Boolean(v));
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const traceId = TelemetryTracer.createTraceId();
  const headers = corsHeaders(req);

  try {
    const body = await req.json();
    const { prompt, history, isVoice = false } = body;

    // Identity is derived from the verified session. A `userId` in the request
    // body is ignored — it was previously trusted and is attacker-controlled.
    const identity = getRequestIdentity(req);
    if (!identity.userId) {
      return NextResponse.json(
        { error: "Sign in to use the AI gateway." },
        { status: 401, headers }
      );
    }
    const userId = identity.userId;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400, headers }
      );
    }
    if (prompt.length > 15000) {
      return NextResponse.json(
        { error: "Prompt is too long (max 15,000 characters)." },
        { status: 400, headers }
      );
    }

    // Meter the gateway the same way chat is metered.
    const plan = await resolveEffectivePlan(userId, identity.plan, identity.role);
    const entitlement = await consumeEntitlement(userId, plan, "chat_messages", identity.role);
    if (!entitlement.allowed) {
      return NextResponse.json(entitlementDenied(entitlement), { status: 402, headers });
    }

    const orchestrator = AIOrchestrator.getInstance();
    const result = await orchestrator.process({
      prompt,
      history,
      isVoice,
      userId,
      traceId,
    });

    return NextResponse.json(result, { headers });
  } catch (err: any) {
    console.error(`[AI Gateway] Error (trace: ${traceId}):`, err);

    if (err instanceof AppError) {
      return NextResponse.json(err.toJSON(), { status: err.statusCode, headers });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          category: "UNKNOWN_ERROR",
          message: "The request could not be completed. Please try again.",
          traceId,
        },
      },
      { status: 500, headers }
    );
  }
}
