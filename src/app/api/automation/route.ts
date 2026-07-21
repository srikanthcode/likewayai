import { NextRequest, NextResponse } from "next/server";
import { fetchAI } from "@/lib/api-manager";
import { MODELS, getProviderForModel } from "@/lib/models";
import { planAutomation, AutomationStep } from "@/lib/automation/tasks";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";

export const maxDuration = 120;

// Bundler-proof dynamic import (same pattern as browser-engine.ts)
let _chromium: any = null;

async function getChromium() {
  if (_chromium) return _chromium;

  try {
    const loader = new Function("specifier", "return import(specifier)");
    const pw = await loader("playwright");
    _chromium = pw.chromium;
    return _chromium;
  } catch (err: any) {
    throw new Error(
      "Browser automation requires playwright. Install it with: npm install playwright\n" +
      `Error: ${err.message}`
    );
  }
}

// Global browser state
let browser: any = null;

// Use headless=false locally so user can see the browser
const isProduction = !!process.env.VERCEL_REGION || !!process.env.RENDER;

async function getBrowser(): Promise<{ browser: any }> {
  if (browser && browser.isConnected()) {
    return { browser };
  }

  const chromium = await getChromium();
  browser = await chromium.launch({
    headless: isProduction,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
  });
  return { browser };
}

async function executeStep(page: any, step: AutomationStep): Promise<{ success: boolean; screenshot?: string; error?: string; data?: string }> {
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
        await page.waitForTimeout(parseInt(step.value || "1000"));
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

// POST — plan + execute automation
export async function POST(req: NextRequest) {
  try {
    const tokens = getTokenFromCookies(req);
    const payload = tokens.access ? verifyAccessToken(tokens.access) : null;
    const userId = payload?.sub || "anonymous";

    const body = await req.json();
    const { task, modelId: requestedModel } = body;

    if (!task || typeof task !== "string" || task.trim().length === 0) {
      return NextResponse.json({ error: "Task description is required" }, { status: 400 });
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
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    const stepResults: { step: AutomationStep; success: boolean; error?: string; screenshot?: string; data?: string }[] = [];
    let lastScreenshot = "";

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

    await context.close();

    const success = stepResults.every((r) => r.success);

    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error("[Automation API]", error);
    return NextResponse.json({ error: error.message || "Automation failed" }, { status: 500 });
  }
}

// GET — list active browser sessions
export async function GET() {
  return NextResponse.json({
    browserActive: !!browser?.isConnected(),
    message: "Automation API ready. Send POST with { task: 'your instruction' }",
  });
}

// DELETE — close browser
export async function DELETE() {
  try {
    if (browser) {
      await browser.close();
      browser = null;
    }
    return NextResponse.json({ success: true, message: "Browser closed" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
