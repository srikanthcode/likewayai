import { NextRequest, NextResponse } from "next/server";
import { fetchAI } from "@/lib/api-manager";
import { getProviderForModel } from "@/lib/models";
import { planAutomation, AutomationStep } from "@/lib/automation/tasks";
import { getRequestIdentity } from "@/lib/request-auth";
import { consumeEntitlement, entitlementDenied, resolveEffectivePlan } from "@/lib/entitlements";
import { browserJobQueue } from "@/lib/automation/job-queue";

export const maxDuration = 120;

// CORS headers for cross-origin requests (e.g. Vercel frontend calling Render backend)
const corsHeaders = (() => {
  const allowed = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,
  ].filter((v): v is string => Boolean(v));
  return {
    "Access-Control-Allow-Origin": allowed[0] || "",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    "Access-Control-Max-Age": "86400",
  };
})();

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Bundler-proof dynamic import matching browser-engine.ts
let _playwright: any = null;
let _pwInitialized = false;

async function getPlaywright() {
  if (_playwright) return _playwright;

  if (_pwInitialized) {
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (_playwright) return _playwright;
    }
    throw new Error("Playwright initialization timed out after 5s");
  }
  _pwInitialized = true;

  const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
  if (isOnVercel && !process.env.RENDER && !process.env.RENDER_EXTERNAL_URL) {
    _pwInitialized = false;
    throw new Error(
      "Browser automation is not available directly on Vercel serverless. " +
      "Use Render backend or Job Queue instead."
    );
  }

  try {
    _playwright = await import("playwright");
    return _playwright;
  } catch (err: any) {
    try {
      _playwright = await import("playwright-core");
      return _playwright;
    } catch (err2: any) {
      _pwInitialized = false;
      throw new Error(
        "Browser automation requires playwright. Install it with: npm install playwright\n" +
        `Primary error: ${err.message}\n` +
        `Fallback error: ${err2.message}`
      );
    }
  }
}

// Global browser state
let browser: any = null;

// Use headless=true in production/Render/Docker; headless=false locally if display exists
const isProduction =
  process.env.VERCEL_ENV === "production" ||
  process.env.VERCEL_ENV === "preview" ||
  !!process.env.RENDER ||
  process.env.NODE_ENV === "production";

async function getBrowser(): Promise<{ browser: any }> {
  if (browser && browser.isConnected()) {
    return { browser };
  }

  const pw = await getPlaywright();
  const chromium = pw.chromium;
  const launchOptions: any = {
    headless: isProduction,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-infobars",
      "--no-first-run",
      "--no-zygote",
    ],
    timeout: 60000,
  };

  try {
    const pwExecutable = chromium.executablePath();
    if (pwExecutable) {
      launchOptions.executablePath = pwExecutable;
    }
  } catch (err: any) {
    console.log("[Automation API] Failed to get executablePath:", err.message);
  }

  browser = await chromium.launch(launchOptions);
  return { browser };
}

async function executeStep(
  page: any,
  step: AutomationStep
): Promise<{ success: boolean; screenshot?: string; error?: string; data?: string }> {
  try {
    switch (step.action) {
      case "navigate":
        await page.goto(step.url!, { waitUntil: "domcontentloaded", timeout: 30000 });
        return { success: true };

      case "click":
        await page.waitForSelector(step.selector!, { timeout: 10000 });
        await page.click(step.selector!);
        await page.waitForTimeout(500);
        return { success: true };

      case "type":
        await page.waitForSelector(step.selector!, { timeout: 10000 });
        await page.fill(step.selector!, step.value || "");
        return { success: true };

      case "wait":
        await page.waitForTimeout(parseInt(step.value || "1000", 10));
        return { success: true };

      case "scroll":
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(500);
        return { success: true };

      case "select":
        await page.selectOption(step.selector!, step.value!);
        return { success: true };

      case "hover":
        await page.hover(step.selector!);
        await page.waitForTimeout(300);
        return { success: true };

      case "screenshot":
        const buf = await page.screenshot({ fullPage: step.value === "full" });
        return { success: true, screenshot: `data:image/png;base64,${buf.toString("base64")}` };

      case "extract":
        const text = await page.evaluate(() => document.body.innerText);
        return { success: true, data: text.slice(0, 5000) };

      case "evaluate":
        await page.evaluate(step.script!);
        return { success: true };

      default:
        return { success: false, error: `Unknown action: ${step.action}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// POST — plan + execute automation (or enqueue if async: true / on Vercel)
export async function POST(req: NextRequest) {
  try {
    const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
    const isRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_URL;

    // Identity comes only from the verified session (or our own backend).
    const identity = getRequestIdentity(req);
    if (!identity.userId) {
      return NextResponse.json(
        { error: "Sign in to use browser automation." },
        { status: 401, headers: corsHeaders }
      );
    }
    const userId = identity.userId;

    const body = await req.json();
    const { task, modelId: requestedModel, async: isAsync, startUrl } = body;

    if (!task || typeof task !== "string" || task.trim().length === 0) {
      return NextResponse.json({ error: "Task description is required" }, { status: 400, headers: corsHeaders });
    }
    if (task.length > 4000) {
      return NextResponse.json({ error: "Task description is too long." }, { status: 400, headers: corsHeaders });
    }

    // Browser automation is metered and expensive — reserve quota before work.
    const effectivePlan = await resolveEffectivePlan(userId, identity.plan, identity.role);
    const entitlement = await consumeEntitlement(userId, effectivePlan, "browser_automation", identity.role);
    if (!entitlement.allowed) {
      return NextResponse.json(entitlementDenied(entitlement), { status: 402, headers: corsHeaders });
    }

    // If requested async mode, enqueue to Job Queue immediately
    if (isAsync) {
      const job = await browserJobQueue.enqueueJob({
        userId,
        task: task.trim(),
        startUrl,
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

    // If running on Vercel without local Chromium, proxy to Render worker backend
    if (isOnVercel && !isRender) {
      const renderUrl = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL;
      const selfUrl = req.nextUrl.origin;

      if (!renderUrl) {
        return NextResponse.json(
          { error: "Automation backend is not configured." },
          { status: 503, headers: corsHeaders }
        );
      }

      if (renderUrl !== selfUrl && !renderUrl.startsWith(selfUrl + "/")) {
        // Forward the verified identity with our shared secret; the browser's
        // own headers are not trusted downstream.
        const res = await fetch(`${renderUrl}/api/automation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
            "x-internal-user-id": userId,
          },
          body: JSON.stringify({ ...body, userId }),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status, headers: corsHeaders });
      }
    }

    // Select model for planning
    const modelId = requestedModel || "mistral-small-latest";
    const provider = getProviderForModel(modelId);

    // Phase 1: Plan
    const plan = await planAutomation(task.trim(), fetchAI, modelId, provider);

    // Phase 2: Execute
    const { browser: b } = await getBrowser();
    const context = await b.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    const stepResults: { step: AutomationStep; success: boolean; error?: string; screenshot?: string; data?: string }[] = [];
    let lastScreenshot = "";

    try {
      for (const step of plan.steps) {
        const result = await executeStep(page, step);
        stepResults.push({ step, ...result });
        if (result.screenshot) lastScreenshot = result.screenshot;
        if (!result.success && step.action === "navigate") break;
      }

      // Final screenshot if last step wasn't a screenshot
      if (!lastScreenshot) {
        const buf = await page.screenshot({ fullPage: false });
        lastScreenshot = `data:image/png;base64,${buf.toString("base64")}`;
      }

      // Capture final page content
      let pageContent = "";
      try {
        pageContent = await page.evaluate(() => document.body.innerText);
        pageContent = pageContent.slice(0, 3000);
      } catch {}

      const success = stepResults.every((r) => r.success);

      return NextResponse.json(
        {
          success,
          task,
          plan: plan.steps.map((s) => s.description),
          stepResults: stepResults.map((r) => ({
            description: r.step.description,
            success: r.success,
            error: r.error,
            data: r.data,
          })),
          screenshot: lastScreenshot,
          pageContent,
          summary: success
            ? `Automation completed successfully for: "${task}"`
            : `Automation had errors. Completed ${stepResults.filter((r) => r.success).length}/${stepResults.length} steps.`,
        },
        { headers: corsHeaders }
      );
    } finally {
      await context.close().catch(() => {});
    }
  } catch (error: any) {
    console.error("[Automation API]", error);
    return NextResponse.json({ error: error.message || "Automation failed" }, { status: 500, headers: corsHeaders });
  }
}

// GET — list active browser status
export async function GET() {
  return NextResponse.json(
    {
      status: "ready",
      browserActive: !!browser?.isConnected(),
      jobQueueActive: true,
      message: "Automation API ready. Send POST with { task: 'your instruction' } or { async: true }",
    },
    { headers: corsHeaders }
  );
}

// DELETE — close browser
export async function DELETE() {
  try {
    if (browser) {
      await browser.close();
      browser = null;
    }
    return NextResponse.json({ success: true, message: "Browser closed" }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
