export type ModelProvider = "openrouter" | "groq" | "mistral" | "freemodels" | "tokenharbor";

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
  //  CLAUDE (Anthropic)
  // ══════════════════════════════════════════════════════════════
  {
    id: "claude-opus-5.5",
    name: "Claude Opus 5.5",
    company: "Anthropic",
    avatarLetter: "C",
    category: "Claude",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Deep reasoning for complex mathematical and analytical problem solving.",
    reasoning: true,
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5.5",
    company: "Anthropic",
    avatarLetter: "C",
    category: "Claude",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "Balanced, low-latency reasoning and fast general assistance.",
    fast: true,
    reasoning: true,
  },
  {
    id: "claude-fable-5",
    name: "Claude Fable 5",
    company: "Anthropic",
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
    company: "Anthropic",
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
  //  GPT (OpenAI)
  // ══════════════════════════════════════════════════════════════
  {
    id: "gpt-6-astra",
    name: "GPT 6 Astra",
    company: "OpenAI",
    avatarLetter: "O",
    category: "GPT",
    provider: "freemodels",
    contextWindow: 1000000,
    vision: true,
    plan: "Core",
    description: "Next-generation reasoning engine with image understanding.",
    featured: true,
    promoLabel: "Free for 1 month",
    reasoning: true,
  },
  {
    id: "sol",
    name: "GPT 5.6 Sol",
    company: "OpenAI",
    avatarLetter: "O",
    category: "GPT",
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
    name: "GPT 5.6 Terra",
    company: "OpenAI",
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
  //  OTHER MODELS
  // ══════════════════════════════════════════════════════════════
  {
    id: "glm-5.2",
    name: "GLM 5.2",
    company: "Z.AI",
    avatarLetter: "G",
    category: "Other",
    provider: "freemodels",
    contextWindow: 200000,
    vision: true,
    plan: "Go",
    description: "High-accuracy multilingual reasoning and translation.",
    reasoning: true,
  },
  {
    id: "kimi-k3",
    name: "Kimi K3",
    company: "Moonshot AI",
    avatarLetter: "K",
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
    name: "DeepSeek V4.1 Flash",
    company: "DeepSeek",
    avatarLetter: "D",
    category: "Other",
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
    name: "Mimo V2.6 Flash",
    company: "Xiaomi",
    avatarLetter: "M",
    category: "Other",
    provider: "tokenharbor",
    contextWindow: 200000,
    vision: true,
    plan: "Core",
    description: "Multimodal engine with image understanding and fast reasoning.",
    fast: true,
    reasoning: true,
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    company: "DeepSeek",
    avatarLetter: "D",
    category: "Other",
    provider: "openrouter",
    contextWindow: 128000,
    vision: false,
    plan: "Plus",
    description: "Deep coding logic with step-by-step reasoning.",
    reasoning: true,
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    company: "DeepSeek",
    avatarLetter: "D",
    category: "Other",
    provider: "openrouter",
    contextWindow: 128000,
    vision: false,
    plan: "Plus",
    description: "Fast, secure logical analysis engine.",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    company: "Google",
    avatarLetter: "G",
    category: "Other",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Plus",
    description: "High-speed multimodal engine with 1M token context.",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    company: "Google",
    avatarLetter: "G",
    category: "Other",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Plus",
    description: "Mid-tier intelligence with advanced vision and 1M context.",
  },
  {
    id: "google/gemini-2.5-pro-preview",
    name: "Gemini 2.5 Pro Preview",
    company: "Google",
    avatarLetter: "G",
    category: "Other",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Pro",
    description: "Frontier multimodal creativity with 1M context window.",
  },
  {
    id: "mistral-medium-latest",
    name: "Mistral Medium",
    company: "Mistral AI",
    avatarLetter: "M",
    category: "Other",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Go",
    description: "Full-stack coding, debugging, and code refactoring.",
  },
  {
    id: "codestral-latest",
    name: "Codestral",
    company: "Mistral AI",
    avatarLetter: "M",
    category: "Other",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Go",
    description: "Specialized code generation for complex architectures.",
  },
  {
    id: "mistral-small-latest",
    name: "Mistral Small",
    company: "Mistral AI",
    avatarLetter: "M",
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
    name: "Llama 3.3 70B",
    company: "Meta",
    avatarLetter: "M",
    category: "Other",
    provider: "groq",
    contextWindow: 128000,
    vision: false,
    plan: "Go",
    description: "Precise knowledge retrieval and academic research.",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    company: "Meta",
    avatarLetter: "M",
    category: "Other",
    provider: "groq",
    contextWindow: 128000,
    vision: false,
    plan: "Go",
    description: "Lightning-fast responses for quick questions and editing.",
    fast: true,
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

