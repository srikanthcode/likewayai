import { NextRequest, NextResponse } from "next/server";
import { browserJobQueue } from "@/lib/automation/job-queue";

export const maxDuration = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET — Fetch detailed job status and progress
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
    const isRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_URL;

    if (isOnVercel && !isRender) {
      const renderUrl = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://likewayai.onrender.com";
      const selfUrl = req.nextUrl.origin;

      if (renderUrl !== selfUrl && !renderUrl.startsWith(selfUrl + "/")) {
        const res = await fetch(`${renderUrl}/api/automation/jobs/${id}`, {
          headers: {
            "Content-Type": "application/json",
            ...(req.headers.get("authorization") ? { Authorization: req.headers.get("authorization")! } : {}),
          },
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status, headers: corsHeaders });
      }
    }

    const job = await browserJobQueue.getJob(id);
    if (!job) {
      return NextResponse.json(
        { error: `Job with ID "${id}" not found` },
        { status: 404, headers: corsHeaders }
      );
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
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[Job ID GET]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch job" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE — Cancel a running/queued job
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
    const isRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_URL;

    if (isOnVercel && !isRender) {
      const renderUrl = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://likewayai.onrender.com";
      const selfUrl = req.nextUrl.origin;

      if (renderUrl !== selfUrl && !renderUrl.startsWith(selfUrl + "/")) {
        const res = await fetch(`${renderUrl}/api/automation/jobs/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(req.headers.get("authorization") ? { Authorization: req.headers.get("authorization")! } : {}),
          },
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status, headers: corsHeaders });
      }
    }

    const cancelled = await browserJobQueue.cancelJob(id, "Cancelled by user");
    if (!cancelled) {
      return NextResponse.json(
        { error: `Job "${id}" could not be cancelled (already completed or not found)` },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: `Job "${id}" cancelled successfully` },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[Job ID DELETE]", err);
    return NextResponse.json(
      { error: err.message || "Failed to cancel job" },
      { status: 500, headers: corsHeaders }
    );
  }
}
