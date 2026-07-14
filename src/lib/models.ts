export type ModelProvider = "openrouter" | "groq" | "mistral";

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: number;
  vision: boolean;
  plan: "Core" | "Go" | "Plus" | "Pro";
  description: string;
  fast?: boolean;
}

export type ModelConfig = Model;

export const MODELS: Model[] = [
  {
    id: "mistral-medium-latest",
    name: "Likeway CodeMaster",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Core",
    description: "Main chat model – excellent for chat, reasoning, and coding.",
  },
  {
    id: "codestral-latest",
    name: "Likeway Maverick",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Core",
    description: "World-class coding model for complex software engineering tasks.",
  },
  {
    id: "mistral-small-latest",
    name: "Likeway Micro",
    provider: "mistral",
    contextWindow: 32000,
    vision: false,
    plan: "Core",
    description: "Lightweight model for fast responses.",
    fast: true,
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Likeway Scholar",
    provider: "groq",
    contextWindow: 128000,
    vision: false,
    plan: "Core",
    description: "Focused and precise knowledge retrieval for basic research",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Likeway Fast",
    provider: "groq",
    contextWindow: 128000,
    vision: false,
    plan: "Core",
    description: "Ultra-responsive and efficient for everyday tasks",
    fast: true,
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Likeway Insight",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Go",
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
    id: "anthropic/claude-3.5-sonnet",
    name: "Likeway QuickThought",
    provider: "openrouter",
    contextWindow: 200000,
    vision: true,
    plan: "Plus",
    description: "Lightning-fast and highly secure analysis engine",
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Likeway Codex Elite",
    provider: "openrouter",
    contextWindow: 200000,
    vision: true,
    plan: "Plus",
    description: "World-class coding capabilities and logical flow",
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
