// ── Core Types ──────────────────────────────────────────────────────────────

export type ModelProvider = "openrouter" | "groq" | "nvidia";

export type AgentMode = "General" | "Architect" | "Researcher" | "Creative" | "Visionary";

export type PlanType = "Core" | "Go" | "Plus" | "Pro";

export type TestCategory =
  | "functional"
  | "accuracy"
  | "reasoning"
  | "coding"
  | "conversation"
  | "performance"
  | "safety"
  | "ux";

export interface ChatRequest {
  prompt: string;
  modelId?: string;
  history?: Message[];
  files?: string[];
  mode?: AgentMode;
  plan?: PlanType;
  projectId?: string;
  customInstructions?: string;
  experimental?: boolean;
  extendedThinking?: boolean;
  userId?: string;
  conversationId?: string;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  content: string;
  latencyMs: number;
  totalTokens?: number;
  modelId?: string;
  success: boolean;
  error?: string;
  statusCode?: number;
}

export interface TestCase {
  id: string;
  name: string;
  category: TestCategory;
  prompt: string;
  history?: Message[];
  mode?: AgentMode;
  plan?: PlanType;
  files?: string[];
  expectedBehavior?: string;
  validationFn?: (response: string) => Promise<TestResult>;
  weight?: number;
  tags?: string[];
  minScore?: number;
}

export interface TestResult {
  pass: boolean;
  score: number;
  details: string;
  metrics?: Record<string, number>;
  evidence?: string;
}

export interface SuiteResult {
  suite: TestCategory;
  name: string;
  tests: TestResult[];
  overallScore: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  durationMs: number;
  metrics: CategoryMetrics;
}

export interface CategoryMetrics {
  accuracy: number;
  reasoning: number;
  coding: number;
  conversation: number;
  safety: number;
  speed: number;
  reliability: number;
  ux: number;
}

export interface EvaluationReport {
  timestamp: string;
  targetUrl: string;
  modelId: string;
  systemInfo: SystemInfo;
  overallScore: number;
  categoryScores: Record<TestCategory, number>;
  metrics: CategoryMetrics;
  suites: SuiteResult[];
  weakAreas: WeakArea[];
  rootCauses: RootCause[];
  priorityFixes: PriorityFix[];
  regressions: Regression[];
  improvementPlan: ImprovementPlan;
  summary: string;
}

export interface SystemInfo {
  nodeVersion: string;
  platform: string;
  cpus: number;
  memoryGb: number;
}

export interface WeakArea {
  category: TestCategory | keyof CategoryMetrics;
  score: number;
  threshold: number;
  gap: number;
  details: string;
}

export interface RootCause {
  category: TestCategory | keyof CategoryMetrics | string;
  cause: string;
  evidence: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface PriorityFix {
  id: string;
  title: string;
  description: string;
  file: string;
  suggestedChange: string;
  priority: "P0" | "P1" | "P2" | "P3";
}

export interface Regression {
  description: string;
  testCase: string;
  expectedFix: string;
}

export interface ImprovementPlan {
  immediate: Action[];
  shortTerm: Action[];
  mediumTerm: Action[];
  longTerm: Action[];
}

export interface Action {
  title: string;
  description: string;
  owner: string;
  effort: "small" | "medium" | "large";
  impact: "low" | "medium" | "high" | "critical";
}

export interface EvaluationConfig {
  targetUrl: string;
  modelId: string;
  iterations: number;
  suites: TestCategory[];
  thresholds: CategoryMetrics;
  weights: CategoryMetrics;
  concurrency: number;
  timeoutMs: number;
  verbose: boolean;
  outputFormat: "json" | "html" | "markdown";
}
