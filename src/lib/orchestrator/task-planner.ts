// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — TASK PLANNER
// Analyzes user intent and creates structured execution plans
// ══════════════════════════════════════════════════════════════════════

import { TaskPlan, TaskStep, TaskType, TaskComplexity } from "./types";
import crypto from "crypto";

// ── Intent Detection Patterns ────────────────────────────────────────

const INTENT_PATTERNS: Record<TaskType, RegExp[]> = {
  search: [
    /\b(search|google|look up|find|look for|what is|who is|when did|where is)\b/i,
    /\b(latest|recent|current|today|news|update)\b.*\b(on|about|for)\b/i,
  ],
  research: [
    /\b(research|analyze|investigate|deep dive|comprehensive|detailed analysis)\b/i,
    /\b(compare|versus|vs|pros and cons|advantages|disadvantages)\b/i,
    /\b(report|whitepaper|study|survey|assessment)\b/i,
  ],
  code: [
    /\b(write|create|build|implement|code|program|script|function|class)\b/i,
    /\b(debug|fix|error|bug|issue|problem|crash)\b/i,
    /\b(refactor|optimize|improve|clean|restructure)\b/i,
    /\b(deploy|docker|ci\/cd|pipeline|build|compile)\b/i,
  ],
  document: [
    /\b(create|generate|write|make)\s+(a\s+)?(pdf|document|docx|report|proposal|resume|letter)\b/i,
    /\b(export|download|save)\s+(as\s+)?(pdf|docx|document)\b/i,
  ],
  "data-analysis": [
    /\b(analyze|analysis|chart|graph|visualization|dashboard|data|statistics)\b/i,
    /\b(excel|csv|spreadsheet|dataset|metrics|kpi|trend)\b/i,
    /\b(predict|forecast|regression|correlation|statistical)\b/i,
  ],
  image: [
    /\b(generate|create|make|draw|design|paint|render)\s+(an?\s+)?(image|picture|photo|illustration|artwork|poster|logo|banner)\b/i,
    /\b(edit|modify|transform|enhance|upscale)\s+(the\s+)?(image|photo|picture)\b/i,
  ],
  browser: [
    /\b(open|go to|navigate|browse|click|fill|submit|login|sign in|sign up)\b/i,
    /\b(website|webpage|page|site|url|link)\b/i,
  ],
  creative: [
    /\b(write|create|compose|draft)\s+(a\s+)?(story|poem|essay|article|blog|copy|script)\b/i,
    /\b(brainstorm|ideate|suggest|come up with)\b/i,
  ],
  planning: [
    /\b(plan|roadmap|strategy|timeline|schedule|organize|outline)\b/i,
    /\b(steps|phases|milestones|goals|objectives)\b/i,
  ],
  "multi-step": [
    /\b(and then|after that|next|also|additionally|furthermore)\b/i,
    /\b(first.*then|step 1.*step 2|research.*and.*create)\b/i,
  ],
  simple问答: [],
  unknown: [],
};

// ── Complexity Detection ─────────────────────────────────────────────

function detectComplexity(prompt: string, type: TaskType): TaskComplexity {
  const wordCount = prompt.split(/\s+/).length;
  const hasMultiStep = /\b(and then|after that|also|additionally|step \d)\b/i.test(prompt);
  const hasDepth = /\b(deep|comprehensive|detailed|thorough|extensive|in-depth)\b/i.test(prompt);
  const hasMultipleRequests = (prompt.match(/\b(and|also|plus|additionally|furthermore)\b/gi) || []).length >= 2;

  // Expert: multi-step complex workflows
  if (type === "multi-step" || (hasMultiStep && hasDepth)) return "expert";
  // Complex: deep research, detailed analysis, multiple components
  if (hasDepth || hasMultipleRequests || wordCount > 100) return "complex";
  // Medium: moderate complexity
  if (wordCount > 30 || type === "research" || type === "data-analysis") return "medium";
  // Simple: straightforward questions
  return "simple";
}

// ── Task Type Detection ──────────────────────────────────────────────

function detectTaskType(prompt: string, mode?: string): TaskType {
  // If a specific mode is set, map it
  if (mode) {
    const modeMap: Record<string, TaskType> = {
      General: "simple问答",
      Researcher: "research",
      Architect: "code",
      Creative: "creative",
      Visionary: "image",
      Automation: "browser",
      Browser: "browser",
      "deep-research": "research",
    };
    if (modeMap[mode]) return modeMap[mode];
  }

  // Score each intent type
  const scores: Record<TaskType, number> = {} as any;
  for (const [type, patterns] of Object.entries(INTENT_PATTERNS)) {
    scores[type as TaskType] = 0;
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        scores[type as TaskType]++;
      }
    }
  }

  // Multi-step takes priority if detected
  if (scores["multi-step"] > 0 && scores["multi-step"] >= 2) {
    return "multi-step";
  }

  // Find highest scoring type (excluding simple问答 and unknown)
  let bestType: TaskType = "simple问答";
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (type === "simple问答" || type === "unknown" || type === "multi-step") continue;
    if (score > bestScore) {
      bestScore = score;
      bestType = type as TaskType;
    }
  }

  return bestScore > 0 ? bestType : "simple问答";
}

// ── Model Recommendation ─────────────────────────────────────────────

function recommendModel(type: TaskType, complexity: TaskComplexity): string {
  // Model routing based on task type and complexity
  const routing: Record<TaskType, Record<TaskComplexity, string>> = {
    simple问答: {
      simple: "mistral-small-latest",
      medium: "mistral-medium-latest",
      complex: "mistral-medium-latest",
      expert: "google/gemini-2.5-flash",
    },
    search: {
      simple: "mistral-small-latest",
      medium: "mistral-medium-latest",
      complex: "google/gemini-2.5-flash",
      expert: "google/gemini-2.5-pro",
    },
    research: {
      simple: "mistral-medium-latest",
      medium: "google/gemini-2.5-flash",
      complex: "google/gemini-2.5-pro",
      expert: "google/gemini-2.5-pro-preview",
    },
    code: {
      simple: "codestral-latest",
      medium: "codestral-latest",
      complex: "deepseek/deepseek-r1",
      expert: "openai/o3",
    },
    document: {
      simple: "mistral-medium-latest",
      medium: "mistral-medium-latest",
      complex: "google/gemini-2.5-flash",
      expert: "google/gemini-2.5-pro",
    },
    "data-analysis": {
      simple: "mistral-medium-latest",
      medium: "google/gemini-2.5-flash",
      complex: "google/gemini-2.5-pro",
      expert: "openai/gpt-4o",
    },
    image: {
      simple: "google/gemini-2.5-flash",
      medium: "google/gemini-2.5-flash",
      complex: "google/gemini-2.5-pro",
      expert: "google/gemini-2.5-pro-preview",
    },
    browser: {
      simple: "mistral-small-latest",
      medium: "llama-3.3-70b-versatile",
      complex: "google/gemini-2.5-flash",
      expert: "google/gemini-2.5-pro",
    },
    creative: {
      simple: "mistral-medium-latest",
      medium: "mistral-medium-latest",
      complex: "google/gemini-2.5-flash",
      expert: "google/gemini-2.5-pro-preview",
    },
    planning: {
      simple: "mistral-medium-latest",
      medium: "google/gemini-2.5-flash",
      complex: "google/gemini-2.5-pro",
      expert: "google/gemini-2.5-pro-preview",
    },
    "multi-step": {
      simple: "mistral-medium-latest",
      medium: "google/gemini-2.5-flash",
      complex: "google/gemini-2.5-pro",
      expert: "google/gemini-2.5-pro-preview",
    },
    unknown: {
      simple: "mistral-medium-latest",
      medium: "mistral-medium-latest",
      complex: "google/gemini-2.5-flash",
      expert: "google/gemini-2.5-pro",
    },
  };

  return routing[type]?.[complexity] || "mistral-medium-latest";
}

// ── Task Plan Generator ──────────────────────────────────────────────

function generateSteps(type: TaskType, complexity: TaskComplexity, prompt: string): TaskStep[] {
  const steps: TaskStep[] = [];

  switch (type) {
    case "search":
      steps.push(
        {
          id: "search",
          order: 1,
          action: "Search the web for relevant information",
          tool: "SEARCH_WEB",
          input: { query: prompt },
          timeout: 15000,
          retryable: true,
          optional: false,
        },
        {
          id: "synthesize",
          order: 2,
          action: "Answer the user's question using the search results, citing sources",
          input: { prompt },
          timeout: 20000,
          retryable: false,
          optional: false,
          dependsOn: ["search"],
        }
      );
      break;

    case "research":
      steps.push(
        {
          id: "decompose",
          order: 1,
          action: "Break down research query into sub-topics",
          input: { prompt },
          timeout: 10000,
          retryable: false,
          optional: false,
        },
        {
          id: "search-1",
          order: 2,
          action: "Search for primary sources",
          tool: "SEARCH_WEB",
          input: { query: prompt },
          timeout: 20000,
          retryable: true,
          optional: false,
          dependsOn: ["decompose"],
        },
        {
          id: "deep-research",
          order: 3,
          action: "Deep dive into top sources",
          tool: "DEEP_SEARCH",
          input: { query: prompt },
          timeout: 30000,
          retryable: true,
          optional: complexity === "simple",
          dependsOn: ["search-1"],
        },
        {
          id: "synthesize",
          order: 4,
          action: "Synthesize findings into structured report",
          input: { prompt },
          timeout: 15000,
          retryable: false,
          optional: false,
          dependsOn: ["search-1", "deep-research"],
        }
      );
      break;

    case "code":
      steps.push(
        {
          id: "analyze",
          order: 1,
          action: "Analyze requirements and plan implementation",
          input: { prompt },
          timeout: 10000,
          retryable: false,
          optional: false,
        },
        {
          id: "implement",
          order: 2,
          action: "Write production-quality code",
          input: { prompt },
          timeout: 30000,
          retryable: true,
          optional: false,
          dependsOn: ["analyze"],
        }
      );
      if (complexity === "complex" || complexity === "expert") {
        steps.push({
          id: "review",
          order: 3,
          action: "Review and optimize code",
          input: { prompt },
          timeout: 15000,
          retryable: false,
          optional: false,
          dependsOn: ["implement"],
        });
      }
      break;

    case "document": {
      // Pick output format from the request (default: DOCX — editable).
      // Spreadsheet requests are handled by the data-analysis plan instead.
      const wantsPdf = /\bpdf\b/i.test(prompt);
      const docTool = wantsPdf ? "CREATE_PDF" : "CREATE_DOCX";
      const ext = wantsPdf ? "pdf" : "docx";

      steps.push(
        {
          id: "draft",
          order: 1,
          action:
            "Draft complete, well-structured document content in markdown (# main title, ## sections, bullets). " +
            "Cover every aspect of the user's request thoroughly.",
          input: { prompt },
          timeout: 30000,
          retryable: false,
          optional: false,
        },
        {
          id: "create-file",
          order: 2,
          action: `Generate the ${ext.toUpperCase()} file from the drafted content`,
          tool: docTool,
          input: {
            title: prompt.slice(0, 100),
            content: "{{step:draft}}",
            filename: `likeway-${Date.now()}`,
          },
          timeout: 30000,
          retryable: true,
          optional: false,
          dependsOn: ["draft"],
        }
      );
      break;
    }

    case "data-analysis":
      steps.push(
        {
          id: "analyze",
          order: 1,
          action:
            "Analyze the data question. Produce: (1) key findings and insights in markdown, then " +
            "(2) a clean dataset as a fenced JSON array of objects (one object per row) summarizing the analysis.",
          input: { prompt },
          timeout: 40000,
          retryable: false,
          optional: false,
        },
        {
          id: "create-sheet",
          order: 2,
          action: "Export the analysis dataset to an Excel spreadsheet",
          tool: "CREATE_XLSX",
          input: {
            title: "Analysis",
            rows: "{{step:analyze}}",
            filename: `analysis-${Date.now()}`,
          },
          timeout: 30000,
          retryable: true,
          optional: true,
          dependsOn: ["analyze"],
        }
      );
      break;

    case "multi-step":
      // For multi-step, we plan each sub-task
      steps.push(
        {
          id: "plan",
          order: 1,
          action: "Create execution plan for multi-step task",
          input: { prompt },
          timeout: 10000,
          retryable: false,
          optional: false,
        },
        {
          id: "execute",
          order: 2,
          action: "Execute planned steps sequentially",
          input: { prompt },
          timeout: 60000,
          retryable: true,
          optional: false,
          dependsOn: ["plan"],
        },
        {
          id: "verify",
          order: 3,
          action: "Verify results and compile final output",
          input: { prompt },
          timeout: 10000,
          retryable: false,
          optional: false,
          dependsOn: ["execute"],
        }
      );
      break;

    default:
      // Simple Q&A or unknown — single step
      steps.push({
        id: "respond",
        order: 1,
        action: "Generate response",
        input: { prompt },
        timeout: 30000,
        retryable: false,
        optional: false,
      });
      break;
  }

  return steps;
}

// ── Main: Create Task Plan ───────────────────────────────────────────

export function createTaskPlan(prompt: string, mode?: string): TaskPlan {
  const type = detectTaskType(prompt, mode);
  const complexity = detectComplexity(prompt, type);
  const steps = generateSteps(type, complexity, prompt);
  const model = recommendModel(type, complexity);

  const requiredTools = [...new Set(steps.filter(s => s.tool).map(s => s.tool!))];
  const totalTimeout = steps.reduce((sum, s) => sum + s.timeout, 0);

  return {
    id: crypto.randomUUID(),
    type,
    complexity,
    description: `Task: ${type} (${complexity}) — ${prompt.slice(0, 100)}`,
    steps,
    estimatedTokens: complexity === "simple" ? 2000 : complexity === "medium" ? 5000 : 10000,
    estimatedDuration: totalTimeout,
    requiredTools,
    modelRecommendation: model,
    canParallelize: type === "multi-step" && steps.some(s => s.dependsOn && s.dependsOn.length > 0),
  };
}

// ── Export helpers ────────────────────────────────────────────────────
export { detectTaskType, detectComplexity, recommendModel };
