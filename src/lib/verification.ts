// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — VERIFICATION LAYER
// Quality, reliability, and safety checks for AI outputs
// ══════════════════════════════════════════════════════════════════════

import { getProviderForModel } from "./models";

// ── Types ────────────────────────────────────────────────────────────

export type VerificationType = "code" | "research" | "document" | "data" | "general";
export type IssueSeverity = "critical" | "warning" | "info";

export interface VerificationIssue {
  type: IssueSeverity;
  category: string;
  message: string;
  suggestion?: string;
}

export interface VerificationResult {
  passed: boolean;
  score: number; // 0-100
  issues: VerificationIssue[];
  suggestions: string[];
  metadata: {
    duration: number;
    checksPerformed: number;
  };
}

// ══════════════════════════════════════════════════════════════════════
// CODE VERIFICATION
// ══════════════════════════════════════════════════════════════════════

export async function verifyCode(code: string, language: string = "javascript"): Promise<VerificationResult> {
  const startTime = Date.now();
  const issues: VerificationIssue[] = [];
  const suggestions: string[] = [];
  let checksPerformed = 0;

  // Basic syntax checks
  checksPerformed++;

  // Check for common issues
  if (code.includes("eval(")) {
    issues.push({
      type: "critical",
      category: "security",
      message: "Use of eval() detected - potential security risk",
      suggestion: "Avoid eval(). Use JSON.parse() for JSON, or Function constructor for dynamic code.",
    });
  }

  if (code.includes("innerHTML") && language === "javascript") {
    issues.push({
      type: "warning",
      category: "security",
      message: "Direct innerHTML assignment can lead to XSS vulnerabilities",
      suggestion: "Use textContent or sanitize input before setting innerHTML.",
    });
  }

  if (code.includes("console.log") && !code.includes("//")) {
    suggestions.push("Consider removing console.log statements for production code.");
  }

  // Check for error handling
  checksPerformed++;
  const hasTryCatch = code.includes("try") && code.includes("catch");
  const hasAsyncOperations = code.includes("async") || code.includes("await") || code.includes("fetch");
  if (hasAsyncOperations && !hasTryCatch) {
    issues.push({
      type: "warning",
      category: "reliability",
      message: "Async operations without try/catch error handling",
      suggestion: "Wrap async operations in try/catch blocks.",
    });
  }

  // Check for hardcoded secrets
  checksPerformed++;
  const secretPatterns = [
    /password\s*[=:]\s*["'][^"']+["']/i,
    /api[_-]?key\s*[=:]\s*["'][^"']+["']/i,
    /secret\s*[=:]\s*["'][^"']+["']/i,
    /token\s*[=:]\s*["'][^"']+["']/i,
  ];

  for (const pattern of secretPatterns) {
    if (pattern.test(code)) {
      issues.push({
        type: "critical",
        category: "security",
        message: "Potential hardcoded secret detected",
        suggestion: "Use environment variables or a secrets manager instead.",
      });
      break;
    }
  }

  // Check for TODO/FIXME
  checksPerformed++;
  const todoCount = (code.match(/TODO|FIXME|HACK|XXX/gi) || []).length;
  if (todoCount > 0) {
    suggestions.push(`Found ${todoCount} TODO/FIXME comments that may need attention.`);
  }

  // Calculate score
  const criticalCount = issues.filter(i => i.type === "critical").length;
  const warningCount = issues.filter(i => i.type === "warning").length;
  const score = Math.max(0, 100 - (criticalCount * 30) - (warningCount * 10));

  return {
    passed: criticalCount === 0,
    score,
    issues,
    suggestions,
    metadata: {
      duration: Date.now() - startTime,
      checksPerformed,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════
// RESEARCH VERIFICATION
// ══════════════════════════════════════════════════════════════════════

export async function verifyResearch(content: string, sources: string[]): Promise<VerificationResult> {
  const startTime = Date.now();
  const issues: VerificationIssue[] = [];
  const suggestions: string[] = [];
  let checksPerformed = 0;

  // Check for citations
  checksPerformed++;
  const citationPattern = /\[Source:?[^\]]*\]|https?:\/\/[^\s)]+/gi;
  const citations = content.match(citationPattern) || [];
  if (citations.length === 0) {
    issues.push({
      type: "warning",
      category: "credibility",
      message: "No citations or sources found in the research",
      suggestion: "Add citations to support claims and improve credibility.",
    });
  }

  // Check source diversity
  checksPerformed++;
  if (sources.length < 3) {
    issues.push({
      type: "warning",
      category: "completeness",
      message: `Only ${sources.length} source(s) used`,
      suggestion: "Use at least 3 different sources for comprehensive research.",
    });
  }

  // Check for hedging language (good practice)
  checksPerformed++;
  const hedgingPatterns = /\b(may|might|could|possibly|potentially|appears|suggests)\b/gi;
  const hedgingCount = (content.match(hedgingPatterns) || []).length;
  if (hedgingCount === 0 && content.length > 500) {
    suggestions.push("Consider adding hedging language for uncertain claims.");
  }

  // Check for factual claims that should be cited
  checksPerformed++;
  const statisticalPattern = /\d+%|\$\d+|\d+ (million|billion|trillion)/gi;
  const stats = content.match(statisticalPattern) || [];
  if (stats.length > 0 && citations.length === 0) {
    issues.push({
      type: "warning",
      category: "credibility",
      message: `Found ${stats.length} statistical claims without citations`,
      suggestion: "Add sources for all statistical claims.",
    });
  }

  const criticalCount = issues.filter(i => i.type === "critical").length;
  const warningCount = issues.filter(i => i.type === "warning").length;
  const score = Math.max(0, 100 - (criticalCount * 30) - (warningCount * 10));

  return {
    passed: criticalCount === 0,
    score,
    issues,
    suggestions,
    metadata: {
      duration: Date.now() - startTime,
      checksPerformed,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════
// DOCUMENT VERIFICATION
// ══════════════════════════════════════════════════════════════════════

export async function verifyDocument(content: string, type: "report" | "proposal" | "resume" | "general" = "general"): Promise<VerificationResult> {
  const startTime = Date.now();
  const issues: VerificationIssue[] = [];
  const suggestions: string[] = [];
  let checksPerformed = 0;

  // Check structure
  checksPerformed++;
  const hasHeadings = /^#{1,3}\s+.+/m.test(content);
  if (!hasHeadings && content.length > 500) {
    issues.push({
      type: "warning",
      category: "structure",
      message: "Document lacks section headings",
      suggestion: "Add headings to improve document structure and readability.",
    });
  }

  // Check length appropriateness
  checksPerformed++;
  const wordCount = content.split(/\s+/).length;
  if (type === "resume" && wordCount > 800) {
    issues.push({
      type: "warning",
      category: "format",
      message: "Resume may be too long",
      suggestion: "Keep resumes concise - aim for 1-2 pages.",
    });
  }

  // Check for placeholder text
  checksPerformed++;
  const placeholders = content.match(/\b(lorem ipsum|placeholder|TBD|TBC|insert here)\b/gi) || [];
  if (placeholders.length > 0) {
    issues.push({
      type: "critical",
      category: "completeness",
      message: `Found ${placeholders.length} placeholder texts`,
      suggestion: "Replace all placeholder text with actual content.",
    });
  }

  // Check for consistent formatting
  checksPerformed++;
  const bulletPoints = (content.match(/^[\s]*[-*•]\s+.+$/gm) || []).length;
  const numberedLists = (content.match(/^\d+\.\s+.+$/gm) || []).length;
  if (bulletPoints > 0 && numberedLists > 0) {
    suggestions.push("Consider using consistent list formatting (either bullets or numbers).");
  }

  const criticalCount = issues.filter(i => i.type === "critical").length;
  const warningCount = issues.filter(i => i.type === "warning").length;
  const score = Math.max(0, 100 - (criticalCount * 30) - (warningCount * 10));

  return {
    passed: criticalCount === 0,
    score,
    issues,
    suggestions,
    metadata: {
      duration: Date.now() - startTime,
      checksPerformed,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════
// DATA VERIFICATION
// ══════════════════════════════════════════════════════════════════════

export async function verifyData(data: any[]): Promise<VerificationResult> {
  const startTime = Date.now();
  const issues: VerificationIssue[] = [];
  const suggestions: string[] = [];
  let checksPerformed = 0;

  // Check for empty data
  checksPerformed++;
  if (!data || data.length === 0) {
    issues.push({
      type: "critical",
      category: "completeness",
      message: "Dataset is empty",
      suggestion: "Provide data to analyze.",
    });
    return {
      passed: false,
      score: 0,
      issues,
      suggestions,
      metadata: { duration: Date.now() - startTime, checksPerformed },
    };
  }

  // Check for null/undefined values
  checksPerformed++;
  let nullCount = 0;
  for (const row of data) {
    if (row && typeof row === "object") {
      for (const val of Object.values(row)) {
        if (val === null || val === undefined || val === "") {
          nullCount++;
        }
      }
    }
  }
  if (nullCount > 0) {
    issues.push({
      type: "warning",
      category: "quality",
      message: `Found ${nullCount} empty/null values in dataset`,
      suggestion: "Consider handling missing values appropriately.",
    });
  }

  // Check for duplicate rows
  checksPerformed++;
  const stringified = data.map(r => JSON.stringify(r));
  const uniqueRows = new Set(stringified);
  const duplicateCount = stringified.length - uniqueRows.size;
  if (duplicateCount > 0) {
    issues.push({
      type: "warning",
      category: "quality",
      message: `Found ${duplicateCount} duplicate rows`,
      suggestion: "Remove duplicates for accurate analysis.",
    });
  }

  const criticalCount = issues.filter(i => i.type === "critical").length;
  const warningCount = issues.filter(i => i.type === "warning").length;
  const score = Math.max(0, 100 - (criticalCount * 30) - (warningCount * 10));

  return {
    passed: criticalCount === 0,
    score,
    issues,
    suggestions,
    metadata: {
      duration: Date.now() - startTime,
      checksPerformed,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════
// GENERAL OUTPUT VERIFICATION
// ══════════════════════════════════════════════════════════════════════

export async function verifyOutput(
  content: string,
  originalPrompt: string,
  type: VerificationType = "general"
): Promise<VerificationResult> {
  switch (type) {
    case "code":
      return verifyCode(content);
    case "research":
      return verifyResearch(content, []);
    case "document":
      return verifyDocument(content);
    case "data":
      return verifyData([]);
    default:
      // General verification
      const startTime = Date.now();
      const issues: VerificationIssue[] = [];
      const suggestions: string[] = [];

      // Check relevance (basic keyword matching)
      const promptWords = originalPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const contentLower = content.toLowerCase();
      const relevanceScore = promptWords.filter(w => contentLower.includes(w)).length / Math.max(promptWords.length, 1);

      if (relevanceScore < 0.2 && content.length > 100) {
        issues.push({
          type: "warning",
          category: "relevance",
          message: "Response may not fully address the prompt",
          suggestion: "Review if the response covers all aspects of the request.",
        });
      }

      // Check for hallucination markers
      const hallucinationPatterns = /\b(as an ai|as a language model|i cannot|i'm not able)\b/gi;
      const halluncinations = content.match(hallucinationPatterns) || [];
      if (halluncinations.length > 0) {
        issues.push({
          type: "info",
          category: "reliability",
          message: "AI limitations mentioned in response",
          suggestion: "This may indicate the model is unsure about the answer.",
        });
      }

      const criticalCount = issues.filter(i => i.type === "critical").length;
      const warningCount = issues.filter(i => i.type === "warning").length;
      const score = Math.max(0, 100 - (criticalCount * 30) - (warningCount * 10));

      return {
        passed: criticalCount === 0,
        score,
        issues,
        suggestions,
        metadata: {
          duration: Date.now() - startTime,
          checksPerformed: 2,
        },
      };
  }
}
