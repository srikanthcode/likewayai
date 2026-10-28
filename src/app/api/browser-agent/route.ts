import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/automation/browser-engine";
import type { AgentOptions } from "@/lib/automation/browser-engine";
import { fetchAI } from "@/lib/api-manager";
import { getProviderForModel } from "@/lib/models";
import { browserJobQueue } from "@/lib/automation/job-queue";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import { consumeEntitlement, entitlementDenied } from "@/lib/entitlements";
import crypto from "crypto";

export const maxDuration = 180;

// CORS for the Vercel → Render hop only. A wildcard would let any website drive
// an authenticated user's browser session.
const corsHeaders = (() => {
  const allowed = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,
  ].filter((v): v is string => Boolean(v));
  return {
    "Access-Control-Allow-Origin": allowed[0] || "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-internal-secret, x-internal-user-id, x-likeway-internal",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
    "Access-Control-Max-Age": "86400",
  };
})();

// Use headless=false locally so user can see the browser
// Use headless=true on Vercel/Render (no display)
const isProduction =
  process.env.VERCEL_ENV === "production" ||
  process.env.VERCEL_ENV === "preview" ||
  !!process.env.RENDER ||
  process.env.NODE_ENV === "production";

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
    const isRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_URL;

    const tokens = getTokenFromCookies(req);
    const payload = tokens.access ? verifyAccessToken(tokens.access) : null;

    // Server-to-server calls (Vercel → Render proxy) authenticate with a shared
    // secret instead of a user cookie. The browser `x-user-id` header is NEVER
    // trusted for identity.
    const internalSecret = process.env.INTERNAL_API_SECRET || "";
    const providedInternal =
      req.headers.get("x-likeway-internal") || req.headers.get("x-internal-secret") || "";
    const isInternal =
      internalSecret.length > 0 &&
      providedInternal.length === internalSecret.length &&
      crypto.timingSafeEqual(Buffer.from(providedInternal), Buffer.from(internalSecret));

    if (!payload && !isInternal) {
      return NextResponse.json(
        { error: "Sign in to use browser automation." },
        { status: 401, headers: corsHeaders }
      );
    }

    // A verified session wins. An internal call may assert the user it is
    // acting for; it never runs as the shared "anonymous" principal.
    const assertedInternalUser = isInternal
      ? (req.headers.get("x-internal-user-id") || "").trim()
      : "";
    const userId =
      payload?.sub ||
      (/^[A-Za-z0-9_-]{1,64}$/.test(assertedInternalUser) ? assertedInternalUser : "");

    if (!userId) {
      return NextResponse.json(
        { error: "A user context is required for browser automation." },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { task, modelId: requestedModel, startUrl, headless = isProduction, async: isAsync } = body;

    // Meter user-initiated calls. The Vercel→Render proxy is metered at the edge.
    if (payload) {
      const entitlement = await consumeEntitlement(
        payload.sub,
        payload.plan,
        "browser_automation",
        payload.role
      );
      if (!entitlement.allowed) {
        return NextResponse.json(entitlementDenied(entitlement), { status: 402, headers: corsHeaders });
      }
    }

    if (!task || typeof task !== "string" || task.trim().length === 0) {
      return NextResponse.json(
        { error: "Task description is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // If requested async mode, enqueue to Job Queue immediately
    if (isAsync) {
      const job = await browserJobQueue.enqueueJob({
        userId,
        task: task.trim(),
        startUrl: startUrl?.trim(),
        modelId: requestedModel,
      });

      return NextResponse.json(
        {
          success: true,
          async: true,
          jobId: job.id,
          status: job.status,
          message: "Job enqueued. Track progress via /api/automation/jobs/" + job.id,
        },
        { status: 202, headers: corsHeaders }
      );
    }

    // If running on Vercel without local Chromium, forward to Render worker backend
    if (isOnVercel && !isRender) {
      const renderUrl = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://likewayai.onrender.com";
      const selfUrl = req.nextUrl.origin;

      if (renderUrl !== selfUrl && !renderUrl.startsWith(selfUrl + "/")) {
        const res = await fetch(`${renderUrl}/api/browser-agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(req.headers.get("authorization") ? { Authorization: req.headers.get("authorization")! } : {}),
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status, headers: corsHeaders });
      }
    }

    const modelId = requestedModel || "mistral-small-latest";
    const provider = getProviderForModel(modelId);
    const sessionId = crypto.randomUUID();

    const options: AgentOptions = {
      provider,
      modelId,
      fetchAI,
      headless,
      maxIterations: 25,
      sessionId,
      onStep: (step) => {
        console.log(
          `[Browser Agent] Step ${step.iteration}: ${step.action.action}` +
          (step.action.ref ? ` ref=${step.action.ref}` : "") +
          (step.action.value ? ` val="${step.action.value.slice(0, 30)}"` : "") +
          (step.success ? " OK" : ` FAIL: ${step.error?.slice(0, 40)}`) +
          (step.verified ? " ✓verified" : "")
        );
      },
    };

    const fullTask = startUrl
      ? `Navigate to ${startUrl} first, then: ${task}`
      : task;

    const result = await runAgent(fullTask, options);

    return NextResponse.json({
      success: result.success,
      sessionId,
      goal: result.task,
      answer: result.answer,
      stepsTaken: result.steps.length,
      finalState: result.finalState,
      steps: result.steps.map((s) => ({
        iteration: s.iteration,
        action: s.action.action,
        reasoning: s.action.reasoning,
        ref: s.action.ref,
        value: s.action.value,
        state: s.stateBefore ? "active" : "unknown",
        success: s.success,
        error: s.error,
        verified: s.verified,
        duration: s.duration,
      })),
      lastScreenshot: result.screenshots[result.screenshots.length - 1] || null,
      subGoals: result.subGoals,
      error: result.error,
      duration: result.duration,
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("[Browser Agent API]", error);
    return NextResponse.json(
      { error: error.message || "Browser agent failed" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    name: "LikeWay Browser",
    version: "7.0",
    jobQueue: true,
    message: "Unified browser agent v7 (accessibility-first, job queue, adaptive recovery). POST with { task: 'your instruction' } or { async: true }",
  }, { headers: corsHeaders });
}
