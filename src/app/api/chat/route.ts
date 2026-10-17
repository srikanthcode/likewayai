import { NextRequest, NextResponse } from "next/server";
import { fetchAI } from "@/lib/api-manager";
import { MODELS, getProviderForModel } from "@/lib/models";
import { SYSTEM_PROMPTS, AgentMode, LIKEWAY_RESPONSE_ARCHITECTURE } from "@/lib/agents";
import { getVerifiedLatestInfo } from "@/lib/browsing";
import { executeDeepResearch } from "@/lib/deep-research";
import { saveMessage, getHistory, getConversationContext, getUserPreferences } from "@/lib/memory";
import { generateImage, editImage } from "@/lib/tools";
import { PLANS, PlanType, normalizePlan } from "@/lib/plans";
import {
  SEARCH_KEYWORDS,
  TIME_KEYWORDS,
  CODING_KEYWORDS_PATTERN,
  CODING_ACTION_PATTERN,
  REAL_TIME_TERM_PATTERN
} from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkDailyLimit } from "@/lib/daily-rate-limit";
import { checkModelAccess, consumeEntitlement, entitlementDenied, resolveEffectivePlan } from "@/lib/entitlements";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import { detectPromptInjection, sanitizeInput } from "@/lib/security";
import { logger, generateRequestId } from "@/lib/logger";
import { orchestrator, analyzeIntent } from "@/lib/orchestrator";
import type { OrchestratorContext } from "@/lib/orchestrator";
import { detectComputerControlIntent, launchSystemApp, formatComputerControlCard, isLocalExecutionHost } from "@/lib/system/computer-control";
import { isAutonomousDevIntent, generate3DRacingGameSpec, executeAutonomousProject, isBuildIntent, generateProjectSpec } from "@/lib/autonomous/engine";
import crypto from "crypto";

// ── Free proxy URL — SERVER-SIDE ONLY. Never imported by client bundle.
const FREE_MODELS_PROXY = "https://freemodels-chat.freemodels.workers.dev";
const TOKENHARBOR_PROXY = "https://tokenharbor.ai/v1";
const TOKENHARBOR_KEY = process.env.TOKENHARBOR_API_KEY || "";

// Lazy import — browser-engine has heavy deps that crash on Vercel serverless
let runBrowserEngine: any = null;

export const maxDuration = 120;

/**
 * CRITICAL FIX: Never strip leading spaces/indentation (`\n[ \t]+`) on lines!
 * Stripping leading spaces destroys Python code, nested Markdown lists, and
 * code blocks. Also, never apply multi-line regexes to individual streaming
 * token deltas — only normalize full messages when saving to DB.
 */
function cleanFormatting(text: string): string {
  if (!text) return text;
  return text
    .replace(/(\n\s*[│┌┐└┘├┤┬┴┼─▼↑↓→←]+\s*\n)/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n");
}

interface SuggestionStreamState {
  inBlock: boolean;
  carry: string;
  raw: string;
}

const OPEN_SUG_TAG = "<suggestions>";
const CLOSE_SUG_TAG = "</suggestions>";

/**
 * CRITICAL FIX: Chunk-safe streaming stripper for `<suggestions>...</suggestions>`.
 * LLM token streams frequently split `<suggestions>` across multiple chunks
 * (e.g. `"<"`, `"suggestions"`, `">"`). By holding any partial prefix of
 * `<suggestions>` in `st.carry`, the tag is cleanly intercepted across chunk
 * boundaries and never leaks into the visible chat text.
 */
function stripSuggestions(delta: string, st: SuggestionStreamState): string {
  let text = st.carry + delta;
  st.carry = "";
  let out = "";

  while (text.length > 0) {
    if (!st.inBlock) {
      const openIdx = text.indexOf(OPEN_SUG_TAG);
      if (openIdx !== -1) {
        out += text.slice(0, openIdx);
        st.inBlock = true;
        text = text.slice(openIdx + OPEN_SUG_TAG.length);
        continue;
      }
      // Check if the end of `text` is a partial prefix of `<suggestions>`
      let matchedPrefixLen = 0;
      const maxCheck = Math.min(text.length, OPEN_SUG_TAG.length - 1);
      for (let len = maxCheck; len >= 1; len--) {
        if (OPEN_SUG_TAG.startsWith(text.slice(-len))) {
          matchedPrefixLen = len;
          break;
        }
      }
      if (matchedPrefixLen > 0) {
        out += text.slice(0, text.length - matchedPrefixLen);
        st.carry = text.slice(text.length - matchedPrefixLen);
      } else {
        out += text;
      }
      break;
    } else {
      const closeIdx = text.indexOf(CLOSE_SUG_TAG);
      if (closeIdx !== -1) {
        st.raw += text.slice(0, closeIdx);
        st.inBlock = false;
        text = text.slice(closeIdx + CLOSE_SUG_TAG.length);
        continue;
      }
      let matchedPrefixLen = 0;
      const maxCheck = Math.min(text.length, CLOSE_SUG_TAG.length - 1);
      for (let len = maxCheck; len >= 1; len--) {
        if (CLOSE_SUG_TAG.startsWith(text.slice(-len))) {
          matchedPrefixLen = len;
          break;
        }
      }
      if (matchedPrefixLen > 0) {
        st.raw += text.slice(0, text.length - matchedPrefixLen);
        st.carry = text.slice(text.length - matchedPrefixLen);
      } else {
        st.raw += text;
      }
      break;
    }
  }

  return out;
}

function flushSuggestionsCarry(st: SuggestionStreamState): string {
  if (!st.carry) return "";
  const leftover = st.carry;
  st.carry = "";
  if (st.inBlock) {
    st.raw += leftover;
    return "";
  }
  return leftover;
}

function parseSuggestionLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/^\[|\]$/g, "").trim())
    .filter((l) => l.length > 3 && !l.startsWith("<"))
    .slice(0, 4);
}

interface LikewayEngineLabel {
  name: string;
  intro: string;
}

const LIKEWAY_ENGINE_LABELS: Record<string, LikewayEngineLabel> = {
  "gpt-6-astra": { name: "Likeway Omni", intro: "Likeway's smart router that automatically selects the fastest, strongest reasoning engine for each prompt" },
  "glm-5.2": { name: "Likeway Bilingual", intro: "Likeway's bilingual reasoning engine" },
  "kimi-k3": { name: "Likeway LongContext", intro: "Likeway's long-context research engine" },
  "sol": { name: "Likeway Sol", intro: "Likeway's low-latency fast engine" },
  "terra": { name: "Likeway Terra", intro: "Likeway's analytical and scientific engine" },
  "claude-opus-5.5": { name: "Likeway Opus", intro: "Likeway's deep-reasoning engine" },
  "claude-sonnet-5": { name: "Likeway Sonnet", intro: "Likeway's balanced fast-reasoning engine" },
  "claude-fable-5": { name: "Likeway Fable", intro: "Likeway's creative writing engine" },
  "claude-fable-5.1": { name: "Likeway Fable Pro", intro: "Likeway's creative and visual reasoning engine" },
  "deepseek-v4.1-flash:free": { name: "Likeway Flash", intro: "Likeway's ultra-fast reasoning engine" },
  "mimo-v2.6-flash:free": { name: "Likeway Mimo", intro: "Likeway's multimodal engine" },
};

function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || typeof prompt !== "string") {
    return { valid: false, error: "Prompt is required" };
  }
  if (prompt.trim().length === 0) {
    return { valid: false, error: "Prompt cannot be empty" };
  }
  if (prompt.length > 15000) {
    return { valid: false, error: "Prompt is too long (max 15,000 characters)" };
  }
  return { valid: true };
}

function getUserIdFromSession(req: NextRequest): string {
  const tokens = getTokenFromCookies(req);
  if (tokens.access) {
    const payload = verifyAccessToken(tokens.access);
    if (payload) return payload.sub;
  }
  return "anonymous";
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromSession(req);
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId") || undefined;
    const projectId = searchParams.get("projectId") || "default";

    const history = await getHistory(userId, 50, projectId, conversationId);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Failed to fetch conversation history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const reqLogger = logger.request(requestId);

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const {
      prompt,
      modelId,
      history = [],
      files = [],
      images = [],
      mode = "General",
      projectId = "default",
      customInstructions = "",
      experimental: _experimental = false,
      extendedThinking = false,
      webSearch = false,
      conversationId,
      startUrl = "",
    } = body;

    const userId = getUserIdFromSession(req);
    const tokens = getTokenFromCookies(req);
    const tokenPayload = tokens.access ? verifyAccessToken(tokens.access) : null;
    const isAdmin = tokenPayload?.role === "admin";

    // Authoritative real-time plan resolution: checks DB if JWT says Core so paying users are never blocked
    const plan: PlanType = await resolveEffectivePlan(userId, tokenPayload?.plan, tokenPayload?.role);

    // Server-side model allowlist check
    const modelAccess = checkModelAccess(plan, modelId, tokenPayload?.role);
    if (!modelAccess.allowed) {
      return new Response(
        JSON.stringify({ error: modelAccess.reason, upgradeTo: modelAccess.upgradeTier, plan }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const meter = async (feature: Parameters<typeof consumeEntitlement>[2]) => {
      if (userId === "anonymous") return null;
      return consumeEntitlement(userId, plan, feature, tokenPayload?.role);
    };

    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const injectionCheck = detectPromptInjection(prompt);
    if (injectionCheck.detected) {
      reqLogger.warn("Potential prompt injection detected", { 
        pattern: injectionCheck.pattern,
        userId 
      });
    }

    const sanitizedPrompt = sanitizeInput(prompt);

    reqLogger.info("Chat request received", {
      userId,
      plan,
      mode,
      modelId,
      promptLength: sanitizedPrompt.length,
      hasImages: images.length > 0,
    });

    // Rate limiting - Per minute (higher burst allowance for paying tiers)
    const maxPerMinute = plan === "Pro" ? 60 : plan === "Plus" ? 45 : plan === "Go" ? 30 : 20;
    const rateLimitConfig = { windowMs: 60000, maxRequests: maxPerMinute };
    const rateLimit = checkRateLimit(userId, rateLimitConfig, isAdmin);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a few seconds and try again." }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": rateLimitConfig.maxRequests.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(rateLimit.resetTime / 1000).toString(),
        },
      });
    }

    // Daily plan limit (paying plans Go/Plus/Pro have 99,999/unlimited)
    const isGpt6Promo = modelId === "gpt-6-astra";
    const planConfig = PLANS[plan] || PLANS.Core;
    const dailyLimit = checkDailyLimit(userId, planConfig.limits.messagesDay, isAdmin || plan !== "Core");
    if (!dailyLimit.allowed && !isGpt6Promo) {
      return new Response(JSON.stringify({
        error: `Daily message limit reached (${dailyLimit.limit} messages/day on Core). Upgrade to Go, Plus, or Pro for unlimited messages.`,
        limit: dailyLimit.limit,
        used: dailyLimit.used,
        resetTime: dailyLimit.resetTime,
        plan,
        upgradeTo: "Go",
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-DailyLimit-Limit": dailyLimit.limit.toString(),
          "X-DailyLimit-Remaining": "0",
          "X-DailyLimit-Reset": dailyLimit.resetTime.toString(),
        },
      });
    }

    // Save user message to memory
    saveMessage(userId, { role: "user", content: sanitizedPrompt }, projectId, conversationId).catch((error) => {
      console.error("[Chat API] Failed to save user message:", error);
    });

    // ── Computer Control & App Launcher ──────────────────────────────
    const computerControl = detectComputerControlIntent(sanitizedPrompt);
    if (computerControl.isComputerControl && computerControl.targetApp) {
      const cc = await meter("computer_control");
      if (cc && !cc.allowed) {
        return new Response(JSON.stringify(entitlementDenied(cc)), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!isLocalExecutionHost()) {
        const guidance =
          "### 🖥️ Computer Control — Desktop Launch Required\n\n" +
          `I can see you want to open **${computerControl.targetApp}**, but this app is running on a cloud server, ` +
          "so it cannot launch programs directly on your machine.\n\n" +
          "Start the **Likeway Companion** on your computer (`npm run companion`), then ask me again.";
        const encoder = new TextEncoder();
        const guideStream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: guidance } }] })}\n\n`
              )
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        if (userId !== "anonymous") {
          saveMessage(userId, { role: "assistant", content: guidance }, projectId, conversationId).catch(() => {});
        }
        return new Response(guideStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      const launchResult = await launchSystemApp(computerControl.targetApp);
      const formattedCard = formatComputerControlCard(launchResult);

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: formattedCard } }] })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      if (userId !== "anonymous") {
        saveMessage(userId, { role: "assistant", content: formattedCard }, projectId, conversationId).catch(() => {});
      }

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ── Autonomous Software Development & Game Engine ───────────────
    const autoDev = isAutonomousDevIntent(sanitizedPrompt);
    const wantsBuild = autoDev.isDev || isBuildIntent(sanitizedPrompt);
    if (wantsBuild) {
      const ab = await meter("autonomous_app_builder");
      if (ab && !ab.allowed) {
        return new Response(JSON.stringify(entitlementDenied(ab)), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }

      let spec = await generateProjectSpec(sanitizedPrompt);
      if (!spec && autoDev.isDev && autoDev.projectType === "3d_racing_game") {
        spec = generate3DRacingGameSpec();
      }

      if (!spec) {
        const encoder = new TextEncoder();
        const guidance =
          "⚠️ I couldn't generate a runnable project plan for that request. " +
          "Try naming the kind of app (e.g. \"build a Pomodoro timer web app\") and I'll scaffold it.";
        const planStream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: guidance } }] })}\n\n`)
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(planStream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      }

      const devResult = await executeAutonomousProject(spec);

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: devResult.summaryMarkdown } }] })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      if (userId !== "anonymous") {
        saveMessage(userId, { role: "assistant", content: devResult.summaryMarkdown }, projectId, conversationId).catch(() => {});
      }

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ── Orchestrator: understand the task BEFORE routing ──────────────
    const taskPlan = analyzeIntent(sanitizedPrompt, mode);
    reqLogger.info("Task plan created", {
      userId,
      planType: taskPlan.type,
      complexity: taskPlan.complexity,
      steps: taskPlan.steps.length,
      requiredTools: taskPlan.requiredTools,
    });

    const isDeepResearch = mode === "Researcher" || mode === "deep-research";
    if (isDeepResearch) {
      const dr = await meter("deep_research");
      if (dr && !dr.allowed) {
        return new Response(JSON.stringify(entitlementDenied(dr)), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }
      const deepRes = await executeDeepResearch(
        sanitizedPrompt,
        modelId || "google/gemini-2.5-flash",
        history,
        plan as PlanType,
        extendedThinking
      );
      return deepRes;
    }

    const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";

    // ── LikeWay Browser Mode (v6 — unified engine) ────────────────────
    const isBrowserAgent = mode === "Browser";
    if (isBrowserAgent) {
      const ba = await meter("browser_automation");
      if (ba && !ba.allowed) {
        return new Response(JSON.stringify(entitlementDenied(ba)), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (isOnVercel) {
        const renderUrl = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://likewayai.onrender.com";
        const selfUrl = req.nextUrl.origin;
        if (renderUrl === selfUrl || renderUrl.startsWith(selfUrl + "/")) {
          return NextResponse.json(
            { error: `RENDER_API_URL points to this Vercel domain (${renderUrl}). Set it to the Render backend URL (e.g. https://likewayai.onrender.com) in Vercel Dashboard → Environment Variables.` },
            { status: 500 }
          );
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const send = (text: string) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
            };
            send(`> **LikeWay Browser v6** — Forwarding to \`${renderUrl}\`...\n\n`);
            send(`> Task: ${sanitizedPrompt}\n\n`);
            try {
              const res = await fetch(`${renderUrl}/api/browser-agent`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(process.env.INTERNAL_API_SECRET
                    ? { "x-likeway-internal": process.env.INTERNAL_API_SECRET }
                    : {}),
                },
                body: JSON.stringify({ task: sanitizedPrompt, startUrl, headless: true }),
                signal: AbortSignal.timeout(115000),
              });
              
              if (!res.ok) {
                const errText = await res.text().catch(() => "Unknown error");
                throw new Error(`Render backend returned ${res.status}: ${errText.slice(0, 200)}`);
              }
              
              const data = await res.json();
              if (data.lastScreenshot) {
                send(`\n![Browser Screenshot](${data.lastScreenshot})\n\n`);
              }
              if (data.success && data.answer) {
                send(`\n**Result:** ${data.answer}\n\n`);
              } else if (data.error) {
                send(`\n**Error:** ${data.error}\n\n`);
              } else {
                send(`\n**Completed** ${data.stepsTaken || 0} steps\n\n`);
              }
              send(`> Steps: ${data.stepsTaken || 0} | Duration: ${((data.duration || 0) / 1000).toFixed(1)}s\n`);
            } catch (err: any) {
              send(`\n> **Error:** ${err.message}\n`);
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
      }

      if (!runBrowserEngine) {
        const mod = await import("@/lib/automation/browser-engine");
        runBrowserEngine = mod.runBrowserEngine;
      }
      const browserModelId = modelId || "mistral-small-latest";
      const browserProvider = getProviderForModel(browserModelId);

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (text: string) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
          };

          send(`> **LikeWay Browser v6** — Launching autonomous browser agent...\n\n`);
          send(`> Task: ${sanitizedPrompt}\n\n`);

          try {
            let lastSubGoal = "";
            const isProduction = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview" || !!process.env.RENDER;
            const browserSessionId = crypto.randomUUID();
            const result = await runBrowserEngine(sanitizedPrompt, {
              provider: browserProvider,
              modelId: browserModelId,
              fetchAI,
              headless: isProduction,
              maxIterations: 25,
              sessionId: browserSessionId,
              onStep: (step: any) => {
                if (step.subGoal && step.subGoal !== lastSubGoal) {
                  lastSubGoal = step.subGoal;
                  send(`\n> **Sub-goal:** ${step.subGoal}\n\n`);
                }
                const status = step.success ? (step.verified ? "OK✓" : "OK") : "FAIL";
                let msg = `> Step ${step.iteration}: ${step.action.action}`;
                if (step.action.ref) msg += ` ref=${step.action.ref}`;
                if (step.action.text) msg += ` "${step.action.text.slice(0, 30)}"`;
                if (step.action.value) msg += ` val="${step.action.value.slice(0, 30)}"`;
                if (step.action.key) msg += ` key=${step.action.key}`;
                msg += ` — ${status}`;
                if (step.error) msg += ` (${step.error.slice(0, 40)})`;
                msg += "\n";
                send(msg);
              },
            });

            send("\n---\n\n");
            if (result.success && result.answer) {
              send(`**Result:** ${result.answer}\n\n`);
            } else if (result.error) {
              send(`**Error:** ${result.error}\n\n`);
            } else {
              send(`**Completed** ${result.steps.length} steps in ${((result.duration || 0) / 1000).toFixed(1)}s\n\n`);
            }
            send(`> Steps: ${result.steps.length} | Duration: ${((result.duration || 0) / 1000).toFixed(1)}s\n`);
          } catch (err: any) {
            send(`\n> **Browser agent error:** ${err.message}\n`);
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ── Automation Mode (v6 — uses unified engine) ───────────────────
    const isAutomation = mode === "Automation";
    if (isAutomation) {
      const ba = await meter("browser_automation");
      if (ba && !ba.allowed) {
        return new Response(JSON.stringify(entitlementDenied(ba)), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (isOnVercel) {
        const renderUrl = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://likewayai.onrender.com";
        const selfUrl = req.nextUrl.origin;
        if (renderUrl === selfUrl || renderUrl.startsWith(selfUrl + "/")) {
          return NextResponse.json(
            { error: `RENDER_API_URL points to this Vercel domain (${renderUrl}). Set it to the Render backend URL in Vercel Dashboard → Environment Variables.` },
            { status: 500 }
          );
        }
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const send = (text: string) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
            };
            send(`> **Automation Mode** — Forwarding to \`${renderUrl}\`...\n\n`);
            send(`> Task: ${sanitizedPrompt}\n\n`);
            try {
              const res = await fetch(`${renderUrl}/api/browser-agent`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(process.env.INTERNAL_API_SECRET
                    ? { "x-likeway-internal": process.env.INTERNAL_API_SECRET }
                    : {}),
                },
                body: JSON.stringify({ task: sanitizedPrompt, headless: true }),
                signal: AbortSignal.timeout(180000),
              });
              const data = await res.json();

              if (data.steps && Array.isArray(data.steps)) {
                for (const step of data.steps) {
                  if (step.screenshot) {
                    send(`\n![Step ${step.iteration}: ${step.action}](${step.screenshot})\n\n`);
                  }
                }
              } else if (data.lastScreenshot) {
                send(`\n![Browser Screenshot](${data.lastScreenshot})\n\n`);
              }

              if (data.success && data.answer) {
                send(`\n**Result:** ${data.answer}\n\n`);
              } else if (data.error) {
                send(`\n**Error:** ${data.error}\n\n`);
              } else {
                send(`\n**Completed** ${data.stepsTaken || 0} steps\n\n`);
              }
              send(`> Steps: ${data.stepsTaken || 0} | Duration: ${((data.duration || 0) / 1000).toFixed(1)}s\n`);
            } catch (err: any) {
              send(`\n> **Error:** ${err.message}\n`);
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
      }

      if (!runBrowserEngine) {
        const mod = await import("@/lib/automation/browser-engine");
        runBrowserEngine = mod.runBrowserEngine;
      }
      const automationModelId = modelId || (MODELS.find(m => m.fast) || MODELS[0]).id;
      const automationProvider = getProviderForModel(automationModelId);

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (text: string) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
          };

          send(`> **Automation Mode** — Launching browser agent...\n\n`);
          send(`> Task: ${sanitizedPrompt}\n\n`);

          try {
            let lastSubGoal = "";
            const isProduction = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview" || !!process.env.RENDER;
            const autoSessionId = crypto.randomUUID();
            const result = await runBrowserEngine(sanitizedPrompt, {
              provider: automationProvider,
              modelId: automationModelId,
              fetchAI,
              headless: isProduction,
              maxIterations: 25,
              sessionId: autoSessionId,
              onStep: (step: any) => {
                if (step.subGoal && step.subGoal !== lastSubGoal) {
                  lastSubGoal = step.subGoal;
                  send(`\n> **Sub-goal:** ${step.subGoal}\n\n`);
                }
                const status = step.success ? "OK" : "FAIL";
                send(`> Step ${step.iteration}: ${step.action.action} — ${status}${step.error ? ` (${step.error.slice(0, 40)})` : ""}\n`);
              },
            });

            send("\n---\n\n");
            if (result.success && result.answer) {
              send(`**Result:** ${result.answer}\n\n`);
            } else if (result.error) {
              send(`**Error:** ${result.error}\n\n`);
            } else {
              send(`**Completed** ${result.steps.length} steps in ${((result.duration || 0) / 1000).toFixed(1)}s\n\n`);
            }
            send(`> Steps: ${result.steps.length} | Duration: ${((result.duration || 0) / 1000).toFixed(1)}s\n`);
          } catch (err: any) {
            send(`\n> **Error:** ${err.message}\nTry again or describe the task differently.`);
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      saveMessage(userId, { role: "assistant", content: `Automation: ${sanitizedPrompt}` }, projectId, conversationId).catch(() => {});

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    // ── Orchestrated Execution (search / multi-step tasks) ─────────────
    const SPREADSHEET_HINT = /\b(excel|xlsx|csv|spreadsheet|dataset)\b/i;
    const shouldOrchestrate =
      taskPlan.type === "multi-step" ||
      taskPlan.type === "document" ||
      (taskPlan.type === "search" && taskPlan.complexity !== "simple") ||
      (taskPlan.type === "data-analysis" && SPREADSHEET_HINT.test(sanitizedPrompt));

    if (shouldOrchestrate) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (text: string) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
          };

          send(`> **Task Plan:** ${taskPlan.type} (${taskPlan.complexity}) — ${taskPlan.steps.length} steps\n\n`);

          try {
            const orchContext: OrchestratorContext = {
              userId,
              projectId,
              conversationId,
              plan: plan as string,
              history: history.slice(-10),
              customInstructions,
            };

            const result = await orchestrator.execute(
              taskPlan,
              sanitizedPrompt,
              orchContext,
              {
                modelId: modelId || taskPlan.modelRecommendation,
                extendedThinking,
                onStep: (stepAction, status) => {
                  const icon = status === "running" ? "▶" : status === "completed" ? "✓" : "✗";
                  send(`> ${icon} ${stepAction} — ${status}\n\n`);
                },
              }
            );

            send("\n---\n\n");

            const CHUNK = 220;
            for (let i = 0; i < result.finalOutput.length; i += CHUNK) {
              send(result.finalOutput.slice(i, i + CHUNK));
              await new Promise((r) => setTimeout(r, 12));
            }

            const toolSummary = result.metadata.toolsUsed.length > 0 ? ` · tools: ${result.metadata.toolsUsed.join(", ")}` : "";
            send(`\n\n> Completed in ${(result.totalDuration / 1000).toFixed(1)}s${toolSummary}\n`);

            if (userId !== "anonymous") {
              saveMessage(userId, { role: "assistant", content: result.finalOutput }, projectId, conversationId).catch((error) => {
                console.error("[Chat API] Failed to save orchestrated message:", error);
              });
            }
          } catch (err: any) {
            send(`\n> **Orchestrator error:** ${err.message}\n`);
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    // ── Multimodal Intent Detection ──────────────────────────────────────
    const hasImages = images && images.length > 0;

    const isImageUnderstanding = hasImages && (
      /\b(what|what's|what is|explain|describe|tell|read|analyze|look|see|identify|recognize|detect|find|show|understand)\b/i.test(sanitizedPrompt) ||
      /\b(in this image|in the picture|in this photo|this screenshot|this diagram|this image|this picture)\b/i.test(sanitizedPrompt)
    );

    const isImageEditing = hasImages && (
      /\b(edit|modify|change|transform|convert|turn|make|remove|add|replace|background|anime|realistic|cartoon|sketch|enhance|improve|colorize|restore|upscale|blur|sharpen)\b/i.test(sanitizedPrompt)
    );

    const isImageGenRequest = !hasImages && (
      /\b(generate|create|make|draw|design|paint|render|produce)\s+(an?\s+)?(image|picture|photo|photograph|illustration|artwork|art|portrait|wallpaper|logo|banner|sketch|graphic)\b/i.test(sanitizedPrompt) ||
      /\b(image|picture|photo|portrait|wallpaper)\s+of\b/i.test(sanitizedPrompt) ||
      mode === "Visionary"
    );

    // ── Image Generation Route ───────────────────────────────────────────
    if (isImageGenRequest) {
      const ig = await meter("image_generation");
      if (ig && !ig.allowed) {
        return new Response(JSON.stringify(entitlementDenied(ig)), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }
      try {
        const imageResult = await generateImage(sanitizedPrompt);
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: imageResult + "\n\n💡 *Generated with FLUX.1 Schnell / SDXL via Pollinations*" } }] })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        saveMessage(userId, { role: "assistant", content: imageResult }, projectId, conversationId).catch(() => {});
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      } catch (e) {
        console.warn("[Chat API] Image generation failed, falling through to text:", e);
      }
    }

    // ── Image Editing Route ──────────────────────────────────────────────
    if (isImageEditing) {
      const ie = await meter("image_editing");
      if (ie && !ie.allowed) {
        return new Response(JSON.stringify(entitlementDenied(ie)), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }
      try {
        const imageUrl = images[0].url;
        const editedImage = await editImage(imageUrl, sanitizedPrompt);
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: editedImage } }] })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        saveMessage(userId, { role: "assistant", content: editedImage }, projectId, conversationId).catch(() => {});
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      } catch (e: any) {
        console.warn("[Chat API] Image editing failed:", e);
        const encoder = new TextEncoder();
        const msg =
          `⚠️ **Image editing failed.** ${e?.message || "Please try again."}\n\n` +
          "Image editing requires an image-capable model. Set `IMAGE_EDIT_MODEL` (e.g. `google/gemini-2.5-flash-image`) and a valid `OPENROUTER_KEYS` value.";
        const errStream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: msg } }] })}\n\n`)
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(errStream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      }
    }

    // ── Image Understanding Route (Vision Model) ─────────────────────────
    if (isImageUnderstanding) {
      const visionModel = modelId && MODELS.find(m => m.id === modelId && (m.vision || m.video || m.audio))
        ? modelId
        : "mimo-v2.6-flash:free";

      const visionUrl = "https://openrouter.ai/api/v1/chat/completions";

      const multimodalContent: any[] = [{ type: "text", text: sanitizedPrompt }];
      for (const img of images) {
        multimodalContent.push({
          type: "image_url",
          image_url: { url: img.url, detail: "high" }
        });
      }

      const visionMessages = [
        { role: "system", content: "You are LikeWay Vision, an advanced AI visual analyst. Analyze the provided image(s) thoroughly and respond with clear headings, structured observations, and actionable insights." },
        { role: "user", content: multimodalContent },
      ];

      let response: Response | null = null;
      const visionProvider = getProviderForModel(visionModel);

      const tryTokenHarborVision = async (targetModel: string) => {
        if (!TOKENHARBOR_KEY) throw new Error("TOKENHARBOR_API_KEY not configured");
        return fetch(`${TOKENHARBOR_PROXY}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TOKENHARBOR_KEY}`,
          },
          body: JSON.stringify({
            model: targetModel,
            messages: visionMessages,
            stream: true,
            max_tokens: 4096,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(60000),
        });
      };

      const tryFreeModelsVision = async (targetModel: string) => {
        return fetch(`${FREE_MODELS_PROXY}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": "https://freemodels.pro",
            "Referer": "https://freemodels.pro/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          },
          body: JSON.stringify({
            model: targetModel,
            messages: visionMessages,
            stream: true,
            max_tokens: 4096,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(30000),
        });
      };

      const tryOpenRouterVision = async (targetModel: string) => {
        return fetchAI("openrouter", visionUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: targetModel,
            messages: visionMessages,
            stream: true,
            max_tokens: 4096,
            temperature: 0.3,
          }),
        });
      };

      try {
        if (visionProvider === "tokenharbor") {
          try {
            response = await tryTokenHarborVision(visionModel);
            if (!response || !response.ok) {
              const altModel = visionModel === "mimo-v2.6-flash:free" ? "deepseek-v4.1-flash:free" : "mimo-v2.6-flash:free";
              response = await tryTokenHarborVision(altModel);
            }
          } catch {
            response = null;
          }
        } else if (visionProvider === "freemodels") {
          try {
            response = await tryFreeModelsVision(visionModel);
          } catch {
            response = null;
          }
          if (!response || !response.ok) {
            try {
              response = await tryTokenHarborVision("mimo-v2.6-flash:free");
            } catch {
              response = null;
            }
          }
        } else {
          try {
            response = await tryOpenRouterVision(visionModel);
          } catch {
            response = null;
          }
          if (!response || !response.ok) {
            try {
              response = await tryTokenHarborVision("mimo-v2.6-flash:free");
            } catch {
              response = null;
            }
          }
        }

        if (!response || !response.ok) {
          try {
            response = await tryOpenRouterVision("google/gemini-2.5-flash");
          } catch {
            response = null;
          }
        }
      } catch (err: any) {
        console.warn("[Chat API] Vision attempt exception:", err?.message || err);
      }

      if (response && response.ok && response.body) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let fullContent = "";

        const transformStream = new TransformStream({
          transform(chunk, controller) {
            const text = decoder.decode(chunk, { stream: true });
            const cleanChunks: string[] = [];
            for (const line of text.split("\n")) {
              if (line.startsWith("data: ") && line.slice(6).trim() !== "[DONE]") {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  const delta = parsed.choices?.[0]?.delta?.content || "";
                  if (delta) {
                    fullContent += delta;
                    cleanChunks.push(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`);
                  }
                } catch {
                  cleanChunks.push(line + "\n");
                }
              } else if (line.trim().startsWith("data: [DONE]")) {
                cleanChunks.push("data: [DONE]\n\n");
              }
            }
            if (cleanChunks.length > 0) {
              controller.enqueue(encoder.encode(cleanChunks.join("")));
            }
          },
          flush() {
            if (fullContent.trim()) {
              const cleanedFull = cleanFormatting(fullContent);
              saveMessage(userId, { role: "assistant", content: cleanedFull }, projectId, conversationId).catch(() => {});
            }
          },
        });

        const readableStream = response.body.pipeThrough(transformStream);
        return new Response(readableStream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      }
    }

    // ── Determine if the query needs web search ─────────────────────────
    const isCodingQ = CODING_KEYWORDS_PATTERN.test(sanitizedPrompt) && CODING_ACTION_PATTERN.test(sanitizedPrompt);
    const hasRealTimeTerm = REAL_TIME_TERM_PATTERN.test(sanitizedPrompt);

    const needsSearch =
      webSearch ||
      hasRealTimeTerm ||
      SEARCH_KEYWORDS.some((w) => sanitizedPrompt.toLowerCase().includes(w)) ||
      (TIME_KEYWORDS.some((w) => sanitizedPrompt.toLowerCase().includes(w)) && !isCodingQ);

    let searchContext = "";
    if (needsSearch) {
      try {
        const info = await getVerifiedLatestInfo(sanitizedPrompt);
        if (info.context && info.confidence > 20) {
          searchContext = `\n\n[VERIFIED WEB CONTEXT — Confidence: ${info.confidence}%]\n${info.context}\n[END WEB CONTEXT]\n`;
        }
      } catch (e) {
        console.warn("[Chat API] Web search failed:", e);
      }
    }

    // ── Standard Text Conversation ───────────────────────────────────────
    const selectedModel = MODELS.find((m) => m.id === modelId) || MODELS[0];
    const routedModelId = modelId || selectedModel.id;
    const provider = getProviderForModel(routedModelId);

    const FREE_MODEL_ID_MAP: Record<string, string> = {
      "gpt-6-astra":     "gpt-6-astra",
      "claude-opus-5.5": "claude-opus-5.5",
      "claude-sonnet-5": "claude-sonnet-5",
      "claude-fable-5":  "claude-fable-5",
      "claude-fable-5.1":"claude-fable-5.1",
      "glm-5.2":         "glm-5.2",
      "kimi-k3":         "kimi-k3",
      "sol":             "sol",
      "terra":           "terra",
      "free-llama3-70b": "gpt-6-astra",
      "free-mistral-7b": "sol",
    };
    const resolvedModelId = FREE_MODEL_ID_MAP[routedModelId] ?? routedModelId;

    const url =
      provider === "freemodels"
        ? `${FREE_MODELS_PROXY}/v1/chat/completions`
        : provider === "tokenharbor"
        ? "https://tokenharbor.ai/v1/chat/completions"
        : provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : provider === "mistral"
        ? "https://api.mistral.ai/v1/chat/completions"
        : "https://openrouter.ai/api/v1/chat/completions";

    const agentMode = (mode as AgentMode) in SYSTEM_PROMPTS ? (mode as AgentMode) : "General";
    let systemPrompt = SYSTEM_PROMPTS[agentMode];

    const userPrefs = await getUserPreferences(userId);
    if (userPrefs.tone) {
      systemPrompt += `\n\n## USER PREFERENCE\nRespond in a ${userPrefs.tone} tone.`;
    }
    if (userPrefs.language && userPrefs.language !== "en") {
      systemPrompt += `\nUser prefers responses in ${userPrefs.language}.`;
    }

    if (userId !== "anonymous") {
      const conversationContext = await getConversationContext(userId, projectId);
      if (conversationContext) {
        systemPrompt += conversationContext;
      }
    }

    if (customInstructions) {
      systemPrompt += `\n\n## USER CUSTOM INSTRUCTIONS\n${customInstructions}`;
    }
    if (searchContext) {
      systemPrompt += `\n\n## LIVE WEB DATA\nUse the following verified web data to answer accurately. Cite sources using [source:Name](url) when available:\n${searchContext}`;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    systemPrompt += `\n\nCurrent date: ${dateStr}`;

    let maxTokens = 4096;
    if (extendedThinking) {
      maxTokens = 8192;
      const thinkingInstruction = `\n\n## DEEP THINKING & REASONING MODE ACTIVATED
You MUST conduct a rigorous, step-by-step reasoning breakdown before presenting your final answer.
Start your response with an internal reasoning section enclosed in <thought> ... </thought> tags.
In your <thought> block, detail:
1. Core objectives & problem decomposition
2. Constraints, assumptions & edge cases
3. Step-by-step logical derivation or architecture verification
After the closing </thought> tag, present your structured, user-friendly final answer.`;
      systemPrompt += thinkingInstruction;
    }

    // Append response architecture LAST so it has highest recency priority
    systemPrompt = systemPrompt + "\n\n" + LIKEWAY_RESPONSE_ARCHITECTURE;

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    const maxHistory = provider === "groq" ? 10 : 20;
    const trimmedHistory = history.slice(-maxHistory);
    for (const msg of trimmedHistory) {
      if (msg.role && msg.content) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    let userContent = sanitizedPrompt;
    if (files && files.length > 0) {
      const fileContext = files
        .map((f: string, i: number) => `[Attached File ${i + 1}]: ${f}`)
        .join("\n");
      userContent = `${fileContext}\n\n${sanitizedPrompt}`;
    }
    messages.push({ role: "user", content: userContent });

    if (provider === "groq") maxTokens = Math.min(maxTokens, 4096);

    // ── Provider dispatch & fallback ─────────────────────────────────────────
    let response: Response | null = null;
    if (provider === "freemodels" || provider === "tokenharbor") {
      const meta = LIKEWAY_ENGINE_LABELS[resolvedModelId] || {
        name: selectedModel.name,
        intro: "a Likeway AI engine",
      };

      // CRITICAL FIX: Previously, `if (msg.role === "system") continue;` discarded
      // the entire `systemPrompt` (including live web search data, response architecture,
      // custom instructions, and <suggestions> instructions) for all default models!
      // We now embed the full system instructions + web context into the directive block.
      const freeMessages: { role: string; content: string }[] = [];
      const thinkingDirective = extendedThinking
        ? "\n- Enclose your step-by-step reasoning inside `<thought>...</thought>` tags first, then provide the final answer outside."
        : "";
      const webContextBlock = searchContext
        ? `\n\n[LIVE VERIFIED WEB CONTEXT — PRIORITIZE THIS DATA]:\n${searchContext}\n`
        : "";
      const customBlock = customInstructions
        ? `\n- User Custom Instructions: ${customInstructions}`
        : "";

      const personaPrefix =
        `[SYSTEM DIRECTIVE — FOLLOW STRICTLY:\n` +
        `- Identity: You are ${meta.name} (${meta.intro}), created by Srikanth M, founder of Aixphonic (Tamil Nadu, India). Never claim to be made by OpenAI, Anthropic, Google, or Meta.\n` +
        `- Mode: ${agentMode} (${ dateStr })${customBlock}${thinkingDirective}\n` +
        `- Formatting (ChatGPT/Claude/Gemini-Grade UX): Lead immediately with a clear, direct opening answer (zero throat-clearing like "Certainly!" or "Sure!"). Use \`##\` and \`###\` headings for multi-part answers, **bold** key terms, clean Markdown pipe tables (\`| Col | Col |\`) for comparisons, \`> 💡 **Key Takeaway:**\` callout blockquotes, and fenced \`\`\`language code blocks with exact indentation.\n` +
        `- Follow-Up Chips: End every substantive response with a \`<suggestions>\` block containing 3 specific follow-up prompts:\n` +
        `<suggestions>\n- First specific follow-up\n- Second specific follow-up\n- Third specific follow-up\n</suggestions>\n` +
        `Do not output any text after \`</suggestions>\`.]${webContextBlock}\n\n`;

      for (const msg of messages) {
        if (msg.role === "system") continue;
        freeMessages.push({ ...msg });
      }

      if (freeMessages.length > 0) {
        const lastIdx = freeMessages.length - 1;
        freeMessages[lastIdx] = {
          ...freeMessages[lastIdx],
          content: `${personaPrefix}User Request:\n${freeMessages[lastIdx].content}`,
        };
      } else {
        freeMessages.push({
          role: "user",
          content: `${personaPrefix}User Request:\n${userContent}`,
        });
      }

      const freePayload = {
        model: resolvedModelId,
        messages: freeMessages,
        stream: true,
        max_tokens: maxTokens,
        temperature: agentMode === "Creative" ? 0.9 : agentMode === "Researcher" ? 0.3 : 0.7,
      };

      const makeTokenHarborRequest = async (targetModel: string) => {
        if (!TOKENHARBOR_KEY) throw new Error("TOKENHARBOR_API_KEY not configured");
        return fetch(`${TOKENHARBOR_PROXY}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TOKENHARBOR_KEY}`,
          },
          body: JSON.stringify({ ...freePayload, model: targetModel }),
          signal: AbortSignal.timeout(60000),
        });
      };

      const makeFreeRequest = async (targetModel: string) => {
        return fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": "https://freemodels.pro",
            "Referer": "https://freemodels.pro/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          },
          body: JSON.stringify({ ...freePayload, model: targetModel }),
          signal: AbortSignal.timeout(30000),
        });
      };

      try {
        if (provider === "tokenharbor") {
          try {
            response = await makeTokenHarborRequest(resolvedModelId);
            if (!response || !response.ok) {
              const altModel = resolvedModelId === "mimo-v2.6-flash:free" ? "deepseek-v4.1-flash:free" : "mimo-v2.6-flash:free";
              response = await makeTokenHarborRequest(altModel);
              if (!response || !response.ok) {
                response = await makeFreeRequest("gpt-6-astra");
              }
            }
          } catch {
            response = await makeFreeRequest("gpt-6-astra").catch(() => null);
          }
        } else {
          response = await makeFreeRequest(resolvedModelId);
          if (!response || !response.ok) {
            try {
              const mimoRes = await makeTokenHarborRequest("mimo-v2.6-flash:free");
              if (mimoRes && mimoRes.ok) {
                response = mimoRes;
              } else {
                const retryRes = await makeFreeRequest("gpt-6-astra").catch(() => null);
                if (retryRes?.ok) response = retryRes;
              }
            } catch {
              const retryRes = await makeFreeRequest("gpt-6-astra").catch(() => null);
              if (retryRes?.ok) response = retryRes;
            }
          }
        }
      } catch {
        try {
          const mimoFallback = await makeTokenHarborRequest("mimo-v2.6-flash:free");
          if (mimoFallback && mimoFallback.ok) {
            response = mimoFallback;
          } else {
            response = await makeFreeRequest("gpt-6-astra").catch(() => null);
          }
        } catch {
          response = await makeFreeRequest("gpt-6-astra").catch(() => null);
        }
      }

      if (!response || !response.ok) {
        try {
          response = await fetchAI(
            "openrouter",
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages,
                stream: true,
                max_tokens: maxTokens,
                temperature: agentMode === "Creative" ? 0.9 : agentMode === "Researcher" ? 0.3 : 0.7,
              }),
            }
          );
        } catch (fallbackErr) {
          console.error("[Chat API] Key-pool fallback failed:", fallbackErr);
        }
      }
    } else {
      try {
        response = await fetchAI(
          provider,
          url,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: resolvedModelId,
              messages,
              stream: true,
              max_tokens: maxTokens,
              temperature: agentMode === "Creative" ? 0.9 : agentMode === "Researcher" ? 0.3 : 0.7,
            }),
          }
        );
      } catch (err) {
        console.warn(`[Chat API] Provider ${provider} error:`, err);
      }

      if (!response || !response.ok) {
        try {
          if (!TOKENHARBOR_KEY) throw new Error("TOKENHARBOR_API_KEY not configured");
          response = await fetch(`${TOKENHARBOR_PROXY}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${TOKENHARBOR_KEY}`,
            },
            body: JSON.stringify({
              model: "mimo-v2.6-flash:free",
              messages,
              stream: true,
              max_tokens: maxTokens,
              temperature: 0.7,
            }),
            signal: AbortSignal.timeout(45000),
          });
        } catch {
          try {
            response = await fetch("https://freemodels-chat.freemodels.workers.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Origin": "https://freemodels.pro",
                "Referer": "https://freemodels.pro/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
              },
              body: JSON.stringify({
                model: "gpt-6-astra",
                messages: messages.filter((m) => m.role !== "system"),
                stream: true,
                max_tokens: maxTokens,
                temperature: 0.7,
              }),
              signal: AbortSignal.timeout(30000),
            });
          } catch {}
        }
      }
    }

    if (!response || !response.ok) {
      const errText = response ? await response.text().catch(() => "Unknown error") : "No response from AI providers";
      console.error(`[Chat API] AI request failed:`, errText);
      return new Response(JSON.stringify({ error: "AI request failed: " + errText }), {
        status: response?.status || 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = "";
    let sseLineBuffer = "";
    const sugState: SuggestionStreamState = { inBlock: false, carry: "", raw: "" };

    // CRITICAL FIX:
    // 1. Do NOT run line-stripping cleanFormatting() on individual token deltas (preserves code indentation!).
    // 2. Intercept `<suggestions>` across chunk boundaries via `stripSuggestions()`.
    // 3. Defer `data: [DONE]` until `flush()` AFTER emitting `event: suggestions` so the
    //    client stream reader (`useSSEChatStream.ts`) receives the suggestion chips before closing!
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = sseLineBuffer + decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");
        sseLineBuffer = lines.pop() || "";
        const outChunks: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6).trim();
            if (data === "[DONE]") {
              // Defer [DONE] to flush() so we can emit `event: suggestions` BEFORE `[DONE]`
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const rawDelta = parsed.choices?.[0]?.delta?.content || "";
              if (rawDelta) {
                const visibleDelta = stripSuggestions(rawDelta, sugState);
                if (visibleDelta) {
                  fullContent += visibleDelta;
                  outChunks.push(`data: ${JSON.stringify({ choices: [{ delta: { content: visibleDelta } }] })}\n\n`);
                }
              }
            } catch {
              // Ignore partial or non-JSON comments
            }
          }
        }

        if (outChunks.length > 0) {
          controller.enqueue(encoder.encode(outChunks.join("")));
        }
      },
      flush(controller) {
        // Flush any remaining buffered characters from the tag detector
        const leftover = flushSuggestionsCarry(sugState);
        if (leftover) {
          fullContent += leftover;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: leftover } }] })}\n\n`)
          );
        }

        if (fullContent.trim()) {
          const finalCleaned = cleanFormatting(fullContent);
          saveMessage(userId, { role: "assistant", content: finalCleaned }, projectId, conversationId).catch((error) => {
            console.error("[Chat API] Failed to save assistant message:", error);
          });
        }

        // Emit follow-up suggestion chips BEFORE `data: [DONE]` so `consumeChatStream` reads them!
        const suggestions = parseSuggestionLines(sugState.raw);
        if (suggestions.length > 0) {
          controller.enqueue(
            encoder.encode(`event: suggestions\ndata: ${JSON.stringify({ suggestions })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      },
    });

    const readableStream = response.body!.pipeThrough(transformStream);

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-User-Plan": plan,
        "X-DailyLimit-Limit": dailyLimit.limit.toString(),
        "X-DailyLimit-Remaining": dailyLimit.remaining.toString(),
        "X-DailyLimit-Used": dailyLimit.used.toString(),
      },
    });
  } catch (error: any) {
    console.error("[Chat API] Unhandled error:", error);
    const encoder = new TextEncoder();
    const errorMessage = error.message || "Something went wrong";
    const stream = new ReadableStream({
      start(controller) {
        const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: `⚠️ ${errorMessage}` } }] })}\n\n`;
        controller.enqueue(encoder.encode(chunk));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }
}
