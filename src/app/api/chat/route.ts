import { NextRequest } from "next/server";
import { fetchAI } from "@/lib/api-manager";
import { MODELS, getProviderForModel } from "@/lib/models";
import { SYSTEM_PROMPTS, AgentMode } from "@/lib/agents";
import { getVerifiedLatestInfo } from "@/lib/browsing";
import { executeDeepResearch } from "@/lib/deep-research";
import { saveMessage } from "@/lib/memory";
import { generateImage } from "@/lib/tools";
import { PlanType } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 60;

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
      mode = "General",
      plan = "Pro",
      projectId = "default",
      customInstructions = "",
      experimental = false,
      extendedThinking = false,
      userId = "anonymous",
      conversationId,
    } = body;

    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    // Save user message to memory
    saveMessage(userId, { role: "user", content: prompt }, projectId, conversationId).catch(() => {});

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

    // Determine if the query needs web search
    const searchKeywords = [
      "latest news", "flash news", "today's news", "current news", "headlines",
      "box office", "stock price", "share price", "weather", "score", "live score",
      "match result", "election result", "breaking news"
    ];
    const timeKeywords = [
      "latest", "2026", "today", "current", "recent", "release date", "released",
      "new movie", "new film", "upcoming", "just announced", "this week", "this month"
    ];
    const isCodingQ = /\b(code|coding|program|function|class|method|variable|syntax|debug|error|fix|how to|explain|what is|what are|define|difference between|compare|tutorial|example|implement|build|create|make a|write a)\b/i.test(prompt);
    const needsSearch =
      searchKeywords.some((w) => prompt.toLowerCase().includes(w)) ||
      (timeKeywords.some((w) => prompt.toLowerCase().includes(w)) && !isCodingQ);

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

    // Detect image generation intent
    const isImageRequest = /\b(generate|create|make|draw|design|paint|render)\s+(an?\s+)?(image|picture|photo|illustration|artwork|art|poster|wallpaper|logo|banner)\b/i.test(prompt);
    if (isImageRequest && mode === "Visionary") {
      try {
        const imageResult = await generateImage(prompt);
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: imageResult } }] })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        // Save assistant response
        saveMessage(userId, { role: "assistant", content: imageResult }, projectId, conversationId).catch(() => {});
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      } catch (e) {
        console.warn("[Chat API] Image generation failed, falling through to text:", e);
      }
    }

    // Build messages
    const selectedModel = MODELS.find((m) => m.id === modelId) || MODELS[0];
    const provider = getProviderForModel(modelId || selectedModel.id);
    const url =
      provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://openrouter.ai/api/v1/chat/completions";

    // Get system prompt
    const agentMode = (mode as AgentMode) in SYSTEM_PROMPTS ? (mode as AgentMode) : "General";
    let systemPrompt = SYSTEM_PROMPTS[agentMode];

    // Append custom instructions if provided
    if (customInstructions) {
      systemPrompt += `\n\n## USER CUSTOM INSTRUCTIONS\n${customInstructions}`;
    }

    // Append search context
    if (searchContext) {
      systemPrompt += `\n\n## LIVE WEB DATA\nUse the following verified web data to answer. PRIORITIZE this data over your training knowledge:\n${searchContext}`;
    }

    // Add current date/time context
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    systemPrompt += `\n\nCurrent date: ${dateStr}`;

    // Build message history
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (limit to prevent context overflow)
    const maxHistory = provider === "groq" ? 10 : 20;
    const trimmedHistory = history.slice(-maxHistory);
    for (const msg of trimmedHistory) {
      if (msg.role && msg.content) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add file context if provided
    let userContent = prompt;
    if (files && files.length > 0) {
      const fileContext = files
        .map((f: string, i: number) => `[Attached File ${i + 1}]: ${f}`)
        .join("\n");
      userContent = `${fileContext}\n\n${prompt}`;
    }
    messages.push({ role: "user", content: userContent });

    // Determine max tokens
    let maxTokens = 4096;
    if (extendedThinking) maxTokens = 8192;
    if (provider === "groq") maxTokens = Math.min(maxTokens, 4096);

    // Make the AI request with streaming
    const response = await fetchAI(provider, url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel.id,
        messages,
        stream: true,
        max_tokens: maxTokens,
        temperature: agentMode === "Creative" ? 0.9 : agentMode === "Researcher" ? 0.3 : 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.error(`[Chat API] AI request failed (${response.status}):`, errText);
      return new Response(JSON.stringify({ error: "AI request failed" }), { status: response.status });
    }

    // Stream the response through, collecting content for memory save
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = "";

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        // Also collect content for memory
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
            try {
              const parsed = JSON.parse(line.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content || "";
              fullContent += delta;
            } catch {}
          }
        }
      },
      flush() {
        // Save assistant message to memory after stream completes
        if (fullContent.trim()) {
          saveMessage(userId, { role: "assistant", content: fullContent }, projectId, conversationId).catch(() => {});
        }
      },
    });

    const readableStream = response.body!.pipeThrough(transformStream);

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[Chat API] Unhandled error:", error);
    // Return a streaming error response so the client can still parse it
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
