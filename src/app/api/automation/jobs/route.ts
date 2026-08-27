import { NextRequest, NextResponse } from "next/server";
import { browserJobQueue } from "@/lib/automation/job-queue";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";

export const maxDuration = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST — Enqueue a new browser automation job
export async function POST(req: NextRequest) {
  try {
    const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
    const isRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_URL;

    // If running on Vercel without a local Chromium, forward the enqueue request to Render worker
    if (isOnVercel && !isRender) {
      const renderUrl = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://likewayai.onrender.com";
      const selfUrl = req.nextUrl.origin;

      if (renderUrl !== selfUrl && !renderUrl.startsWith(selfUrl + "/")) {
        const body = await req.json();
        const res = await fetch(`${renderUrl}/api/automation/jobs`, {
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

    const tokens = getTokenFromCookies(req);
    const payload = tokens.access ? verifyAccessToken(tokens.access) : null;
    const userId = payload?.sub || req.headers.get("x-user-id") || "anonymous";

    const body = await req.json();
    const { task, startUrl, modelId, metadata } = body;

    if (!task || typeof task !== "string" || task.trim().length === 0) {
      return NextResponse.json(
        { error: "Task description is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const job = await browserJobQueue.enqueueJob({
      userId,
      task: task.trim(),
      startUrl: startUrl?.trim(),
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
        message: "Job enqueued successfully. Poll /api/automation/jobs/[id] or connect to SSE stream.",
      },
      { status: 202, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[Jobs API POST]", err);
    return NextResponse.json(
      { error: err.message || "Failed to enqueue automation job" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET — List jobs
export async function GET(req: NextRequest) {
  try {
    const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
    const isRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_URL;

    if (isOnVercel && !isRender) {
      const renderUrl = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://likewayai.onrender.com";
      const selfUrl = req.nextUrl.origin;

      if (renderUrl !== selfUrl && !renderUrl.startsWith(selfUrl + "/")) {
        const query = req.nextUrl.search;
        const res = await fetch(`${renderUrl}/api/automation/jobs${query}`, {
          headers: {
            "Content-Type": "application/json",
            ...(req.headers.get("authorization") ? { Authorization: req.headers.get("authorization")! } : {}),
          },
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status, headers: corsHeaders });
      }
    }

    const tokens = getTokenFromCookies(req);
    const payload = tokens.access ? verifyAccessToken(tokens.access) : null;
    const userId = payload?.sub || req.nextUrl.searchParams.get("userId") || undefined;
    const status: any = req.nextUrl.searchParams.get("status") || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);

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
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[Jobs API GET]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch jobs" },
      { status: 500, headers: corsHeaders }
    );
  }
}
