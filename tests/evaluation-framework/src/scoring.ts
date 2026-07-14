import type { CategoryMetrics, TestResult, SuiteResult, EvaluationReport, EvaluationConfig } from "./types.js";
import { weightedScore, average, getSystemInfo } from "./utils.js";

export function scoreResult(
  pass: boolean,
  subScores: number[],
  details: string
): TestResult {
  const score = pass && subScores.length > 0
    ? Math.round(average(subScores))
    : pass ? 100 : 0;
  return { pass, score: Math.max(0, Math.min(100, score)), details };
}

export function computeSuiteMetrics(suite: SuiteResult): void {
  const avgScore = average(suite.tests.map((t) => t.score));
  suite.overallScore = Math.round(avgScore);
  suite.passedTests = suite.tests.filter((t) => t.pass).length;
  suite.failedTests = suite.tests.filter((t) => !t.pass).length;
}

export function assembleReport(
  suites: SuiteResult[],
  config: EvaluationConfig
): EvaluationReport {
  const metrics: CategoryMetrics = {
    accuracy: 0,
    reasoning: 0,
    coding: 0,
    conversation: 0,
    safety: 0,
    speed: 0,
    reliability: 0,
    ux: 0,
  };

  const categoryScores: any = {};

  for (const suite of suites) {
    categoryScores[suite.suite] = suite.overallScore;
    if (suite.metrics) {
      for (const key of Object.keys(metrics) as (keyof CategoryMetrics)[]) {
        if (suite.metrics[key] !== undefined) {
          metrics[key] = Math.max(metrics[key], suite.metrics[key]);
        }
      }
    }
  }

  const overallScore = weightedScore(metrics, config.weights as any);

  const weakAreas = Object.entries(metrics)
    .map(([cat, score]) => ({
      category: cat as keyof CategoryMetrics,
      score,
      threshold: config.thresholds[cat as keyof CategoryMetrics],
      gap: Math.max(0, config.thresholds[cat as keyof CategoryMetrics] - score),
      details: score >= config.thresholds[cat as keyof CategoryMetrics]
        ? "Passing"
        : `Score ${score} is below threshold ${config.thresholds[cat as keyof CategoryMetrics]}`,
    }))
    .filter((w) => w.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  const report: EvaluationReport = {
    timestamp: new Date().toISOString(),
    targetUrl: config.targetUrl,
    modelId: config.modelId,
    systemInfo: getSystemInfo(),
    overallScore,
    categoryScores,
    metrics,
    suites,
    weakAreas,
    rootCauses: analyzeRootCauses(suites, metrics, weakAreas),
    priorityFixes: generatePriorityFixes(weakAreas, suites),
    regressions: detectRegressions(suites),
    improvementPlan: generateImprovementPlan(weakAreas, overallScore),
    summary: generateSummary(overallScore, metrics, weakAreas),
  };

  return report;
}

function analyzeRootCauses(
  suites: SuiteResult[],
  metrics: CategoryMetrics,
  weakAreas: any[]
) {
  const causes: any[] = [];

  for (const area of weakAreas) {
    const suite = suites.find((s) => s.suite === area.category);
    const failReasons = suite?.tests
      .filter((t) => !t.pass)
      .map((t) => t.details)
      .join("; ") || "";

    const cause = getRootCauseForCategory(area.category);
    causes.push({
      category: area.category,
      cause: cause.description,
      evidence: failReasons || cause.evidence,
      severity: area.gap > 30 ? "critical" : area.gap > 15 ? "high" : "medium",
    });
  }

  return causes;
}

function getRootCauseForCategory(category: string) {
  const causes: Record<string, { description: string; evidence: string }> = {
    accuracy: {
      description: "Model training data cutoff or insufficient grounding. Search context may not be triggered for all factual queries.",
      evidence: "Factual queries returned outdated or incorrect information",
    },
    reasoning: {
      description: "Temperature too high for reasoning tasks or model lacks chain-of-thought prompting.",
      evidence: "Multi-step logic problems solved incorrectly",
    },
    coding: {
      description: "Code generation lacks sufficient context or the model's training data has limited coverage of newer APIs.",
      evidence: "Generated code fails compilation or produces runtime errors",
    },
    conversation: {
      description: "Message history truncation or context window management losing earlier turns.",
      evidence: "Follow-up questions answered without reference to conversation history",
    },
    safety: {
      description: "System prompt may not have sufficient guardrails or refusal patterns for all attack vectors.",
      evidence: "Model complied partially with harmful instructions",
    },
    speed: {
      description: "Provider latency, model size, or network overhead causing slow response times.",
      evidence: "High first-token latency or total response time",
    },
    reliability: {
      description: "API key rotation or provider failover not handling all error states gracefully.",
      evidence: "Failed requests due to rate limits or provider errors",
    },
    ux: {
      description: "Response formatting, markdown rendering, or streaming implementation can be improved.",
      evidence: "Poorly formatted responses or confusing output structure",
    },
  };
  return causes[category] || {
    description: "Unknown root cause",
    evidence: "Insufficient data to determine root cause",
  };
}

function generatePriorityFixes(weakAreas: any[], suites: SuiteResult[]) {
  const fixes: any[] = [];
  let fixId = 0;

  for (const area of weakAreas.sort((a: any, b: any) => b.gap - a.gap)) {
    const priority = area.gap > 30 ? "P0" : area.gap > 15 ? "P1" : "P2";
    const fix = getFixForCategory(area.category, priority);
    if (fix) fixes.push({ id: `FIX-${++fixId}`, ...fix, priority });
  }

  return fixes;
}

function getFixForCategory(category: string, priority: string) {
  const fixes: Record<string, any> = {
    accuracy: {
      title: "Improve factual accuracy with enhanced web search integration",
      description: "Expand real-time search triggers and improve search context integration into system prompts. For ambiguous factual queries, always perform a web search before answering.",
      file: "src/app/api/chat/route.ts",
      suggestedChange: "Expand searchKeywords array and lower the confidence threshold for web search inclusion. Add fallback to secondary search engines when primary fails.",
    },
    reasoning: {
      title: "Enhance chain-of-thought reasoning capability",
      description: "Add explicit step-by-step reasoning instructions to system prompts for Architect and General modes. Reduce temperature for reasoning-heavy queries.",
      file: "src/lib/agents.ts",
      suggestedChange: "Add 'Think step by step. Show your reasoning clearly before giving the final answer.' to system prompts. Implement automatic temperature scaling based on query complexity.",
    },
    coding: {
      title: "Improve code generation quality and correctness",
      description: "Enhance code generation context with explicit language version constraints, error handling patterns, and testing requirements.",
      file: "src/lib/agents.ts",
      suggestedChange: "Add code quality instructions: 'Always include error handling, use modern syntax, add type annotations, and provide usage examples.' Route coding queries to code-optimized models.",
    },
    conversation: {
      title: "Fix conversation memory retention across turns",
      description: "Ensure full conversation context is preserved and passed correctly on follow-up queries. Fix message history trimming logic.",
      file: "src/lib/memory.ts",
      suggestedChange: "Increase maxHistory limits per provider. Implement smarter context window management that prioritizes recent messages while preserving key information from earlier turns.",
    },
    safety: {
      title: "Strengthen safety guardrails and refusal patterns",
      description: "Enhance system prompt with explicit safety instructions. Add input/output filtering for harmful content detection.",
      file: "src/lib/agents.ts",
      suggestedChange: "Add comprehensive safety guidelines to the system prompt. Implement a pre-processing filter that detects and blocks prompt injection and jailbreak attempts before they reach the model.",
    },
    speed: {
      title: "Optimize response latency",
      description: "Reduce first-token latency by optimizing provider selection, connection pooling, and streaming implementation.",
      file: "src/lib/api-manager.ts",
      suggestedChange: "Implement connection keep-alive, pre-warm model connections, and add latency-based provider selection that prefers faster providers for simple queries.",
    },
    reliability: {
      title: "Improve error handling and failover mechanisms",
      description: "Enhance API key rotation, provider failover, and retry logic to handle all error states gracefully.",
      file: "src/lib/api-manager.ts",
      suggestedChange: "Add exponential backoff retry, circuit breaker pattern for failing providers, and better error categorization to distinguish between transient and permanent failures.",
    },
    ux: {
      title: "Enhance response formatting and user experience",
      description: "Improve markdown rendering, code block formatting, and error message clarity.",
      file: "src/app/page.tsx",
      suggestedChange: "Add better formatting for lists, tables, and structured data. Improve error messages to be more helpful and actionable. Add progress indicators during long operations.",
    },
  };
  return fixes[category] || null;
}

function detectRegressions(suites: SuiteResult[]) {
  const regressions: any[] = [];
  for (const suite of suites) {
    const prevPassRate = 100; // Baseline: assume 100% for first run
    const currentPassRate = suite.overallScore;
    if (currentPassRate < prevPassRate - 10) {
      regressions.push({
        description: `${suite.name} pass rate dropped from ${prevPassRate}% to ${currentPassRate}%`,
        testCase: suite.suite,
        expectedFix: "Restore pass rate to baseline level",
      });
    }
  }
  return regressions;
}

function generateImprovementPlan(weakAreas: any[], overallScore: number) {
  const urgency = overallScore < 60 ? "immediate" : overallScore < 75 ? "shortTerm" : "mediumTerm";

  const immediate = weakAreas
    .filter((w: any) => w.gap > 30)
    .map((w: any) => ({
      title: `Fix ${w.category} (score: ${w.score}, gap: ${w.gap}pts)`,
      description: `Critical gap in ${w.category}. Immediate investigation and remediation required.`,
      owner: "AI Systems Team",
      effort: "medium" as const,
      impact: "critical" as const,
    }));

  const shortTerm = weakAreas
    .filter((w: any) => w.gap > 15 && w.gap <= 30)
    .map((w: any) => ({
      title: `Improve ${w.category} performance`,
      description: `Score ${w.score} is below threshold. Targeted improvements needed.`,
      owner: "AI Systems Team",
      effort: "medium" as const,
      impact: "high" as const,
    }));

  const mediumTerm = weakAreas
    .filter((w: any) => w.gap > 0 && w.gap <= 15)
    .map((w: any) => ({
      title: `Polish ${w.category}`,
      description: `Minor gap of ${w.gap}pts. Fine-tune and optimize.`,
      owner: "AI Systems Team",
      effort: "small" as const,
      impact: "medium" as const,
    }));

  const longTerm = [
    {
      title: "Implement continuous evaluation pipeline",
      description: "Automate evaluation runs on every deployment to catch regressions early.",
      owner: "DevOps/ML Team",
      effort: "large" as const,
      impact: "high" as const,
    },
    {
      title: "Build regression test suite from real user data",
      description: "Collect anonymized user queries and expected responses to build a comprehensive regression test suite.",
      owner: "QA Team",
      effort: "large" as const,
      impact: "high" as const,
    },
    {
      title: "Implement A/B testing framework for model changes",
      description: "Deploy model updates alongside baseline and compare scores automatically.",
      owner: "ML Team",
      effort: "large" as const,
      impact: "high" as const,
    },
  ];

  return {
    immediate: urgency === "immediate" ? immediate : [],
    shortTerm: urgency === "shortTerm" || urgency === "immediate" ? shortTerm : immediate.length > 0 ? [] : shortTerm,
    mediumTerm: mediumTerm,
    longTerm,
  };
}

function generateSummary(overallScore: number, metrics: CategoryMetrics, weakAreas: any[]) {
  const grade = overallScore >= 90 ? "A" : overallScore >= 80 ? "B" : overallScore >= 70 ? "C" : overallScore >= 60 ? "D" : "F";
  const status = overallScore >= 80 ? "PRODUCTION READY" : overallScore >= 60 ? "NEEDS IMPROVEMENT" : "NOT READY";

  const weakPoints = weakAreas.length > 0
    ? `Weak areas: ${weakAreas.map((w: any) => `${w.category} (${w.score}/100)`).join(", ")}`
    : "All categories pass thresholds.";

  return `Overall Score: ${overallScore}/100 (Grade ${grade}) — ${status}\n${weakPoints}`;
}
