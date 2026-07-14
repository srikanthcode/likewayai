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
  color: string;
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
