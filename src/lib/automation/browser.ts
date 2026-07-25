/**
 * DEPRECATED — This file is a backward-compatibility wrapper.
 * All functionality has been moved to browser-engine.ts (v6).
 *
 * Re-export a simplified API for any code still importing from here.
 */
import { runBrowserEngine } from "./browser-engine";
import type { AgentOptions } from "./browser-engine";

interface AutomationStep {
  action: string;
  target?: string;
  value?: string;
  selector?: string;
  url?: string;
  script?: string;
  timeout?: number;
}

interface AutomationResult {
  success: boolean;
  steps: { step: AutomationStep; success: boolean; error?: string; screenshot?: string }[];
  screenshots: string[];
  output: string;
  error?: string;
}

export async function executeAutomation(
  task: string,
  steps: AutomationStep[],
  fetchAI?: AgentOptions["fetchAI"],
  provider?: string,
  modelId?: string
): Promise<AutomationResult> {
  if (!fetchAI || !provider || !modelId) {
    return {
      success: false,
      steps: [],
      screenshots: [],
      output: "",
      error: "executeAutomation requires fetchAI, provider, and modelId. Use runBrowserEngine directly for full functionality.",
    };
  }

  const result = await runBrowserEngine(task, {
    provider,
    modelId,
    fetchAI,
    headless: process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview" || !!process.env.RENDER, // headless on prod, visible locally
    maxIterations: steps.length + 5,
  });

  return {
    success: result.success,
    steps: result.steps.map((s) => ({
      step: { action: s.action.action, value: s.action.value, url: s.action.url },
      success: s.success,
      error: s.error,
      screenshot: s.screenshot,
    })),
    screenshots: result.screenshots,
    output: result.answer || result.error || "No output",
    error: result.error,
  };
}

export async function getPageContent(page: any): Promise<string> {
  return await page.evaluate(() => document.body.innerText);
}

export async function takeScreenshot(page: any): Promise<string> {
  const buffer = await page.screenshot({ fullPage: false });
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function closeBrowser(): Promise<void> {
  // Browser cleanup is handled by the unified engine
}
