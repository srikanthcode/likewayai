// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — ORCHESTRATOR TYPES
// ══════════════════════════════════════════════════════════════════════

export type TaskType =
  | "simple问答"
  | "search"
  | "research"
  | "code"
  | "document"
  | "data-analysis"
  | "image"
  | "browser"
  | "creative"
  | "planning"
  | "multi-step"
  | "unknown";

export type TaskComplexity = "simple" | "medium" | "complex" | "expert";

export interface TaskPlan {
  id: string;
  type: TaskType;
  complexity: TaskComplexity;
  description: string;
  steps: TaskStep[];
  estimatedTokens: number;
  estimatedDuration: number;  // ms
  requiredTools: string[];
  requiredAgent?: string;
  modelRecommendation?: string;
  canParallelize: boolean;
}

export interface TaskStep {
  id: string;
  order: number;
  action: string;
  tool?: string;
  agent?: string;
  model?: string;
  input: Record<string, any>;
  dependsOn?: string[];  // Step IDs this depends on
  timeout: number;
  retryable: boolean;
  optional: boolean;
}

export interface OrchestratorResult {
  plan: TaskPlan;
  steps: StepResult[];
  success: boolean;
  finalOutput: string;
  totalTokens: number;
  totalDuration: number;
  metadata: {
    agentsUsed: string[];
    toolsUsed: string[];
    modelsUsed: string[];
  };
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
  tokensUsed: number;
}

export interface OrchestratorContext {
  userId: string;
  projectId: string;
  conversationId?: string;
  plan: string;
  history: Array<{ role: string; content: string }>;
  customInstructions?: string;
  searchContext?: string;
}
