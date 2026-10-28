import OpenAI from "openai";

/**
 * LLM7 API Client & Resilience Fallback Service
 * 
 * LLM7 provides a high-availability, OpenAI-compatible AI gateway:
 * Base URL: https://api.llm7.io/v1
 * API Key: "unused" (or process.env.LLM7_API_KEY)
 * Smart selectors:
 *  - "fast"   : ultra-fast low-latency free inference
 *  - "default": balanced free inference
 *  - "pro"    : deep reasoning
 */

export const LLM7_BASE_URL = process.env.LLM7_BASE_URL || "https://api.llm7.io/v1";
export const LLM7_API_KEY = process.env.LLM7_API_KEY || "unused";

/**
 * Official OpenAI SDK client initialized for LLM7 gateway
 */
export const llm7Client = new OpenAI({
  baseURL: LLM7_BASE_URL,
  apiKey: LLM7_API_KEY,
});

export interface LLM7Message {
  role: "system" | "user" | "assistant" | string;
  content: string;
}

export interface LLM7RequestOptions {
  messages: LLM7Message[];
  model?: "fast" | "default" | "pro" | string;
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
}

/**
 * Candidate models to try in sequence if a rate-limit or error occurs on LLM7
 */
const LLM7_FALLBACK_CANDIDATES = ["fast", "default", "GLM-5.3-Flash", "minimax-m2.7"];

/**
 * Execute non-streaming completion with automatic model resilience.
 * Cascades across candidate models ("fast" -> "default" -> "GLM-5.3-Flash" -> "minimax-m2.7").
 */
export async function callLLM7(
  options: LLM7RequestOptions
): Promise<{ content: string; model: string; raw?: any }> {
  const primaryModel = options.model || "fast";
  const sanitizedMessages = options.messages.map((m) => ({
    role: (m.role === "system" || m.role === "assistant" || m.role === "user" ? m.role : "user") as "system" | "assistant" | "user",
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));

  // Build candidate order: requested model first, then remaining candidates without duplicates
  const candidates = [primaryModel, ...LLM7_FALLBACK_CANDIDATES.filter((m) => m !== primaryModel)];

  let lastError: any = null;

  for (const candidateModel of candidates) {
    try {
      const resp = await llm7Client.chat.completions.create(
        {
          model: candidateModel,
          messages: sanitizedMessages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens,
          stream: false,
        },
        {
          signal: options.signal,
        }
      );

      const content = resp.choices?.[0]?.message?.content || "";
      if (content) {
        return {
          content,
          model: resp.model || candidateModel,
          raw: resp,
        };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[LLM7] Candidate "${candidateModel}" failed (${err?.message || err}). Trying next candidate...`);
    }
  }

  throw lastError || new Error("All LLM7 fallback candidates failed to respond.");
}

/**
 * Execute streaming completion using OpenAI client stream.
 */
export async function callLLM7Stream(options: LLM7RequestOptions) {
  const model = options.model || "fast";
  const sanitizedMessages = options.messages.map((m) => ({
    role: (m.role === "system" || m.role === "assistant" || m.role === "user" ? m.role : "user") as "system" | "assistant" | "user",
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));

  return llm7Client.chat.completions.create(
    {
      model,
      messages: sanitizedMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: true,
    },
    {
      signal: options.signal,
    }
  );
}

/**
 * Return standard Web Response object compatible with Next.js route handlers
 * and fetchAI abstraction in src/lib/api-manager.ts.
 */
export async function fetchLLM7Response(options: {
  messages: any[];
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
}): Promise<Response> {
  const model = options.model || "fast";
  const isStream = !!options.stream;

  const sanitizedMessages = options.messages.map((m) => ({
    role: (m.role === "system" || m.role === "assistant" || m.role === "user" ? m.role : "user") as "system" | "assistant" | "user",
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));

  if (!isStream) {
    const res = await callLLM7({
      messages: sanitizedMessages,
      model,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      signal: options.signal,
    });

    const normalized = {
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: res.content,
          },
        },
      ],
      content: res.content,
      model: res.model,
      usage: {
        total_tokens: Math.ceil(res.content.length / 4),
      },
    };

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Upstream SSE stream fetch
  const upstream = await fetch(`${LLM7_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LLM7_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: sanitizedMessages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
    }),
    signal: options.signal || AbortSignal.timeout(60000),
  });

  return upstream;
}
