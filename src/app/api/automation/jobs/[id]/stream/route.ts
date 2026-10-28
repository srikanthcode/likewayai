import { NextRequest, NextResponse } from "next/server";
import { browserJobQueue, JobStep, AutomationJob } from "@/lib/automation/job-queue";
import { getRequestIdentity, canAccessResource } from "@/lib/request-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

interface RouteParams {
  params: Promise<{ id: string }>;
}

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  // Event streams carry a user's live task data — never open them to all origins.
  "Vary": "Origin",
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // A stream reveals a job's task, steps, screenshots and result. It is
  // authenticated and owner-scoped before any event is emitted.
  const identity = getRequestIdentity(req);
  if (!identity.userId) {
    return NextResponse.json({ error: "Sign in to view this job." }, { status: 401 });
  }

  const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
  const isRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_URL;

  // On Vercel: proxy SSE stream from Render backend
  if (isOnVercel && !isRender) {
    const renderUrl = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL;
    const selfUrl = req.nextUrl.origin;

    if (!renderUrl) {
      return NextResponse.json({ error: "Automation backend is not configured." }, { status: 503 });
    }

    if (renderUrl !== selfUrl && !renderUrl.startsWith(selfUrl + "/")) {
      try {
        const upstream = await fetch(`${renderUrl}/api/automation/jobs/${id}/stream`, {
          headers: {
            Accept: "text/event-stream",
            "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
            "x-internal-user-id": identity.userId,
          },
          signal: req.signal,
        });

        return new Response(upstream.body, { headers: STREAM_HEADERS });
      } catch (err: any) {
        console.error("[Job Stream Proxy Error]", err);
      }
    }
  }

  // Check ownership up front; do not open a stream for a job the caller cannot see.
  const jobForAuth = await browserJobQueue.getJob(id);
  if (!jobForAuth || !canAccessResource(identity, jobForAuth.userId)) {
    return NextResponse.json({ error: `Job "${id}" not found` }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {}
      };

      // 1. Fetch current job state
      const initialJob = await browserJobQueue.getJob(id);
      if (!initialJob) {
        sendEvent("error", { message: `Job "${id}" not found` });
        controller.close();
        return;
      }

      sendEvent("init", initialJob);

      // If already done, close immediately
      if (["completed", "failed", "cancelled"].includes(initialJob.status)) {
        sendEvent("done", initialJob);
        controller.close();
        return;
      }

      // 2. Setup listeners for real-time progress
      const onStep = (step: JobStep) => {
        sendEvent("step", step);
      };

      const onUpdate = (job: AutomationJob) => {
        sendEvent("update", {
          status: job.status,
          progress: job.progress,
          currentSubGoal: job.currentSubGoal,
          stepsTaken: job.stepsTaken,
          lastScreenshot: job.lastScreenshot,
        });
      };

      const onDone = (result: { status: string; job?: AutomationJob; error?: string }) => {
        sendEvent("done", result);
        cleanup();
        try {
          controller.close();
        } catch {}
      };

      browserJobQueue.on(`job:${id}:step`, onStep);
      browserJobQueue.on(`job:${id}:update`, onUpdate);
      browserJobQueue.on(`job:${id}:done`, onDone);

      // 3. Heartbeat ping every 15s
      const heartbeatTimer = setInterval(() => {
        sendEvent("ping", { ts: Date.now() });
      }, 15000);

      const cleanup = () => {
        clearInterval(heartbeatTimer);
        browserJobQueue.off(`job:${id}:step`, onStep);
        browserJobQueue.off(`job:${id}:update`, onUpdate);
        browserJobQueue.off(`job:${id}:done`, onDone);
      };

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, { headers: STREAM_HEADERS });
}
