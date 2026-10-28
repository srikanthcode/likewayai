import { NextRequest, NextResponse } from "next/server";
import { browserJobQueue } from "@/lib/automation/job-queue";
import { getRequestIdentity, canAccessResource, isAdmin } from "@/lib/request-auth";

export const maxDuration = 60;

// Only the app's own origin may call this with credentials. A wildcard here
// would let any site read a signed-in user's job results.
function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allowed = getAllowedOrigins();
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    "Access-Control-Max-Age": "86400",
  };
}

function getAllowedOrigins(): string[] {
  const configured = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,
  ].filter((v): v is string => Boolean(v));
  return configured.length ? configured : [];
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders(req) });
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET — Fetch detailed job status and progress
export async function GET(req: NextRequest, { params }: RouteParams) {
  const headers = corsHeaders(req);
  try {
    const { id } = await params;

    const identity = getRequestIdentity(req);
    if (!identity.userId) {
      return NextResponse.json({ error: "Sign in to view automation jobs." }, { status: 401, headers });
    }

    const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
    const isRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_URL;

    if (isOnVercel && !isRender) {
      const renderUrl = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL;
      const selfUrl = req.nextUrl.origin;

      if (!renderUrl) {
        return NextResponse.json(
          { error: "Automation backend is not configured." },
          { status: 503, headers }
        );
      }

      if (renderUrl !== selfUrl && !renderUrl.startsWith(selfUrl + "/")) {
        // Forward the verified identity, not whatever the browser sent.
        const res = await fetch(`${renderUrl}/api/automation/jobs/${id}`, {
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
            "x-internal-user-id": identity.userId,
          },
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status, headers });
      }
    }

    const job = await browserJobQueue.getJob(id);
    if (!job) {
      return NextResponse.json(
        { error: `Job with ID "${id}" not found` },
        { status: 404, headers }
      );
    }

    // Ownership is enforced server-side. "Not found" is returned for jobs the
    // caller does not own so ids cannot be probed.
    if (!canAccessResource(identity, job.userId)) {
      return NextResponse.json({ error: `Job with ID "${id}" not found` }, { status: 404, headers });
    }

    return NextResponse.json(
      {
        success: true,
        job: {
          id: job.id,
          task: job.task,
          startUrl: job.startUrl,
          modelId: job.modelId,
          status: job.status,
          progress: job.progress,
          currentSubGoal: job.currentSubGoal,
          subGoals: job.subGoals,
          stepsTaken: job.stepsTaken,
          steps: job.steps,
          lastScreenshot: job.lastScreenshot || null,
          result: job.result || null,
          finalState: job.finalState || null,
          error: job.error || null,
          duration: job.duration || (job.startedAt ? Date.now() - job.startedAt : 0),
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
        },
      },
      { headers }
    );
  } catch (err: any) {
    console.error("[Job ID GET]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch job" },
      { status: 500, headers }
    );
  }
}

// DELETE — Cancel a running/queued job
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const headers = corsHeaders(req);
  try {
    const { id } = await params;

    const identity = getRequestIdentity(req);
    if (!identity.userId) {
      return NextResponse.json({ error: "Sign in to cancel automation jobs." }, { status: 401, headers });
    }

    const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
    const isRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_URL;

    if (isOnVercel && !isRender) {
      const renderUrl = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL;
      const selfUrl = req.nextUrl.origin;

      if (!renderUrl) {
        return NextResponse.json(
          { error: "Automation backend is not configured." },
          { status: 503, headers }
        );
      }

      if (renderUrl !== selfUrl && !renderUrl.startsWith(selfUrl + "/")) {
        const res = await fetch(`${renderUrl}/api/automation/jobs/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
            "x-internal-user-id": identity.userId,
          },
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status, headers });
      }
    }

    // Ownership is checked before any state change.
    const job = await browserJobQueue.getJob(id);
    if (!job || !canAccessResource(identity, job.userId)) {
      return NextResponse.json(
        { error: `Job "${id}" could not be cancelled (already completed or not found)` },
        { status: 404, headers }
      );
    }

    const cancelled = await browserJobQueue.cancelJob(id, "Cancelled by user");
    if (!cancelled) {
      return NextResponse.json(
        { error: `Job "${id}" could not be cancelled (already completed or not found)` },
        { status: 400, headers }
      );
    }

    return NextResponse.json(
      { success: true, message: `Job "${id}" cancelled successfully` },
      { headers }
    );
  } catch (err: any) {
    console.error("[Job ID DELETE]", err);
    return NextResponse.json(
      { error: err.message || "Failed to cancel job" },
      { status: 500, headers }
    );
  }
}
