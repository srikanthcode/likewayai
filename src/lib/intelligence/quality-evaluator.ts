/**
 * LikeWay Response Quality Evaluator & Short Response Protection
 * Validates generated AI responses against task complexity, requested depth,
 * and key coverage dimensions. Triggers targeted single-pass refinement if insufficient.
 */

import { TaskClassification } from "./task-classifier";
import { ModelCapabilityProfile } from "./model-registry";

export interface QualityEvaluation {
  isSufficient: boolean;
  score: {
    relevance: number;
    completeness: number;
    clarity: number;
    structure: number;
    overall: number;
  };
  missingDimensions: string[];
  refinementPrompt?: string;
  reason?: string;
}

/**
 * Heuristic quality evaluator that detects under-developed, incomplete, or truncated answers.
 */
export function evaluateResponseQuality(
  prompt: string,
  responseContent: string,
  task: TaskClassification,
  modelProfile: ModelCapabilityProfile
): QualityEvaluation {
  const content = (responseContent || "").trim();
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const lineCount = content.split("\n").filter(Boolean).length;

  const { complexity, desiredDepth, expectedOutputFormat, requiredCoverageKeys } = task;

  // 1. Trivial or casual requests are always sufficient if non-empty
  if (desiredDepth <= 1 || task.taskType === "casual_conversation") {
    if (wordCount >= 2) {
      return {
        isSufficient: true,
        score: { relevance: 1.0, completeness: 1.0, clarity: 1.0, structure: 1.0, overall: 1.0 },
        missingDimensions: [],
      };
    }
    return {
      isSufficient: false,
      score: { relevance: 0.2, completeness: 0.1, clarity: 0.5, structure: 0.2, overall: 0.25 },
      missingDimensions: ["Direct answer"],
      reason: "Response was empty or nearly empty.",
      refinementPrompt: `Please provide a direct, helpful answer to: "${prompt}"`,
    };
  }

  // 2. High complexity vs Short Response Check (Short Response Protection)
  // For Level 3+, an answer with < 60 words is almost certainly incomplete.
  const minExpectedWordsByDepth: Record<number, number> = {
    0: 5,
    1: 15,
    2: 45,
    3: 90,
    4: 160,
    5: 220,
  };

  const minExpectedWords = minExpectedWordsByDepth[desiredDepth] || 40;
  const isTooShort = wordCount < minExpectedWords;

  // 3. Format-specific coverage checks
  const missingDimensions: string[] = [];

  if (expectedOutputFormat === "code" || task.taskType === "coding") {
    const hasCodeBlock = content.includes("```");
    if (!hasCodeBlock && complexity >= 2) {
      missingDimensions.push("Working code block");
    }
    const codeBlockCount = (content.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      missingDimensions.push("Complete unclosed code block");
    }
  }

  if (expectedOutputFormat === "prompt") {
    const hasPromptBlock = content.includes("<prompt") || content.includes("```prompt") || content.includes("```markdown");
    if (!hasPromptBlock && wordCount < 50) {
      missingDimensions.push("Dedicated prompt block");
    }
  }

  if (expectedOutputFormat === "diagram" || task.taskType === "architecture") {
    const hasDiagram = content.includes("```mermaid") || content.includes("<artifact");
    if (!hasDiagram && complexity >= 3) {
      missingDimensions.push("Architecture diagram / visual flowchart");
    }
  }

  if (expectedOutputFormat === "table" || task.taskType === "comparison") {
    const hasTable = content.includes("|") && content.includes("---");
    if (!hasTable && complexity >= 2) {
      missingDimensions.push("Comparison table");
    }
  }

  // 4. Calculate dimensional scores
  let completenessScore = 1.0;
  if (isTooShort) completenessScore -= 0.4;
  if (missingDimensions.length > 0) completenessScore -= 0.15 * missingDimensions.length;
  completenessScore = Math.max(0.2, Math.min(1.0, completenessScore));

  const structureScore = content.includes("##") || content.includes("```") || content.includes("- ") || content.includes("1. ") ? 0.95 : 0.6;
  const clarityScore = wordCount > 10 ? 0.9 : 0.5;
  const relevanceScore = 0.95;

  const overall = (completenessScore * 0.45) + (structureScore * 0.25) + (clarityScore * 0.15) + (relevanceScore * 0.15);

  const isSufficient = overall >= 0.70 && !isTooShort;

  let refinementPrompt: string | undefined = undefined;
  if (!isSufficient) {
    const missingDesc = missingDimensions.length > 0
      ? `The answer is missing: ${missingDimensions.join(", ")}.`
      : `The answer is too brief for this depth requirement (${wordCount} words provided, expected at least ${minExpectedWords}).`;

    refinementPrompt = `The previous response was insufficient for the user's request.
User Prompt: "${prompt}"
${missingDesc}

Please expand and complete the response directly, providing all missing sections with clear formatting, practical code or diagrams where appropriate. Do NOT repeat introductory phrases.`;
  }

  return {
    isSufficient,
    score: {
      relevance: Math.round(relevanceScore * 100) / 100,
      completeness: Math.round(completenessScore * 100) / 100,
      clarity: Math.round(clarityScore * 100) / 100,
      structure: Math.round(structureScore * 100) / 100,
      overall: Math.round(overall * 100) / 100,
    },
    missingDimensions,
    refinementPrompt,
    reason: !isSufficient ? `Overall score ${overall.toFixed(2)} is below threshold 0.70 or output is truncated.` : undefined,
  };
}
