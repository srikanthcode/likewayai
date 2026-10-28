import { NextRequest, NextResponse } from "next/server";
import { browserJobQueue } from "@/lib/automation/job-queue";
import { getRequestIdentity, isAdmin } from "@/lib/request-auth";
import { consumeEntitlement, entitlementDenied, resolveEffectivePlan } from "@/lib/entitlements";

export const maxDuration = 60;

// Only the app's own origin may call this with credentials.
function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allowed = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,
  ].filter((v): v is string => Boolean(v));
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders(req) });
}

function isServerlessWithoutBrowser(): boolean {
  const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
  const isRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_URL;
  return isOnVercel && !isRender;
}

function proxyTarget(req: NextRequest): string | null {
  const renderUrl = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!renderUrl) return null;
  const selfUrl = req.nextUrl.origin;
  if (renderUrl === selfUrl || renderUrl.startsWith(selfUrl + "/")) return null;
  return renderUrl;
}

// POST — Enqueue a new browser automation job
export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);
  try {
    const identity = getRequestIdentity(req);
    if (!identity.userId) {
      return NextResponse.json({ error: "Sign in to use browser automation." }, { status: 401, headers });
    }

    // If running on Vercel without a local Chromium, forward to the Render worker.
    if (isServerlessWithoutBrowser()) {
      const renderUrl = proxyTarget(req);
      if (!renderUrl) {
        return NextResponse.json(
          { error: "Automation backend is not configured." },
          { status: 503, headers }
        );
      }

      const body = await req.json();
      const res = await fetch(`${renderUrl}/api/automation/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
          "x-internal-user-id": identity.userId,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      return NextResponse.json(data, { status: res.status, headers });
    }

    const body = await req.json();
    const { task, startUrl, modelId, metadata } = body;

    if (!task || typeof task !== "string" || task.trim().length === 0) {
      return NextResponse.json({ error: "Task description is required" }, { status: 400, headers });
    }
    if (task.length > 4000) {
      return NextResponse.json({ error: "Task description is too long." }, { status: 400, headers });
    }

    // Browser automation is a metered, expensive capability.
    const plan = await resolveEffectivePlan(identity.userId, identity.plan, identity.role);
    const entitlement = await consumeEntitlement(
      identity.userId,
      plan,
      "browser_automation",
      identity.role
    );
    if (!entitlement.allowed) {
      return NextResponse.json(entitlementDenied(entitlement), { status: 402, headers });
    }

    // Per-user concurrency guard: a single account cannot monopolise the worker.
    const active = await browserJobQueue.listJobs({ userId: identity.userId, limit: 100 });
    const running = active.filter((j) => j.status === "queued" || j.status === "processing").length;
    const maxConcurrent = plan === "Pro" ? 5 : plan === "Plus" ? 3 : 1;
    if (running >= maxConcurrent) {
      return NextResponse.json(
        {
          error: `You already have ${running} automation job(s) running. Wait for one to finish or cancel it.`,
        },
        { status: 429, headers }
      );
    }

    const job = await browserJobQueue.enqueueJob({
      userId: identity.userId,
      task: task.trim(),
      startUrl: typeof startUrl === "string" ? startUrl.trim() : undefined,
      modelId,
      metadata,
    });

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        status: job.status,
        task: job.task,
        createdAt: job.createdAt,
        remaining: entitlement.remaining,
        message: "Job enqueued. Poll /api/automation/jobs/[id] or connect to the SSE stream.",
      },
      { status: 202, headers }
    );
  } catch (err: any) {
    console.error("[Jobs API POST]", err);
    return NextResponse.json(
      { error: err.message || "Failed to enqueue automation job" },
      { status: 500, headers }
    );
  }
}

// GET — List the caller's jobs
export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);
  try {
    const identity = getRequestIdentity(req);
    if (!identity.userId) {
      return NextResponse.json({ error: "Sign in to view automation jobs." }, { status: 401, headers });
    }

    if (isServerlessWithoutBrowser()) {
      const renderUrl = proxyTarget(req);
      if (!renderUrl) {
        return NextResponse.json(
          { error: "Automation backend is not configured." },
          { status: 503, headers }
        );
      }
      const query = req.nextUrl.search;
      const res = await fetch(`${renderUrl}/api/automation/jobs${query}`, {
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
          "x-internal-user-id": identity.userId,
        },
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status, headers });
    }

    // A caller may only list their own jobs. An admin may filter by another
    // user explicitly; a browser can never choose the owner.
    const requestedUserId = req.nextUrl.searchParams.get("userId") || undefined;
    let userId: string | undefined = identity.userId;
    if (requestedUserId && requestedUserId !== identity.userId) {
      if (!isAdmin(identity)) {
        return NextResponse.json(
          { error: "You can only view your own automation jobs." },
          { status: 403, headers }
        );
      }
      userId = requestedUserId;
    }

    const status: any = req.nextUrl.searchParams.get("status") || undefined;
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20", 10) || 20, 100);

    const jobs = await browserJobQueue.listJobs({ userId, status, limit });

    return NextResponse.json(
      {
        success: true,
        count: jobs.length,
        jobs: jobs.map((j) => ({
          id: j.id,
          task: j.task,
          status: j.status,
          progress: j.progress,
          stepsTaken: j.stepsTaken,
          createdAt: j.createdAt,
          completedAt: j.completedAt,
          duration: j.duration,
          lastScreenshot: j.lastScreenshot || null,
          result: j.result || null,
          error: j.error || null,
        })),
      },
      { headers }
    );
  } catch (err: any) {
    console.error("[Jobs API GET]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch jobs" },
      { status: 500, headers }
    );
  }
}
