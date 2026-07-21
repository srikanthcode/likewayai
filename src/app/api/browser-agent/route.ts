import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/automation/browser-engine";
import type { AgentOptions } from "@/lib/automation/browser-engine";
import { fetchAI } from "@/lib/api-manager";
import { getProviderForModel } from "@/lib/models";

export const maxDuration = 180;

// Use headless=false locally so user can see the browser
// Use headless=true on Vercel/Render (no display)
const isProduction = !!process.env.VERCEL_REGION || !!process.env.RENDER;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { task, modelId: requestedModel, startUrl, headless = isProduction } = body;

    if (!task || typeof task !== "string" || task.trim().length === 0) {
      return NextResponse.json({ error: "Task description is required" }, { status: 400 });
    }

    const modelId = requestedModel || "llama-3.3-70b-versatile";
    const provider = getProviderForModel(modelId);

    const options: AgentOptions = {
      provider,
      modelId,
      fetchAI,
      headless,
      maxIterations: 25,
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
    });
  } catch (error: any) {
    console.error("[Browser Agent API]", error);
    return NextResponse.json(
      { error: error.message || "Browser agent failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    name: "LikeWay Browser",
    version: "6.0",
    message: "Unified browser agent v6 (accessibility-first, adaptive recovery, goal decomposition). POST with { task: 'your instruction' }",
  });
}
