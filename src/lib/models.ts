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
    description: "Autonomous smart router selecting the optimal engine for each query.",
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
    description: "Creative writing, storytelling, and long-form composition.",
    reasoning: true,
  },
  {
    id: "claude-fable-5.1",
    name: "Likeway Fable Pro",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Advanced creative composition with nuanced reasoning.",
    reasoning: true,
  },
  {
    id: "claude-opus-5.5",
    name: "Likeway Opus",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Deep reasoning for complex mathematical and analytical problem solving.",
    reasoning: true,
  },
  {
    id: "claude-sonnet-5",
    name: "Likeway Sonnet",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Balanced, low-latency reasoning and fast general assistance.",
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
    description: "High-accuracy multilingual reasoning and translation.",
    reasoning: true,
  },
  {
    id: "kimi-k3",
    name: "Likeway LongContext",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Deep research across large documents and long-form context.",
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
    description: "Ultra-low-latency assistant for everyday fast execution.",
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
    description: "Grounded, factual analysis with strong factual accuracy.",
    reasoning: true,
  },

  // ══════════════════════════════════════════════════════════════
  //  FAST & MULTIMODAL MODELS
  // ══════════════════════════════════════════════════════════════
  {
    id: "deepseek-v4.1-flash:free",
    name: "Likeway Flash",
    provider: "tokenharbor",
    contextWindow: 200000,
    vision: true,
    plan: "Core",
    description: "Ultra-fast reasoning engine with image understanding.",
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
    description: "Multimodal engine with image understanding and fast reasoning.",
    fast: true,
    reasoning: true,
  },

  // ══════════════════════════════════════════════════════════════
  //  SPECIALIZED CODING & KNOWLEDGE MODELS
  // ══════════════════════════════════════════════════════════════
  {
    id: "mistral-medium-latest",
    name: "Likeway CodeMaster",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Go",
    description: "Full-stack coding, debugging, and code refactoring.",
  },
  {
    id: "codestral-latest",
    name: "Likeway Maverick",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Go",
    description: "Specialized code generation for complex architectures.",
  },
  {
    id: "mistral-small-latest",
    name: "Likeway Micro",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Go",
    description: "Compact and ultra-responsive lightweight engine.",
    fast: true,
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Likeway Scholar",
    provider: "groq",
    contextWindow: 128000,
    vision: false,
    plan: "Go",
    description: "Precise knowledge retrieval and academic research.",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Likeway Fast",
    provider: "groq",
    contextWindow: 128000,
    vision: false,
    plan: "Go",
    description: "Lightning-fast responses for quick questions and editing.",
    fast: true,
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Likeway Insight",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Plus",
    description: "High-speed multimodal engine with 1M token context.",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Likeway Velocity",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Plus",
    description: "Mid-tier intelligence with advanced vision and 1M context.",
  },
  {
    id: "deepseek/deepseek-chat",
    name: "Likeway QuickThought",
    provider: "openrouter",
    contextWindow: 128000,
    vision: false,
    plan: "Plus",
    description: "Fast, secure logical analysis engine.",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "Likeway Codex Elite",
    provider: "openrouter",
    contextWindow: 128000,
    vision: false,
    plan: "Plus",
    description: "Deep coding logic with step-by-step reasoning.",
    reasoning: true,
  },
  {
    id: "openai/gpt-4o",
    name: "Likeway Sovereign",
    provider: "openrouter",
    contextWindow: 128000,
    vision: true,
    plan: "Plus",
    description: "Comprehensive multimodal reasoning with high visual precision.",
  },
  {
    id: "openai/o3",
    name: "Likeway Absolute",
    provider: "openrouter",
    contextWindow: 200000,
    vision: false,
    plan: "Pro",
    description: "Maximum reasoning capacity for scientific breakthroughs.",
    reasoning: true,
  },
  {
    id: "google/gemini-2.5-pro-preview",
    name: "Likeway Pinnacle",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Pro",
    description: "Frontier multimodal creativity with 1M context window.",
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

