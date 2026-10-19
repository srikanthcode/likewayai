/**
 * LikeWay Task Classifier & Response Depth Engine
 * Analyzes user prompts to classify task category, complexity, expected output format,
 * user intent, language, and dynamically resolves response depth (Levels 0–5).
 */

export type TaskType =
  | "casual_conversation"
  | "factual_question"
  | "explanation"
  | "tutorial"
  | "coding"
  | "debugging"
  | "architecture"
  | "research"
  | "comparison"
  | "summarization"
  | "rewriting"
  | "translation"
  | "mathematics"
  | "data_analysis"
  | "planning"
  | "prompt_generation"
  | "business_strategy"
  | "document_generation"
  | "creative_writing"
  | "ambiguous";

export type OutputFormat =
  | "text"
  | "code"
  | "prompt"
  | "diagram"
  | "plan"
  | "table"
  | "debug"
  | "project"
  | "document";

export type DepthLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface TaskClassification {
  taskType: TaskType;
  complexity: 1 | 2 | 3 | 4 | 5; // 1 = trivial, 5 = extremely complex
  urgency: "low" | "medium" | "high";
  desiredDepth: DepthLevel;
  expectedOutputFormat: OutputFormat;
  detectedLanguage: "en" | "ta" | "tanglish" | "other";
  requiresArtifact: boolean;
  requiredCoverageKeys: string[];
}

/**
 * Detect language heuristics
 */
function detectLanguage(text: string): "en" | "ta" | "tanglish" | "other" {
  // Check for Tamil Unicode characters (\u0B80-\u0BFF)
  const tamilCharCount = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  if (tamilCharCount > 3) {
    return "ta";
  }

  // Check for Tanglish keywords (Tamil in English script)
  const tanglishRegex = /\b(enna|epdi|solunga|pannalam|vanakkam|illai|nalla|theriyuma|paaru|apdi|irukku|irukken|seiyanum|solli|thanga|konjam)\b/i;
  if (tanglishRegex.test(text)) {
    return "tanglish";
  }

  return "en";
}

/**
 * Classify user intent and determine optimal depth level
 */
export function classifyTask(
  prompt: string,
  options?: {
    userPreference?: "concise" | "balanced" | "detailed" | "expert";
    modelTier?: string;
    hasImageAttachment?: boolean;
    hasFileAttachment?: boolean;
  }
): TaskClassification {
  const p = (prompt || "").trim().toLowerCase();
  const lang = detectLanguage(prompt);

  // 0. Quick Modifiers & Deeper / Simpler / Shorter Replays
  if (
    p.includes("[provide a deeper technical breakdown") ||
    p.includes("deeper") ||
    p.includes("in-depth") ||
    p.includes("in depth") ||
    p.includes("detailed breakdown")
  ) {
    return {
      taskType: "explanation",
      complexity: 4,
      urgency: "medium",
      desiredDepth: 4,
      expectedOutputFormat: "text",
      detectedLanguage: lang,
      requiresArtifact: false,
      requiredCoverageKeys: ["What is it", "Why it Matters / Problems Solved", "How it Works (Architecture & Code)", "Key Features Explained", "Real-World Applications"],
    };
  }

  if (p.includes("[explain simply") || p.includes("simpler") || p.includes("simple explanation")) {
    return {
      taskType: "explanation",
      complexity: 2,
      urgency: "medium",
      desiredDepth: 2,
      expectedOutputFormat: "text",
      detectedLanguage: lang,
      requiresArtifact: false,
      requiredCoverageKeys: ["Simple Explanation", "Everyday Analogy", "Intuitive Steps"],
    };
  }

  if (p.includes("[rewrite concisely") || p.includes("shorter") || p.includes("bullet summary")) {
    return {
      taskType: "summarization",
      complexity: 1,
      urgency: "medium",
      desiredDepth: 1,
      expectedOutputFormat: "text",
      detectedLanguage: lang,
      requiresArtifact: false,
      requiredCoverageKeys: ["Concise Takeaways"],
    };
  }

  // 1. Check for prompt creation requests
  if (
    p.includes("give me a prompt") ||
    p.includes("create a prompt") ||
    p.includes("write a prompt") ||
    p.includes("generate a prompt") ||
    p.includes("system prompt for") ||
    p.startsWith("prompt:")
  ) {
    return {
      taskType: "prompt_generation",
      complexity: 2,
      urgency: "medium",
      desiredDepth: 2,
      expectedOutputFormat: "prompt",
      detectedLanguage: lang,
      requiresArtifact: true,
      requiredCoverageKeys: ["Role", "Objective", "Context", "Instructions"],
    };
  }

  // 2. Check for debugging & error fixing
  if (
    p.includes("error") ||
    p.includes("exception") ||
    p.includes("traceback") ||
    p.includes("bug") ||
    p.includes("fix this") ||
    p.includes("failed to compile") ||
    p.includes("cannot find module") ||
    p.includes("not defined") ||
    p.includes("syntaxerror") ||
    p.includes("typeerror") ||
    p.includes("debugging")
  ) {
    return {
      taskType: "debugging",
      complexity: 3,
      urgency: "high",
      desiredDepth: 3,
      expectedOutputFormat: "debug",
      detectedLanguage: lang,
      requiresArtifact: false,
      requiredCoverageKeys: ["Root Cause", "Fix", "Code", "Verification"],
    };
  }

  // 3. Check for Architecture & System Design
  if (
    p.includes("architecture") ||
    p.includes("system design") ||
    p.includes("high-level design") ||
    p.includes("hld") ||
    p.includes("lld") ||
    p.includes("microservices") ||
    p.includes("scalable architecture") ||
    p.includes("event-driven") ||
    p.includes("database design") ||
    p.includes("infrastructure design")
  ) {
    const isExpert = options?.userPreference === "expert" || p.includes("production-ready");
    return {
      taskType: "architecture",
      complexity: isExpert ? 5 : 4,
      urgency: "low",
      desiredDepth: (isExpert ? 4 : 3) as DepthLevel,
      expectedOutputFormat: "diagram",
      detectedLanguage: lang,
      requiresArtifact: true,
      requiredCoverageKeys: ["Requirements", "Architecture", "Diagram", "Components", "Trade-offs"],
    };
  }

  // 4. Check for Planning, Roadmap, Timeline
  if (
    p.includes("plan") ||
    p.includes("roadmap") ||
    p.includes("timeline") ||
    p.includes("milestone") ||
    p.includes("step by step plan") ||
    p.includes("sprint plan")
  ) {
    return {
      taskType: "planning",
      complexity: 3,
      urgency: "medium",
      desiredDepth: 3,
      expectedOutputFormat: "plan",
      detectedLanguage: lang,
      requiresArtifact: true,
      requiredCoverageKeys: ["Goal", "Phases", "Key Milestones", "Risks"],
    };
  }

  // 5. Check for Comparison & Versus
  if (
    p.includes("vs") ||
    p.includes("versus") ||
    p.includes("compare") ||
    p.includes("difference between") ||
    p.includes("which is better") ||
    p.includes("pros and cons")
  ) {
    return {
      taskType: "comparison",
      complexity: 3,
      urgency: "medium",
      desiredDepth: 2,
      expectedOutputFormat: "table",
      detectedLanguage: lang,
      requiresArtifact: false,
      requiredCoverageKeys: ["Comparison Table", "Advantages", "Disadvantages", "Recommendation"],
    };
  }

  // 6. Check for Multi-file Project generation
  if (
    p.includes("build a full") ||
    p.includes("build this application") ||
    p.includes("complete project") ||
    p.includes("full-stack app") ||
    p.includes("create an entire project") ||
    p.includes("starter template with multiple files")
  ) {
    return {
      taskType: "coding",
      complexity: 5,
      urgency: "low",
      desiredDepth: 4,
      expectedOutputFormat: "project",
      detectedLanguage: lang,
      requiresArtifact: true,
      requiredCoverageKeys: ["File Tree", "Core Files", "Setup Guide", "Run Commands"],
    };
  }

  // 7. General Coding requests
  if (
    p.includes("code") ||
    p.includes("function") ||
    p.includes("component") ||
    p.includes("script") ||
    p.includes("write a react") ||
    p.includes("write a python") ||
    p.includes("write a ts") ||
    p.includes("implement") ||
    p.includes("hook") ||
    p.includes("api endpoint") ||
    p.includes("sql query")
  ) {
    const isComplex = p.includes("production") || p.includes("enterprise") || p.length > 200;
    return {
      taskType: "coding",
      complexity: isComplex ? 4 : 3,
      urgency: "medium",
      desiredDepth: isComplex ? 3 : 2,
      expectedOutputFormat: "code",
      detectedLanguage: lang,
      requiresArtifact: false,
      requiredCoverageKeys: ["Implementation", "Code Block", "Explanation", "Usage"],
    };
  }

  // 8. Document / Report Generation
  if (
    p.includes("report") ||
    p.includes("document") ||
    p.includes("whitepaper") ||
    p.includes("executive summary") ||
    p.includes("proposal") ||
    p.includes("create pdf") ||
    p.includes("generate docx")
  ) {
    return {
      taskType: "document_generation",
      complexity: 4,
      urgency: "low",
      desiredDepth: 4,
      expectedOutputFormat: "document",
      detectedLanguage: lang,
      requiresArtifact: true,
      requiredCoverageKeys: ["Title", "Executive Summary", "Body", "Actionable Takeaways"],
    };
  }

  // 9. Casual Conversation / Greetings
  if (
    p === "hi" ||
    p === "hello" ||
    p === "hey" ||
    p === "good morning" ||
    p === "good evening" ||
    p === "how are you" ||
    p === "who are you" ||
    p === "vanakkam"
  ) {
    return {
      taskType: "casual_conversation",
      complexity: 1,
      urgency: "low",
      desiredDepth: 0,
      expectedOutputFormat: "text",
      detectedLanguage: lang,
      requiresArtifact: false,
      requiredCoverageKeys: [],
    };
  }

  // 10. Technology / Framework / Conceptual Explanations (What, Why, How)
  const isTechConcept = /\b(java|python|javascript|typescript|c\+\+|golang|rust|docker|kubernetes|react|next\.?js|node\.?js|sql|nosql|mongodb|postgres|redis|kafka|api|graphql|oauth|jwt|http|git|linux|aws|azure|gcp|spring|jvm|compiler|database|microservices|css|html|machine learning|ai|deep learning)\b/i.test(p);
  if (
    isTechConcept ||
    p.includes("how does") ||
    p.includes("why use") ||
    p.includes("explain ")
  ) {
    return {
      taskType: "explanation",
      complexity: 3,
      urgency: "medium",
      desiredDepth: 3,
      expectedOutputFormat: "text",
      detectedLanguage: lang,
      requiresArtifact: false,
      requiredCoverageKeys: ["What is it", "Why it Matters / Problems Solved", "How it Works (Workflow & Code)", "Key Features (User-Friendly)", "Real-world Applications"],
    };
  }

  // 11. Simple Factual Trivia (e.g. "Capital of France", "When was Google founded")
  if (
    (p.startsWith("what is") || p.startsWith("what are") || p.startsWith("who is") || p.startsWith("when was")) &&
    p.length < 50
  ) {
    return {
      taskType: "factual_question",
      complexity: 1,
      urgency: "medium",
      desiredDepth: 1,
      expectedOutputFormat: "text",
      detectedLanguage: lang,
      requiresArtifact: false,
      requiredCoverageKeys: ["Direct Answer"],
    };
  }

  // 11. In-depth Tutorials / Guides
  if (p.includes("tutorial") || p.includes("guide") || p.includes("how to build") || p.includes("step by step")) {
    return {
      taskType: "tutorial",
      complexity: 3,
      urgency: "medium",
      desiredDepth: 3,
      expectedOutputFormat: "text",
      detectedLanguage: lang,
      requiresArtifact: false,
      requiredCoverageKeys: ["Prerequisites", "Step-by-Step", "Commands", "Verification"],
    };
  }

  // 12. Deep Research / Analysis
  if (p.includes("research") || p.includes("deep dive") || p.includes("analyze") || p.includes("market analysis")) {
    return {
      taskType: "research",
      complexity: 5,
      urgency: "low",
      desiredDepth: 4,
      expectedOutputFormat: "text",
      detectedLanguage: lang,
      requiresArtifact: false,
      requiredCoverageKeys: ["Executive Thesis", "Key Findings", "Comparative Analysis", "Citations"],
    };
  }

  // Default Fallback: general explanation
  const wordCount = prompt.split(/\s+/).length;
  const isShortQuery = wordCount <= 8;

  let resolvedDepth: DepthLevel = isShortQuery ? 1 : 2;
  if (options?.userPreference === "concise") resolvedDepth = Math.max(0, resolvedDepth - 1) as DepthLevel;
  if (options?.userPreference === "detailed") resolvedDepth = Math.min(5, resolvedDepth + 1) as DepthLevel;

  return {
    taskType: isShortQuery ? "factual_question" : "explanation",
    complexity: isShortQuery ? 1 : 2,
    urgency: "medium",
    desiredDepth: resolvedDepth,
    expectedOutputFormat: "text",
    detectedLanguage: lang,
    requiresArtifact: false,
    requiredCoverageKeys: ["Direct Answer", "Key Insights"],
  };
}
