export type ModelProvider =
  | "openrouter"
  | "groq"
  | "mistral"
  | "freemodels"
  | "tokenharbor"
  | "llm7"
  | "qwen";

/**
 * Catalog labels are display names, not vendor attribution.
 *
 * Several ids here (`claude-*`, `gpt-6-astra`, `sol`, `terra`) are routed to the
 * free proxy, which serves them under those names but is not OpenAI or
 * Anthropic. `company` is therefore "Likeway AI" for every alias; only models
 * requested from a real vendor endpoint (OpenRouter/Mistral/Groq) may name that
 * vendor. Never render a vendor name for an id we do not actually call there.
 */
export interface Model {
  id: string;
  name: string;
  company: string;
  avatarLetter: string;
  category: "Claude" | "GPT" | "Other";
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
  //  "Claude" aliases served by the free proxy — NOT Anthropic models.
  //  The ids are proxy selectors; there is no Anthropic credential here.
  // ══════════════════════════════════════════════════════════════
  {
    id: "claude-opus-5.5",
    name: "Claude Opus 5.5",
    company: "Likeway AI",
    avatarLetter: "C",
    category: "Claude",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Core",
    description: "Deep reasoning for complex mathematical and analytical problem solving.",
    reasoning: true,
    promoLabel: "Free Unlimited",
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5.5",
    company: "Likeway AI",
    avatarLetter: "C",
    category: "Claude",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Core",
    description: "Balanced, low-latency reasoning and fast general assistance.",
    fast: true,
    reasoning: true,
    promoLabel: "Free Unlimited",
  },
  {
    id: "claude-fable-5",
    name: "Claude Fable 5",
    company: "Likeway AI",
    avatarLetter: "C",
    category: "Claude",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Creative writing, storytelling, and long-form composition.",
    reasoning: true,
  },
  {
    id: "claude-fable-5.1",
    name: "Claude Fable 5.1",
    company: "Likeway AI",
    avatarLetter: "C",
    category: "Claude",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Advanced creative composition with nuanced reasoning.",
    reasoning: true,
  },

  // ══════════════════════════════════════════════════════════════
  //  "GPT" aliases: sol/terra/gpt-6-astra are proxy selectors served by the
  //  free proxy. openai/gpt-4o and openai/o3 below are real OpenRouter ids.
  // ══════════════════════════════════════════════════════════════
  {
    id: "sol",
    name: "GPT 5.6 Sol",
    company: "Likeway AI",
    avatarLetter: "O",
    category: "GPT",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Core",
    description: "Ultra-low-latency assistant for everyday fast execution.",
    fast: true,
    reasoning: true,
    promoLabel: "Free Unlimited",
  },
  {
    id: "terra",
    name: "GPT 5.6 Terra",
    company: "Likeway AI",
    avatarLetter: "O",
    category: "GPT",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Grounded, factual analysis with strong factual accuracy.",
    reasoning: true,
  },
  {
    id: "gpt-6-astra",
    name: "GPT 6 Astra",
    company: "Likeway AI",
    avatarLetter: "O",
    category: "GPT",
    provider: "freemodels",
    contextWindow: 1000000,
    vision: true,
    plan: "Core",
    description: "Next-generation reasoning engine with image understanding.",
    featured: true,
    promoLabel: "Free Unlimited",
    reasoning: true,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    company: "OpenAI",
    avatarLetter: "O",
    category: "GPT",
    provider: "openrouter",
    contextWindow: 128000,
    vision: true,
    plan: "Plus",
    description: "Comprehensive multimodal reasoning with high visual precision.",
  },
  {
    id: "openai/o3",
    name: "o3",
    company: "OpenAI",
    avatarLetter: "O",
    category: "GPT",
    provider: "openrouter",
    contextWindow: 200000,
    vision: false,
    plan: "Pro",
    description: "Maximum reasoning capacity for scientific breakthroughs.",
    reasoning: true,
  },

  // ══════════════════════════════════════════════════════════════
  //  OTHER MODELS (Likeway)
  // ══════════════════════════════════════════════════════════════
  {
    id: "glm-5.2",
    name: "Likeway Bilingual",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "High-accuracy multilingual reasoning and global translation.",
    reasoning: true,
  },
  {
    id: "kimi-k3",
    name: "Likeway LongContext",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Deep research across large documents and long-form context.",
    fast: true,
    reasoning: true,
  },
  {
    id: "deepseek-v4.1-flash:free",
    name: "Likeway Flash",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "tokenharbor",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Ultra-fast reasoning engine with image understanding.",
    fast: true,
    reasoning: true,
  },
  {
    id: "mimo-v2.6-flash:free",
    name: "Likeway Mimo",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "tokenharbor",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Multimodal engine with image understanding and fast reasoning.",
    fast: true,
    reasoning: true,
  },
  {
    id: "deepseek/deepseek-r1",
    name: "Likeway Codex Elite",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "openrouter",
    contextWindow: 128000,
    vision: false,
    plan: "Plus",
    description: "Deep coding logic and step-by-step mathematical reasoning.",
    reasoning: true,
  },
  {
    id: "deepseek/deepseek-chat",
    name: "Likeway QuickThought",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "openrouter",
    contextWindow: 128000,
    vision: false,
    plan: "Plus",
    description: "Fast, secure logical analysis and coding engine.",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Likeway Insight",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Plus",
    description: "High-speed multimodal engine with 1M token context.",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Likeway Velocity",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Plus",
    description: "Mid-tier intelligence with advanced vision and 1M context.",
  },
  {
    id: "google/gemini-2.5-pro-preview",
    name: "Likeway Pinnacle",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Pro",
    description: "Frontier multimodal creativity with 1M context window.",
  },
  {
    id: "mistral-medium-latest",
    name: "Likeway CodeMaster",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Go",
    description: "Full-stack coding, debugging, and code refactoring.",
  },
  {
    id: "codestral-latest",
    name: "Likeway Maverick",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Go",
    description: "Specialized code generation for complex architectures.",
  },
  {
    id: "mistral-small-latest",
    name: "Likeway Micro",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
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
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "groq",
    contextWindow: 128000,
    vision: false,
    plan: "Go",
    description: "Precise knowledge retrieval and academic research.",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Likeway Fast",
    company: "Likeway AI",
    avatarLetter: "L",
    category: "Other",
    provider: "groq",
    contextWindow: 128000,
    vision: false,
    plan: "Go",
    description: "Lightning-fast responses for quick questions and editing.",
    fast: true,
  },
  // ══════════════════════════════════════════════════════════════
  //  QWEN — self-hosted OpenAI-compatible endpoint
  //  Base URL: QWEN_BASE_URL (default https://qwen.ai.unturf.com/v1)
  // ══════════════════════════════════════════════════════════════
  {
    id: "qwen3.8-27b",
    name: "Qwen 3.8 27B",
    company: "Qwen",
    avatarLetter: "Q",
    category: "Other",
    provider: "qwen",
    contextWindow: 32768,
    vision: false,
    plan: "Core",
    description: "Qwen 3.8 27B — a capable open-weights reasoning model served in-house.",
    reasoning: true,
  },
];

export function getModelById(id: string): Model | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getProviderForModel(modelId: string): ModelProvider {
  const model = getModelById(modelId);
  if (model) return model.provider;
  // Unknown ids previously defaulted to OpenRouter, which silently sent
  // arbitrary model strings to a provider that may not serve them. Fail to
  // the configured in-house model instead.
  return "qwen";
}

/** Returns only models available on the free proxy (no API key needed) */
export function getFreeModels(): Model[] {
  return MODELS.filter((m) => m.provider === "freemodels");
}

