/**
 * LikeWay Universal Model Capability Registry & Telemetry
 * Provides normalized capability profiles and runtime performance metrics for all supported models.
 */

export type ModelTier = "TIER_1_FRONTIER" | "TIER_2_STRONG" | "TIER_3_FAST" | "TIER_4_SPECIALIZED";
export type SpeedTier = "ultra-fast" | "fast" | "balanced" | "deep";
export type CostTier = "free" | "low" | "medium" | "high";

export interface ModelCapabilityProfile {
  provider: string;
  modelId: string;
  displayName: string;
  tier: ModelTier;
  
  // Numerical ratings (1-10)
  intelligenceLevel: number;
  reasoningLevel: number;
  codingLevel: number;
  instructionFollowing: number;
  
  // Limits
  contextWindow: number;
  maxOutputTokens: number;
  
  // Performance classification
  speedTier: SpeedTier;
  costTier: CostTier;
  
  // Feature flags
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  supportsStreaming: boolean;
  supportsReasoning: boolean;
  supportsWebSearch: boolean;
  
  // Reliability (0.0 - 1.0)
  reliabilityScore: number;
}

export interface RuntimeTelemetry {
  firstTokenLatencyMs: number;
  totalLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  errorRate: number;
  timeoutRate: number;
  userFeedbackScore: number; // 0 to 5
  sampleCount: number;
}

// In-memory runtime telemetry store
const telemetryStore: Map<string, RuntimeTelemetry> = new Map();

/**
 * Normalized Model Capability Profiles
 */
export const MODEL_REGISTRY: Record<string, ModelCapabilityProfile> = {
  // ── TIER 1: FRONTIER / DEEP REASONING ──────────────────────────────────
  "claude-opus-5.5": {
    provider: "Anthropic",
    modelId: "claude-opus-5.5",
    displayName: "Claude Opus 5.5",
    tier: "TIER_1_FRONTIER",
    intelligenceLevel: 10,
    reasoningLevel: 10,
    codingLevel: 9.8,
    instructionFollowing: 10,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    speedTier: "deep",
    costTier: "high",
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.99,
  },
  "claude-sonnet-5": {
    provider: "Anthropic",
    modelId: "claude-sonnet-5",
    displayName: "Claude Sonnet 5.5",
    tier: "TIER_1_FRONTIER",
    intelligenceLevel: 9.8,
    reasoningLevel: 9.7,
    codingLevel: 9.9,
    instructionFollowing: 9.9,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    speedTier: "fast",
    costTier: "medium",
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.99,
  },
  "gpt-6-astra": {
    provider: "OpenAI",
    modelId: "gpt-6-astra",
    displayName: "GPT 6 Astra",
    tier: "TIER_1_FRONTIER",
    intelligenceLevel: 10,
    reasoningLevel: 10,
    codingLevel: 10,
    instructionFollowing: 10,
    contextWindow: 200000,
    maxOutputTokens: 16384,
    speedTier: "deep",
    costTier: "high",
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.99,
  },
  "deepseek-r1": {
    provider: "DeepSeek",
    modelId: "deepseek-r1",
    displayName: "DeepSeek R1",
    tier: "TIER_1_FRONTIER",
    intelligenceLevel: 9.7,
    reasoningLevel: 10,
    codingLevel: 9.6,
    instructionFollowing: 9.5,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    speedTier: "deep",
    costTier: "low",
    supportsVision: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.96,
  },

  // ── TIER 2: STRONG GENERAL MODELS ─────────────────────────────────────
  "sol": {
    provider: "OpenAI",
    modelId: "sol",
    displayName: "GPT 5.6 Sol",
    tier: "TIER_2_STRONG",
    intelligenceLevel: 9.2,
    reasoningLevel: 9.0,
    codingLevel: 9.2,
    instructionFollowing: 9.4,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    speedTier: "fast",
    costTier: "medium",
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.98,
  },
  "terra": {
    provider: "OpenAI",
    modelId: "terra",
    displayName: "GPT 5.6 Terra",
    tier: "TIER_2_STRONG",
    intelligenceLevel: 9.1,
    reasoningLevel: 9.0,
    codingLevel: 9.1,
    instructionFollowing: 9.3,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    speedTier: "balanced",
    costTier: "medium",
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.98,
  },
  "claude-fable-5": {
    provider: "Anthropic",
    modelId: "claude-fable-5",
    displayName: "Claude Fable 5",
    tier: "TIER_2_STRONG",
    intelligenceLevel: 9.0,
    reasoningLevel: 8.8,
    codingLevel: 8.7,
    instructionFollowing: 9.5,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    speedTier: "balanced",
    costTier: "medium",
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.98,
  },
  "claude-fable-5.1": {
    provider: "Anthropic",
    modelId: "claude-fable-5.1",
    displayName: "Claude Fable 5.1",
    tier: "TIER_2_STRONG",
    intelligenceLevel: 9.1,
    reasoningLevel: 8.9,
    codingLevel: 8.8,
    instructionFollowing: 9.6,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    speedTier: "balanced",
    costTier: "medium",
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.98,
  },
  "gemini-2.5-pro": {
    provider: "Google",
    modelId: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    tier: "TIER_2_STRONG",
    intelligenceLevel: 9.3,
    reasoningLevel: 9.2,
    codingLevel: 9.2,
    instructionFollowing: 9.3,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    speedTier: "balanced",
    costTier: "medium",
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.97,
  },
  "deepseek-v3": {
    provider: "DeepSeek",
    modelId: "deepseek-v3",
    displayName: "DeepSeek V3",
    tier: "TIER_2_STRONG",
    intelligenceLevel: 9.2,
    reasoningLevel: 9.1,
    codingLevel: 9.4,
    instructionFollowing: 9.2,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    speedTier: "fast",
    costTier: "low",
    supportsVision: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.97,
  },
  "mistral-medium": {
    provider: "Mistral AI",
    modelId: "mistral-medium",
    displayName: "Mistral Medium",
    tier: "TIER_2_STRONG",
    intelligenceLevel: 8.9,
    reasoningLevel: 8.8,
    codingLevel: 8.9,
    instructionFollowing: 9.1,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    speedTier: "fast",
    costTier: "medium",
    supportsVision: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.97,
  },

  // ── TIER 3: FAST / MID-LEVEL MODELS ───────────────────────────────────
  "llama-3.1-8b": {
    provider: "Meta",
    modelId: "llama-3.1-8b",
    displayName: "Likeway Fast",
    tier: "TIER_3_FAST",
    intelligenceLevel: 7.8,
    reasoningLevel: 7.5,
    codingLevel: 7.6,
    instructionFollowing: 8.2,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    speedTier: "ultra-fast",
    costTier: "free",
    supportsVision: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsWebSearch: true,
    reliabilityScore: 0.96,
  },
  "mistral-small": {
    provider: "Mistral AI",
    modelId: "mistral-small",
    displayName: "Likeway Micro",
    tier: "TIER_3_FAST",
    intelligenceLevel: 7.9,
    reasoningLevel: 7.6,
    codingLevel: 7.8,
    instructionFollowing: 8.3,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    speedTier: "ultra-fast",
    costTier: "free",
    supportsVision: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsWebSearch: true,
    reliabilityScore: 0.96,
  },
  "deepseek-v4.1": {
    provider: "DeepSeek",
    modelId: "deepseek-v4.1",
    displayName: "Likeway Flash",
    tier: "TIER_3_FAST",
    intelligenceLevel: 8.4,
    reasoningLevel: 8.2,
    codingLevel: 8.3,
    instructionFollowing: 8.6,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    speedTier: "ultra-fast",
    costTier: "free",
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.97,
  },
  "mimo-v2.6": {
    provider: "Xiaomi",
    modelId: "mimo-v2.6",
    displayName: "Likeway Mimo",
    tier: "TIER_3_FAST",
    intelligenceLevel: 8.2,
    reasoningLevel: 8.0,
    codingLevel: 8.1,
    instructionFollowing: 8.5,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    speedTier: "ultra-fast",
    costTier: "free",
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.96,
  },
  "gemini-2.5-flash": {
    provider: "Google",
    modelId: "gemini-2.5-flash",
    displayName: "Likeway Insight",
    tier: "TIER_3_FAST",
    intelligenceLevel: 8.6,
    reasoningLevel: 8.5,
    codingLevel: 8.5,
    instructionFollowing: 8.8,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    speedTier: "ultra-fast",
    costTier: "free",
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.98,
  },

  // ── TIER 4: SPECIALIZED / CODING / LONG-CONTEXT ────────────────────────
  "codestral": {
    provider: "Mistral AI",
    modelId: "codestral",
    displayName: "Likeway CodeMaster",
    tier: "TIER_4_SPECIALIZED",
    intelligenceLevel: 9.1,
    reasoningLevel: 8.9,
    codingLevel: 9.8,
    instructionFollowing: 9.3,
    contextWindow: 256000,
    maxOutputTokens: 8192,
    speedTier: "fast",
    costTier: "medium",
    supportsVision: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsWebSearch: false,
    reliabilityScore: 0.98,
  },
  "kimi-k3": {
    provider: "Moonshot AI",
    modelId: "kimi-k3",
    displayName: "Likeway LongContext",
    tier: "TIER_4_SPECIALIZED",
    intelligenceLevel: 9.0,
    reasoningLevel: 8.9,
    codingLevel: 8.8,
    instructionFollowing: 9.4,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    speedTier: "balanced",
    costTier: "medium",
    supportsVision: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.97,
  },
  "glm-5.2": {
    provider: "Z.AI",
    modelId: "glm-5.2",
    displayName: "Likeway Bilingual",
    tier: "TIER_4_SPECIALIZED",
    intelligenceLevel: 8.9,
    reasoningLevel: 8.7,
    codingLevel: 8.8,
    instructionFollowing: 9.2,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    speedTier: "balanced",
    costTier: "medium",
    supportsVision: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.97,
  },
  "llama-3.3-70b": {
    provider: "Meta",
    modelId: "llama-3.3-70b",
    displayName: "Likeway Codex Elite",
    tier: "TIER_4_SPECIALIZED",
    intelligenceLevel: 9.1,
    reasoningLevel: 9.0,
    codingLevel: 9.4,
    instructionFollowing: 9.3,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    speedTier: "fast",
    costTier: "medium",
    supportsVision: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.98,
  },
};

/**
 * Get normalized capability profile for any model ID, with safe fallback defaults.
 */
export function getModelProfile(modelId: string): ModelCapabilityProfile {
  const normalizedId = (modelId || "").toLowerCase().trim();
  
  if (MODEL_REGISTRY[normalizedId]) {
    return MODEL_REGISTRY[normalizedId];
  }

  // Substring or prefix matching
  for (const [key, profile] of Object.entries(MODEL_REGISTRY)) {
    if (normalizedId.includes(key) || key.includes(normalizedId)) {
      return profile;
    }
  }

  // Default fallback profile for unknown / custom models
  return {
    provider: "Unknown",
    modelId: modelId || "unknown-model",
    displayName: modelId || "AI Engine",
    tier: "TIER_2_STRONG",
    intelligenceLevel: 8.5,
    reasoningLevel: 8.5,
    codingLevel: 8.5,
    instructionFollowing: 8.8,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    speedTier: "balanced",
    costTier: "medium",
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsWebSearch: true,
    reliabilityScore: 0.95,
  };
}

/**
 * Record runtime telemetry for a model
 */
export function recordModelTelemetry(
  modelId: string,
  metrics: {
    firstTokenLatencyMs?: number;
    totalLatencyMs?: number;
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd?: number;
    isError?: boolean;
    isTimeout?: boolean;
    feedbackScore?: number;
  }
) {
  const current = telemetryStore.get(modelId) || {
    firstTokenLatencyMs: 0,
    totalLatencyMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
    errorRate: 0,
    timeoutRate: 0,
    userFeedbackScore: 5.0,
    sampleCount: 0,
  };

  const count = current.sampleCount + 1;
  const newLatency = metrics.totalLatencyMs
    ? (current.totalLatencyMs * current.sampleCount + metrics.totalLatencyMs) / count
    : current.totalLatencyMs;
  const newFirstToken = metrics.firstTokenLatencyMs
    ? (current.firstTokenLatencyMs * current.sampleCount + metrics.firstTokenLatencyMs) / count
    : current.firstTokenLatencyMs;

  telemetryStore.set(modelId, {
    firstTokenLatencyMs: Math.round(newFirstToken),
    totalLatencyMs: Math.round(newLatency),
    inputTokens: current.inputTokens + (metrics.inputTokens || 0),
    outputTokens: current.outputTokens + (metrics.outputTokens || 0),
    estimatedCostUsd: current.estimatedCostUsd + (metrics.estimatedCostUsd || 0),
    errorRate: metrics.isError ? (current.errorRate * current.sampleCount + 1) / count : (current.errorRate * current.sampleCount) / count,
    timeoutRate: metrics.isTimeout ? (current.timeoutRate * current.sampleCount + 1) / count : (current.timeoutRate * current.sampleCount) / count,
    userFeedbackScore: metrics.feedbackScore !== undefined
      ? (current.userFeedbackScore * current.sampleCount + metrics.feedbackScore) / count
      : current.userFeedbackScore,
    sampleCount: count,
  });
}

/**
 * Retrieve telemetry for a given model
 */
export function getModelTelemetry(modelId: string): RuntimeTelemetry | null {
  return telemetryStore.get(modelId) || null;
}
