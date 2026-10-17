export type ModelProvider = "openrouter" | "groq" | "mistral" | "freemodels" | "tokenharbor";

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: number;
  vision: boolean;
  /** Supports video understanding */
  video?: boolean;
  /** Supports audio understanding */
  audio?: boolean;
  plan: "Core" | "Go" | "Plus" | "Pro";
  description: string;
  fast?: boolean;
  reasoning?: boolean;
  /** Highlighted as the featured/promoted model */
  featured?: boolean;
  /** Promo badge shown in the UI e.g. "FREE · 1 Month" */
  promoLabel?: string;
}

export type ModelConfig = Model;

// ── NOTE: The free proxy base URL is intentionally server-side only.
// It lives in /src/app/api/chat/route.ts and is never exported here
// so it does NOT appear in the client JavaScript bundle.

export const MODELS: Model[] = [
  // ══════════════════════════════════════════════════════════════
  //  FREE PROXY MODELS — No API key required, available to all plans
  // ══════════════════════════════════════════════════════════════

  // ★ FEATURED — gpt-6-astra is free unlimited for 1 month
  {
    id: "gpt-6-astra",
    name: "Likeway Omni",
    provider: "freemodels",
    contextWindow: 1000000,
    vision: true,
    plan: "Core",
    description: "Likeway Omni — the smart router that automatically picks the fastest, strongest available engine for each prompt.",
    featured: true,
    promoLabel: "Free for 1 month",
    reasoning: true,
  },
  {
    id: "claude-fable-5",
    name: "Likeway Fable",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Likeway Fable — creative writing and long-form composition engine.",
    reasoning: true,
  },
  {
    id: "claude-fable-5.1",
    name: "Likeway Fable Pro",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Likeway Fable Pro — creative and visual reasoning engine with higher precision.",
    reasoning: true,
  },
  {
    id: "claude-opus-5.5",
    name: "Likeway Opus",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Likeway Opus — deep-reasoning engine for complex analysis and problem solving.",
    reasoning: true,
  },
  {
    id: "claude-sonnet-5",
    name: "Likeway Sonnet",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Likeway Sonnet — balanced, low-latency reasoning engine with vision support.",
    fast: true,
    reasoning: true,
  },
  {
    id: "glm-5.2",
    name: "Likeway Bilingual",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Likeway Bilingual — multilingual reasoning engine with vision support.",
    reasoning: true,
  },
  {
    id: "kimi-k3",
    name: "Likeway LongContext",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Likeway LongContext — long-context research and document understanding engine.",
    fast: true,
    reasoning: true,
  },
  {
    id: "sol",
    name: "Likeway Sol",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Likeway Sol — ultra-low-latency engine for fast everyday and analytical tasks.",
    fast: true,
    reasoning: true,
  },
  {
    id: "terra",
    name: "Likeway Terra",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Likeway Terra — factual, grounded reasoning engine with image understanding.",
    reasoning: true,
  },

  // ══════════════════════════════════════════════════════════════
  //  TOKENHARBOR MODELS — High quality, vision + video + audio
  // ══════════════════════════════════════════════════════════════
  {
    id: "deepseek-v4.1-flash:free",
    name: "Likeway Flash",
    provider: "tokenharbor",
    contextWindow: 200000,
    vision: true,
    plan: "Core",
    description: "Likeway Flash — ultra-fast reasoning engine with image understanding. Requires TOKENHARBOR_API_KEY.",
    fast: true,
    reasoning: true,
  },
  {
    id: "mimo-v2.6-flash:free",
    name: "Likeway Mimo",
    provider: "tokenharbor",
    contextWindow: 200000,
    vision: true,
    plan: "Core",
    description: "Likeway Mimo — multimodal engine with image understanding and fast reasoning. Requires TOKENHARBOR_API_KEY.",
    fast: true,
    reasoning: true,
  },

  // ══════════════════════════════════════════════════════════════
  //  PAID / API-KEY MODELS
  // ══════════════════════════════════════════════════════════════
  {
    id: "mistral-medium-latest",
    name: "Likeway CodeMaster",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Go",
    description: "Main chat model – excellent for chat, reasoning, and coding.",
  },
  {
    id: "codestral-latest",
    name: "Likeway Maverick",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Go",
    description: "World-class coding model for complex software engineering tasks.",
  },
  {
    id: "mistral-small-latest",
    name: "Likeway Micro",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Go",
    description: "Lightweight model for fast responses.",
    fast: true,
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Likeway Scholar",
    provider: "groq",
    contextWindow: 128000,
    vision: false,
    plan: "Go",
    description: "Focused and precise knowledge retrieval for basic research",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Likeway Fast",
    provider: "groq",
    contextWindow: 128000,
    vision: false,
    plan: "Go",
    description: "Ultra-responsive and efficient for everyday tasks",
    fast: true,
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Likeway Insight",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Plus",
    description: "High-speed multimodal engine with basic image understanding",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Likeway Velocity",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Plus",
    description: "Incredibly fast mid-tier intelligence with advanced vision",
  },
  {
    id: "deepseek/deepseek-chat",
    name: "Likeway QuickThought",
    provider: "openrouter",
    contextWindow: 128000,
    vision: false,
    plan: "Plus",
    description: "Lightning-fast and highly secure analysis engine",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "Likeway Codex Elite",
    provider: "openrouter",
    contextWindow: 128000,
    vision: false,
    plan: "Plus",
    description: "World-class coding capabilities and logical flow",
    reasoning: true,
  },
  {
    id: "openai/gpt-4o",
    name: "Likeway Sovereign",
    provider: "openrouter",
    contextWindow: 128000,
    vision: true,
    plan: "Plus",
    description: "Comprehensive multimodal powerhouse with elite visual precision",
  },
  {
    id: "openai/o3",
    name: "Likeway Absolute",
    provider: "openrouter",
    contextWindow: 200000,
    vision: false,
    plan: "Pro",
    description: "Ultra-high reasoning capacity for mathematical and scientific breakthroughs",
    reasoning: true,
  },
  {
    id: "google/gemini-2.5-pro-preview",
    name: "Likeway Pinnacle",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Pro",
    description: "The absolute pinnacle of creative generation and structural mastery",
  },
];

export function getModelById(id: string): Model | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getProviderForModel(modelId: string): ModelProvider {
  const model = getModelById(modelId);
  return model?.provider ?? "openrouter";
}

/** Returns only models available on the free proxy (no API key needed) */
export function getFreeModels(): Model[] {
  return MODELS.filter((m) => m.provider === "freemodels");
}

