import { NextRequest } from "next/server";
import { fetchAI } from "@/lib/api-manager";
import { MODELS, getProviderForModel } from "@/lib/models";
import { SYSTEM_PROMPTS, AgentMode } from "@/lib/agents";
import { getVerifiedLatestInfo } from "@/lib/browsing";
import { executeDeepResearch } from "@/lib/deep-research";
import { saveMessage, getHistory } from "@/lib/memory";
import { generateImage, editImage } from "@/lib/tools";
import { PLANS, PlanType } from "@/lib/plans";
import { NextResponse } from "next/server";
import {
  SEARCH_KEYWORDS,
  TIME_KEYWORDS,
  CODING_KEYWORDS_PATTERN,
  CODING_ACTION_PATTERN,
  REAL_TIME_TERM_PATTERN
} from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkDailyLimit } from "@/lib/daily-rate-limit";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";

// Lazy import — browser-engine has heavy deps that crash on Vercel serverless
let runBrowserEngine: any = null;

export const maxDuration = 120;

// ── Formatting Cleanup: Clean up messy output while keeping tables ──────
function cleanFormatting(text: string): string {
  if (!text) return text;

  return text
    // Clean up flowchart arrows
    .replace(/(\n\s*[│┌┐└┘├┤┬┴┼─▼↑↓→←]+\s*\n)/g, "\n")
    // Remove excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    // Clean up broken table formats (extra dashes)
    .replace(/\|[\s]*-{3,}[\s]*\|/g, "|---|")
    // Ensure table header separator is clean
    .replace(/(\|[^\n]+\|)\n[\s]*\|[-| :]+\|/g, "$1\n|---|---|---|")
    // Remove leading/trailing whitespace on lines
    .replace(/\n[ \t]+/g, "\n");
}

// Input validation for chat prompts
function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || typeof prompt !== "string") {
    return { valid: false, error: "Prompt is required" };
  }
  if (prompt.trim().length === 0) {
    return { valid: false, error: "Prompt cannot be empty" };
  }
  if (prompt.length > 10000) {
    return { valid: false, error: "Prompt is too long (max 10,000 characters)" };
  }
  return { valid: true };
}

// Helper: extract userId from session cookie, falling back to "anonymous" for unauthenticated chat
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
      experimental = false,
      extendedThinking = false,
      conversationId,
    } = body;

    // Get userId from server-side session, not from client
    const userId = getUserIdFromSession(req);

    // Get plan from JWT token
    const tokens = getTokenFromCookies(req);
    const tokenPayload = tokens.access ? verifyAccessToken(tokens.access) : null;
    let plan = (tokenPayload?.plan as PlanType) || "Core";

    // Validate prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rate limiting - Per minute
    const rateLimitConfig = { windowMs: 60000, maxRequests: 20 }; // 20 requests per minute
    const rateLimit = checkRateLimit(userId, rateLimitConfig);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": rateLimitConfig.maxRequests.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(rateLimit.resetTime / 1000).toString(),
        },
      });
    }

    // Rate limiting - Daily plan limit
    const planConfig = PLANS[plan] || PLANS.Core;
    const dailyLimit = checkDailyLimit(userId, planConfig.limits.messagesDay);
    if (!dailyLimit.allowed) {
      return new Response(JSON.stringify({
        error: `Daily message limit reached (${dailyLimit.limit} messages/day). Upgrade your plan for unlimited messages.`,
        limit: dailyLimit.limit,
        used: dailyLimit.used,
        resetTime: dailyLimit.resetTime,
        plan: plan,
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
    saveMessage(userId, { role: "user", content: prompt }, projectId, conversationId).catch((error) => {
      console.error("[Chat API] Failed to save user message:", error);
    });

    // Determine if this is a deep research request
    const isDeepResearch = mode === "Researcher" || mode === "deep-research";
    if (isDeepResearch) {
      const deepRes = await executeDeepResearch(
        prompt,
        modelId || "google/gemini-2.5-flash",
        history,
        plan as PlanType,
        extendedThinking
      );
      return deepRes;
    }

    // ── LikeWay Browser Mode (v6 — unified engine) ────────────────────
    const isBrowserAgent = mode === "Browser";
    if (isBrowserAgent) {
      // On actual Vercel deployment: proxy to Render backend (no Chromium on Vercel)
      // VERCEL is set even in local dev by Next.js, so check VERCEL_REGION (only set on real Vercel)
      if (process.env.VERCEL_REGION) {
        const renderUrl = process.env.NEXT_PUBLIC_API_URL || "https://likewayai.onrender.com";
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const send = (text: string) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
            };
            send(`> **LikeWay Browser v6** — Forwarding to Render backend...\n\n`);
            send(`> Task: ${prompt}\n\n`);
            try {
              const res = await fetch(`${renderUrl}/api/browser-agent`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ task: prompt, headless: true }),
                signal: AbortSignal.timeout(180000),
              });
              const data = await res.json();
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
            controller.close();
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
      }

      if (!runBrowserEngine) {
        const mod = await import("@/lib/automation/browser-engine");
        runBrowserEngine = mod.runBrowserEngine;
      }
      const browserModelId = modelId || "llama-3.3-70b-versatile";
      const browserProvider = getProviderForModel(browserModelId);

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (text: string) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
          };

          send(`> **LikeWay Browser v6** — Launching autonomous browser agent...\n\n`);
          send(`> Task: ${prompt}\n\n`);

          try {
            let lastSubGoal = "";
            const result = await runBrowserEngine(prompt, {
              provider: browserProvider,
              modelId: browserModelId,
              fetchAI,
              headless: true,
              maxIterations: 25,
              onStep: (step: any) => {
                // Show sub-goal changes
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
          send(`> Task: ${prompt}\n\n`);

          try {
            let lastSubGoal = "";
            const result = await runBrowserEngine(prompt, {
              provider: automationProvider,
              modelId: automationModelId,
              fetchAI,
              headless: true,
              maxIterations: 25,
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

      saveMessage(userId, { role: "assistant", content: `Automation: ${prompt}` }, projectId, conversationId).catch(() => {});

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    // ── Multimodal Intent Detection ──────────────────────────────────────
    // Routes: Text → LLM | Image Understanding → Vision Model | Image Editing → editImage | Image Gen → generateImage

    const hasImages = images && images.length > 0;

    // Intent: Image Understanding (user uploaded image(s) and asks about them)
    const isImageUnderstanding = hasImages && (
      /\b(what|what's|what is|explain|describe|tell|read|analyze|look|see|identify|recognize|detect|find|show|understand)\b/i.test(prompt) ||
      /\b(in this image|in the picture|in this photo|this screenshot|this diagram|this image|this picture)\b/i.test(prompt)
    );

    // Intent: Image Editing (user wants to modify uploaded image)
    const isImageEditing = hasImages && (
      /\b(edit|modify|change|transform|convert|turn|make|remove|add|replace|background|anime|realistic|cartoon|sketch|enhance|improve|colorize|restore|upscale|blur|sharpen)\b/i.test(prompt)
    );

    // Intent: Image Generation (text-to-image, no images attached)
    const isImageGenRequest = !hasImages && (
      /\b(generate|create|make|draw|design|paint|render)\s+(an?\s+)?(image|picture|photo|illustration|artwork|art|poster|wallpaper|logo|banner)\b/i.test(prompt) ||
      mode === "Visionary"
    );

    // ── Image Generation Route ───────────────────────────────────────────
    if (isImageGenRequest) {
      try {
        const imageResult = await generateImage(prompt);
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
      try {
        const imageUrl = images[0].url;
        const editedImage = await editImage(imageUrl, prompt);
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
      } catch (e) {
        console.warn("[Chat API] Image editing failed, falling through to text:", e);
      }
    }

    // ── Image Understanding Route (Vision Model) ─────────────────────────
    if (isImageUnderstanding) {
      // Force vision-capable model for image understanding
      const visionModel = modelId && MODELS.find(m => m.id === modelId && m.vision)
        ? modelId
        : "google/gemini-2.5-flash";

      const visionProvider = getProviderForModel(visionModel);
      const visionUrl = "https://openrouter.ai/api/v1/chat/completions";

      // Build multimodal content array
      const multimodalContent: any[] = [{ type: "text", text: prompt }];
      for (const img of images) {
        multimodalContent.push({
          type: "image_url",
          image_url: { url: img.url, detail: "high" }
        });
      }

      const visionMessages = [
        { role: "system", content: "You are an AI vision assistant. Analyze the provided image(s) and respond to the user's query. Be detailed and precise." },
        { role: "user", content: multimodalContent },
      ];

      const response = await fetchAI("openrouter", visionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: visionModel,
          messages: visionMessages,
          stream: true,
          max_tokens: 4096,
          temperature: 0.3,
        }),
      });

      if (response.ok && response.body) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let fullContent = "";

        const transformStream = new TransformStream({
          transform(chunk, controller) {
            controller.enqueue(chunk);
            const text = decoder.decode(chunk, { stream: true });
            for (const line of text.split("\n")) {
              if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  fullContent += parsed.choices?.[0]?.delta?.content || "";
                } catch {}
              }
            }
          },
          flush() {
            if (fullContent.trim()) {
              saveMessage(userId, { role: "assistant", content: fullContent }, projectId, conversationId).catch(() => {});
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
    const isCodingQ = CODING_KEYWORDS_PATTERN.test(prompt) && CODING_ACTION_PATTERN.test(prompt);

    const hasRealTimeTerm = REAL_TIME_TERM_PATTERN.test(prompt);

    const needsSearch =
      hasRealTimeTerm ||
      SEARCH_KEYWORDS.some((w) => prompt.toLowerCase().includes(w)) ||
      (TIME_KEYWORDS.some((w) => prompt.toLowerCase().includes(w)) && !isCodingQ);

    // Build search context if needed
    let searchContext = "";
    if (needsSearch) {
      try {
        const info = await getVerifiedLatestInfo(prompt);
        if (info.context && info.confidence > 20) {
          searchContext = `\n\n[VERIFIED WEB CONTEXT — Confidence: ${info.confidence}%]\n${info.context}\n[END WEB CONTEXT]\n`;
        }
      } catch (e) {
        console.warn("[Chat API] Web search failed:", e);
      }
    }

    // ── Standard Text Conversation ───────────────────────────────────────
    const selectedModel = MODELS.find((m) => m.id === modelId) || MODELS[0];
    let routedModelId = modelId || selectedModel.id;

    const provider = getProviderForModel(routedModelId);
    const url =
      provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : provider === "mistral"
        ? "https://api.mistral.ai/v1/chat/completions"
        : "https://openrouter.ai/api/v1/chat/completions";

    const agentMode = (mode as AgentMode) in SYSTEM_PROMPTS ? (mode as AgentMode) : "General";
    let systemPrompt = SYSTEM_PROMPTS[agentMode];

    if (customInstructions) {
      systemPrompt += `\n\n## USER CUSTOM INSTRUCTIONS\n${customInstructions}`;
    }
    if (searchContext) {
      systemPrompt += `\n\n## LIVE WEB DATA\nUse the following verified web data to answer. PRIORITIZE this data over your training knowledge:\n${searchContext}`;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    systemPrompt += `\n\nCurrent date: ${dateStr}`;

    // CRITICAL: Force clean formatting — prepend formatting override
    const FORMATTING_OVERRIDE = `
## 📝 FORMATTING RULES — GPT-STYLE, CLEAN, SCANNABLE

### CRITICAL:
1. Start with a 1-sentence summary
2. Use ## for sections
3. Keep responses SHORT — 300-500 words max
4. Use **bold** for key terms
5. Tables for rankings (clean pipes only)
6. Bullet points for lists (max 5-7 items)
7. Numbered steps for roadmaps (max 4 phases)
8. End with **Key Takeaways** (2-3 bullets max)

### TABLE FORMAT (use exactly this):
| Rank | Company | Focus |
|------|---------|-------|
| 1 | TCS | IT Services |
| 2 | Infosys | Consulting |

### ROADMAP FORMAT:
**Phase 1: Title** (3-6 months)
- Learn X
- Practice Y

**Phase 2: Title** (6-12 months)
- Master Z

### RESPONSE STRUCTURE:
1. Opening sentence
2. Main content (table/steps/explanation)
3. Key Takeaways (2-3 bullets)

### EXAMPLE:
**Top 5 IT Companies in India**

| Rank | Company | Focus |
|------|---------|-------|
| 1 | TCS | IT Services |
| 2 | Infosys | Consulting |
| 3 | Wipro | Cloud |

**How to get in:**
1. **Learn DSA** — Solve 200+ problems
2. **Build projects** — 2-3 portfolio apps

**Key Takeaways:**
- Focus on fundamentals
- Build real projects
- Practice daily
`;
    systemPrompt = FORMATTING_OVERRIDE + "\n\n" + systemPrompt;

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

    // Add user content (with file context if files provided)
    let userContent = prompt;
    if (files && files.length > 0) {
      const fileContext = files
        .map((f: string, i: number) => `[Attached File ${i + 1}]: ${f}`)
        .join("\n");
      userContent = `${fileContext}\n\n${prompt}`;
    }
    messages.push({ role: "user", content: userContent });

    let maxTokens = 4096;
    if (extendedThinking) maxTokens = 8192;
    if (provider === "groq") maxTokens = Math.min(maxTokens, 4096);

    const response = await fetchAI(provider, url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: routedModelId,
        messages,
        stream: true,
        max_tokens: maxTokens,
        temperature: agentMode === "Creative" ? 0.9 : agentMode === "Researcher" ? 0.3 : 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.error(`[Chat API] AI request failed (${response.status}):`, errText);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = "";

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");
        const cleanChunks: string[] = [];

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              cleanChunks.push(`data: [DONE]\n`);
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullContent += delta;
                // Clean the delta before sending
                const cleanDelta = cleanFormatting(delta);
                cleanChunks.push(`data: ${JSON.stringify({ choices: [{ delta: { content: cleanDelta } }] })}\n`);
              }
            } catch {
              cleanChunks.push(line + "\n");
            }
          }
        }

        if (cleanChunks.length > 0) {
          controller.enqueue(encoder.encode(cleanChunks.join("")));
        }
      },
      flush() {
        if (fullContent.trim()) {
          saveMessage(userId, { role: "assistant", content: fullContent }, projectId, conversationId).catch((error) => {
            console.error("[Chat API] Failed to save assistant message:", error);
          });
        }
      },
    });

    const readableStream = response.body!.pipeThrough(transformStream);

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
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
