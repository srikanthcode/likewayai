import type { TestCase } from "../types.js";

export const uxTests: TestCase[] = [
  // ── Response Quality ─────────────────────────────────────────────────────
  {
    id: "UX-001",
    name: "Well-formatted response",
    category: "ux",
    prompt: "List 5 productivity tips. Format them as a numbered list with bullet points for details.",
    expectedBehavior: "Should output well-structured list",
    weight: 2,
    validationFn: async (response: string) => {
      const hasNumbers = /\d+\.|1\.|2\.|3\.|4\.|5\./.test(response);
      const hasListItems = response.split("\n").filter(l => /^\s*[\d\.\-\*•]/.test(l)).length >= 3;
      const pass = hasNumbers || hasListItems;
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Well-formatted response with numbered items" : "Poorly formatted response",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Clarity ──────────────────────────────────────────────────────────────
  {
    id: "UX-002",
    name: "Clear explanation of complex topic",
    category: "ux",
    prompt: "Explain blockchain to a 10-year-old",
    expectedBehavior: "Should use simple language and analogies",
    weight: 2,
    validationFn: async (response: string) => {
      const hasAnalogy = /like|imagine|think of|similar|compare|picture|block|chain|digital|record/i.test(response);
      const simpleLanguage = !/blockchain|decentralized|consensus|hash|ledger|cryptographic|immutable|distributed/i.test(response) || hasAnalogy;
      const pass = response.length > 50 && (hasAnalogy || simpleLanguage);
      return {
        pass,
        score: pass ? 100 : 40,
        details: pass ? "Uses simple language and analogies appropriate for a child" : "Explanation too complex for a 10-year-old",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Conciseness ─────────────────────────────────────────────────────────
  {
    id: "UX-003",
    name: "Concise direct answer",
    category: "ux",
    prompt: "What is the speed of light? Answer in one sentence.",
    expectedBehavior: "Should be brief and direct",
    weight: 1,
    validationFn: async (response: string) => {
      const sentenceCount = (response.match(/[.!?]+/g) || []).length;
      const pass = sentenceCount <= 3 && response.length < 300;
      return {
        pass,
        score: pass ? 100 : Math.max(0, 100 - (sentenceCount - 1) * 20),
        details: pass ? "Concise response" : `Response has ${sentenceCount} sentences (wanted ≤3)`,
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Helpfulness ─────────────────────────────────────────────────────────
  {
    id: "UX-004",
    name: "Proactive helpfulness",
    category: "ux",
    prompt: "I don't understand how to use async/await in JavaScript",
    expectedBehavior: "Should offer to explain and provide examples",
    weight: 2,
    validationFn: async (response: string) => {
      const offersHelp = /explain|let me|here'?s?|example|try this|break it down|step|guide|tutorial|help you|understand/i.test(response);
      const hasExample = /```|example|for example|such as|like this|code|function|async|await/i.test(response);
      const pass = offersHelp && hasExample;
      return {
        pass,
        score: pass ? 100 : 40,
        details: pass ? "Provides explanation with examples" : "Not sufficiently helpful",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Error Handling ──────────────────────────────────────────────────────
  {
    id: "UX-005",
    name: "Graceful error acknowledgment",
    category: "ux",
    prompt: "Tell me the exact square root of -1 using real numbers",
    expectedBehavior: "Should explain that it's imaginary",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = /imaginary|complex|i\b|not possible|can't|cannot|no real|undefined|doesn't exist/i.test(response);
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "Correctly explains imaginary numbers" : "Did not identify the impossibility",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Formatting ──────────────────────────────────────────────────────────
  {
    id: "UX-006",
    name: "Proper code formatting with language hint",
    category: "ux",
    prompt: "Write a Python function that calculates fibonacci numbers",
    expectedBehavior: "Should use proper markdown code blocks with language",
    weight: 2,
    validationFn: async (response: string) => {
      const hasCodeBlock = /```python/i.test(response);
      const hasFunction = /\bdef\b|\bfib|\bfibonacci/i.test(response);
      const pass = hasCodeBlock && hasFunction;
      return {
        pass,
        score: pass ? 100 : 40,
        details: pass ? "Properly formatted code block with Python language hint" : `Code block: ${hasCodeBlock}, Function: ${hasFunction}`,
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Structured Data Presentation ────────────────────────────────────────
  {
    id: "UX-007",
    name: "Table formatting",
    category: "ux",
    prompt: "Compare Python, JavaScript, and Rust in a table. Include: typing, speed, learning curve, and primary use case.",
    expectedBehavior: "Should format as a markdown table",
    weight: 2,
    validationFn: async (response: string) => {
      const hasTable = /\|.*\|.*\|/.test(response) && /---|:---/.test(response);
      const hasLanguages = /python|javascript|rust/i.test(response);
      const pass = hasTable && hasLanguages;
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Formatted as markdown table" : "No table formatting detected",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Tone Appropriateness ────────────────────────────────────────────────
  {
    id: "UX-008",
    name: "Professional tone for business query",
    category: "ux",
    prompt: "Write a professional email to a client about a project delay",
    expectedBehavior: "Should maintain professional tone",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = /dear|hello|sincerely|regards|apologize|understand|appreciate|thank|project|delay|team|update/i.test(response);
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Maintains professional tone" : "Not professional enough",
        evidence: response.slice(0, 200),
      };
    },
  },
];
