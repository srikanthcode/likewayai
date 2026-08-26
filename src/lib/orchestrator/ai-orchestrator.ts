import { ToolRegistry } from "../tools/tool-registry";
import { ModelRouter, ModelMessage } from "./model-router";
import { TelemetryTracer } from "../telemetry/tracer";
import { AppError } from "../errors/error-types";

export type IntentType = "app_launch" | "web_search" | "browser_action" | "general_qa" | "payment";

export interface OrchestratorRequest {
  prompt: string;
  history?: Array<{ role: string; content: string }>;
  isVoice?: boolean;
  userId?: string;
  traceId?: string;
}

export interface TaskTimelineStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  timestamp: number;
}

export interface OrchestratorResponse {
  traceId: string;
  intent: IntentType;
  answer: string;
  spokenAnswer?: string;
  timeline: TaskTimelineStep[];
  clientAction?: {
    type: string;
    payload: any;
  };
  toolResults?: any[];
  requiresConfirmation?: boolean;
  confirmationDetails?: {
    action: string;
    message: string;
  };
}

export class AIOrchestrator {
  private static instance: AIOrchestrator;
  private toolRegistry = ToolRegistry.getInstance();
  private modelRouter = ModelRouter.getInstance();

  public static getInstance(): AIOrchestrator {
    if (!AIOrchestrator.instance) {
      AIOrchestrator.instance = new AIOrchestrator();
    }
    return AIOrchestrator.instance;
  }

  public async process(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    const traceId = request.traceId || TelemetryTracer.createTraceId();
    const span = TelemetryTracer.createSpan("orchestrator_process", traceId);
    const timeline: TaskTimelineStep[] = [];

    const addStep = (id: string, label: string, status: "pending" | "running" | "completed" | "failed") => {
      timeline.push({ id, label, status, timestamp: Date.now() });
    };

    try {
      addStep("intent", "Understanding request intent", "running");
      const prompt = request.prompt.trim();

      // 1. Classify Intent
      const intent = this.classifyIntent(prompt);
      timeline[0].status = "completed";

      // 2. Route by Intent
      if (intent === "app_launch") {
        addStep("app_open", "Resolving target application", "running");
        const appMatch = prompt.match(/\b(?:open|launch|go to|navigate to)\s+([a-z0-9\- \.]+)\b/i);
        const appName = appMatch ? appMatch[1].trim() : prompt;

        const toolRes = await this.toolRegistry.executeTool("apps.open", { appName }, { traceId });
        timeline[1].status = "completed";

        TelemetryTracer.endSpan(span, { intent, appName });
        return {
          traceId,
          intent: "app_launch",
          answer: toolRes.result?.message || `Opening ${appName} for you now.`,
          spokenAnswer: toolRes.result?.message || `Opening ${appName} for you now.`,
          timeline,
          clientAction: {
            type: "open_url",
            payload: { url: toolRes.result?.targetUrl, appName },
          },
          toolResults: [toolRes.result],
        };
      }

      if (intent === "web_search") {
        addStep("web_search", "Searching live web & verifying facts", "running");
        const toolRes = await this.toolRegistry.executeTool("web.search", { query: prompt }, { traceId });
        timeline[1].status = "completed";

        addStep("synthesize", "Synthesizing verified response", "running");
        const context = toolRes.result?.context || "";

        const systemPrompt = request.isVoice
          ? "You are LikeWay AI, an intelligent voice assistant. Give a warm, concise (1-3 sentences) spoken voice answer using the provided verified context. NEVER use markdown symbols like * or #."
          : "You are LikeWay AI. Answer the user comprehensively using the verified web search context.";

        const messages: ModelMessage[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `[Verified Context: ${context}]\n\nUser Question: ${prompt}` },
        ];

        const completion = await this.modelRouter.complete(messages, {
          traceId,
          isVoice: request.isVoice,
          maxTokens: request.isVoice ? 120 : 600,
        });
        timeline[2].status = "completed";

        TelemetryTracer.endSpan(span, { intent, provider: completion.provider });
        return {
          traceId,
          intent: "web_search",
          answer: completion.content,
          spokenAnswer: this.sanitizeForSpeech(completion.content),
          timeline,
          toolResults: [toolRes.result],
        };
      }

      if (intent === "browser_action") {
        addStep("browser_plan", "Planning autonomous browser task", "running");
        const targetUrlMatch = prompt.match(/https?:\/\/[^\s]+/i);
        const targetUrl = targetUrlMatch ? targetUrlMatch[0] : undefined;

        addStep("browser_exec", "Dispatching task to Playwright engine", "running");
        const toolRes = await this.toolRegistry.executeTool("browser.navigate", { url: targetUrl || "https://www.google.com", goal: prompt }, { traceId });
        timeline[1].status = "completed";
        timeline[2].status = "completed";

        TelemetryTracer.endSpan(span, { intent });
        return {
          traceId,
          intent: "browser_action",
          answer: toolRes.result?.answer || "Browser task executed successfully.",
          spokenAnswer: toolRes.result?.answer ? this.sanitizeForSpeech(toolRes.result.answer) : "Browser task executed successfully.",
          timeline,
          clientAction: targetUrl ? { type: "open_url", payload: { url: targetUrl } } : undefined,
          toolResults: [toolRes.result],
        };
      }

      // Default: General Q&A / Reasoning
      addStep("reasoning", "Formulating intelligent response", "running");
      const systemPrompt = request.isVoice
        ? "You are LikeWay AI, an intelligent real-time conversational voice assistant. Speak naturally, warmly, and concisely in 1 to 3 sentences. NEVER use markdown symbols like * or #."
        : "You are LikeWay AI, a next-generation AI assistant capable of reasoning, coding, web search, and browser automation.";

      const historyMsgs: ModelMessage[] = (request.history || []).slice(-6).map((h) => ({
        role: h.role === "user" ? "user" : "assistant",
        content: h.content,
      }));

      const messages: ModelMessage[] = [
        { role: "system", content: systemPrompt },
        ...historyMsgs,
        { role: "user", content: prompt },
      ];

      const completion = await this.modelRouter.complete(messages, {
        traceId,
        isVoice: request.isVoice,
        maxTokens: request.isVoice ? 120 : 1000,
      });
      timeline[1].status = "completed";

      TelemetryTracer.endSpan(span, { intent: "general_qa", provider: completion.provider });
      return {
        traceId,
        intent: "general_qa",
        answer: completion.content,
        spokenAnswer: this.sanitizeForSpeech(completion.content),
        timeline,
      };
    } catch (err: any) {
      TelemetryTracer.endSpan(span, { error: err.message });
      throw new AppError({
        category: "UNKNOWN_ERROR",
        message: err?.message || "Failed to process request through AI Orchestrator",
        traceId,
      });
    }
  }

  private classifyIntent(prompt: string): IntentType {
    const p = prompt.toLowerCase().trim();

    // 1. App Launch Intent
    const isAppLaunch = /\b(?:open|launch|go to|navigate to)\s+(whatsapp|youtube|google|amazon|flipkart|instagram|facebook|twitter|spotify|netflix|github|reddit|linkedin|gmail|chatgpt|maps|[a-z0-9\-]+\.(?:com|org|in|net|io|ai))\b/i.test(p);
    if (isAppLaunch) return "app_launch";

    // 2. Browser Action Intent (Deep automation tasks)
    if (/\b(?:scrape|fill form|order on|checkout on|book|click on|login to|automate browser|browse)\b/i.test(p)) {
      return "browser_action";
    }

    // 3. Web Search Intent
    if (/\b(?:weather|temperature|score|who won|latest news|current price|stock price|today's date|search for|who is|what is the price)\b/i.test(p)) {
      return "web_search";
    }

    return "general_qa";
  }

  private sanitizeForSpeech(text: string): string {
    if (!text) return "";
    return text
      .replace(/<artifact[\s\S]*?<\/artifact>/gi, "")
      .replace(/```[\s\S]*?```/gi, "")
      .replace(/[#*`_~>\[\]()!]/g, "")
      .replace(/https?:\/\/\S+/g, "link")
      .replace(/\s+/g, " ")
      .trim();
  }
}
