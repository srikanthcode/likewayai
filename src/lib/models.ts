export type ModelProvider = "openrouter" | "groq";

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
    id: "llama-3.1-8b-instant",
    name: "LikeWay Fast",
    provider: "groq",
    contextWindow: 128000,
    vision: false,
    plan: "Core",
    description: "Ultrafast speed, good for simple tasks",
    fast: true,
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "LikeWay Pro",
    provider: "groq",
    contextWindow: 128000,
    vision: false,
    plan: "Go",
    description: "Highly versatile, balanced speed & quality",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini Flash 2.5",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Go",
    description: "1M context window, fast and intelligent",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini Pro 2.5",
    provider: "openrouter",
    contextWindow: 1000000,
    vision: true,
    plan: "Plus",
    description: "Smartest Gemini model, deep reasoning",
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "openrouter",
    contextWindow: 200000,
    vision: true,
    plan: "Plus",
    description: "Exceptional coding & sophisticated writing",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openrouter",
    contextWindow: 128000,
    vision: true,
    plan: "Plus",
    description: "Powerful and versatile flagship OpenAI model",
  },
  {
    id: "openai/o3",
    name: "OpenAI o3",
    provider: "openrouter",
    contextWindow: 200000,
    vision: false,
    plan: "Pro",
    description: "State-of-the-art math and coding reasoning",
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "LikeWay Lite (Free)",
    provider: "openrouter",
    contextWindow: 128000,
    vision: false,
    plan: "Core",
    description: "Lightweight and free to use",
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
