// ── Agent Type Definitions ─────────────────────────────────────────────
export type AgentCategory =
  | "core"
  | "research"
  | "coding"
  | "creative"
  | "productivity"
  | "analysis"
  | "automation"
  | "specialized";

export type AgentCapability =
  | "text"
  | "code"
  | "search"
  | "browser"
  | "image"
  | "voice"
  | "file"
  | "data"
  | "memory"
  | "planning"
  | "email"
  | "calendar"
  | "api";

export type PlanTier = "Core" | "Go" | "Plus" | "Pro";

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  Core: 0,
  Go: 1,
  Plus: 2,
  Pro: 3,
};

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AgentCategory;
  capabilities: AgentCapability[];
  model?: string;
  systemPrompt: string;
  tools: string[];
  premium: boolean;
  /** Minimum plan required to use this agent */
  minPlan: PlanTier;
  color: string;
}

export function canAccessAgent(userPlan: PlanTier, agentMinPlan: PlanTier): boolean {
  return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[agentMinPlan];
}

// ── Agent Categories ──────────────────────────────────────────────────
export const AGENT_CATEGORIES: Record<AgentCategory, { name: string; icon: string; color: string }> = {
  core: { name: "Core", icon: "⚡", color: "#3B82F6" },
  research: { name: "Research", icon: "🔍", color: "#8B5CF6" },
  coding: { name: "Coding", icon: "💻", color: "#10B981" },
  creative: { name: "Creative", icon: "🎨", color: "#F59E0B" },
  productivity: { name: "Productivity", icon: "📋", color: "#06B6D4" },
  analysis: { name: "Analysis", icon: "📊", color: "#EF4444" },
  automation: { name: "Automation", icon: "🤖", color: "#EC4899" },
  specialized: { name: "Specialized", icon: "🎯", color: "#8B5CF6" },
};
