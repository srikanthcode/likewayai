import { getMergedApiKeys } from "@/config/keys";
import { AppError } from "../errors/error-types";
import { TelemetryTracer } from "../telemetry/tracer";

export interface ModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelCompletionOptions {
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  traceId?: string;
  isVoice?: boolean;
}

export interface ModelCompletionResult {
  content: string;
  provider: string;
  model: string;
  durationMs: number;
  traceId: string;
}

export class ModelRouter {
  private static instance: ModelRouter;

  public static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  public async complete(
    messages: ModelMessage[],
    options: ModelCompletionOptions = {}
  ): Promise<ModelCompletionResult> {
    const traceId = options.traceId || TelemetryTracer.createTraceId();
    const span = TelemetryTracer.createSpan("model_router_complete", traceId);
    const keys = await getMergedApiKeys();

    // 1. Determine Preferred Provider Order
    // For voice, prioritize sub-second Gemini 2.0 Flash
    const isVoice = Boolean(options.isVoice);
    const providers = isVoice
      ? ["gemini", "groq", "openai", "anthropic"]
      : ["groq", "gemini", "openai", "anthropic"];

    let lastError: any = null;

    for (const provider of providers) {
      const apiKey = this.getApiKeyForProvider(provider, keys);
      if (!apiKey) continue;

      try {
        const result = await this.callProviderWithRetry(provider, apiKey, messages, options);
        TelemetryTracer.endSpan(span, { provider, model: result.model });
        return {
          content: result.content,
          provider,
          model: result.model,
          durationMs: Date.now() - span.startTime,
          traceId,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[ModelRouter] Provider "${provider}" failed (trace: ${traceId}): ${err.message}. Cascading to next provider...`);
      }
    }

    TelemetryTracer.endSpan(span, { status: "failed" });
    throw new AppError({
      category: "MODEL_ERROR",
      message: `All AI providers failed: ${lastError?.message || "No active API keys"}`,
      traceId,
    });
  }

  private getApiKeyForProvider(provider: string, keys: any): string | undefined {
    switch (provider) {
      case "gemini":
        return (typeof keys.gemini === "string" ? keys.gemini : keys.gemini?.[0]) || process.env.GEMINI_API_KEY;
      case "groq":
        return (typeof keys.groq === "string" ? keys.groq : keys.groq?.[0]) || process.env.GROQ_API_KEY;
      case "openai":
        return (typeof keys.openai === "string" ? keys.openai : keys.openai?.[0]) || process.env.OPENAI_API_KEY;
      case "anthropic":
        return (typeof keys.anthropic === "string" ? keys.anthropic : keys.anthropic?.[0]) || process.env.ANTHROPIC_API_KEY;
      default:
        return undefined;
    }
  }

  private async callProviderWithRetry(
    provider: string,
    apiKey: string,
    messages: ModelMessage[],
    options: ModelCompletionOptions
  ): Promise<{ content: string; model: string }> {
    const maxRetries = 2;
    let delay = 300;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (provider === "gemini") {
          return await this.callGemini(apiKey, messages, options);
        } else if (provider === "groq") {
          return await this.callOpenAICompatible("https://api.groq.com/openai/v1/chat/completions", "llama-3.3-70b-versatile", apiKey, messages, options);
        } else if (provider === "openai") {
          return await this.callOpenAICompatible("https://api.openai.com/v1/chat/completions", "gpt-4o-mini", apiKey, messages, options);
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }
      } catch (err: any) {
        // If Rate limited (429), exponential backoff
        const isRateLimit = err?.message?.includes("429") || err?.status === 429;
        if (isRateLimit && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
        throw err;
      }
    }
    throw new Error(`Provider ${provider} exceeded max retries`);
  }

  private async callGemini(
    apiKey: string,
    messages: ModelMessage[],
    options: ModelCompletionOptions
  ): Promise<{ content: string; model: string }> {
    const model = options.modelId || "gemini-3.6-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const systemMsg = messages.find((m) => m.role === "system");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

    const payload: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? (options.isVoice ? 120 : 1000),
      },
    };

    if (systemMsg) {
      payload.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 120)}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { content: text, model };
  }

  private async callOpenAICompatible(
    endpoint: string,
    defaultModel: string,
    apiKey: string,
    messages: ModelMessage[],
    options: ModelCompletionOptions
  ): Promise<{ content: string; model: string }> {
    const model = options.modelId || defaultModel;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? (options.isVoice ? 120 : 1000),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI Compatible error (${res.status}): ${errText.slice(0, 120)}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    return { content: text, model };
  }
}
