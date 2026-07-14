import type { TestCase } from "../types.js";

export const performanceTests: TestCase[] = [
  // ── Latency Tests ────────────────────────────────────────────────────────
  {
    id: "PERF-001",
    name: "First token latency - simple query",
    category: "performance",
    prompt: "What is 2+2?",
    expectedBehavior: "Should respond within 5 seconds for simple query",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = response.length > 0;
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "Response received (latency measured by runner)" : "No response",
        metrics: { responseTimeMs: 0 },
        evidence: response.slice(0, 100),
      };
    },
  },
  {
    id: "PERF-002",
    name: "Complex query response time",
    category: "performance",
    prompt: `Write a comprehensive analysis of the economic impacts of artificial 
intelligence on the global job market, including specific examples from 
manufacturing, healthcare, and technology sectors. Discuss both positive 
and negative effects.`,
    expectedBehavior: "Should respond within 30 seconds for complex query",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = response.length > 200;
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? `Comprehensive response (${response.length} chars)` : "Response too short",
        metrics: { responseLength: response.length },
        evidence: response.slice(0, 100),
      };
    },
  },
  // ── Throughput ──────────────────────────────────────────────────────────
  {
    id: "PERF-003",
    name: "Response length/quality ratio",
    category: "performance",
    prompt: "Explain quantum entanglement in detail",
    expectedBehavior: "Should provide substantial content",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = response.length > 500;
      return {
        pass,
        score: pass ? 100 : Math.round(response.length / 500 * 100),
        details: pass ? `Substantial response (${response.length} chars)` : `Response too short (${response.length} chars, need 500+)`,
        evidence: response.slice(0, 100),
      };
    },
  },
  // ── Concurrent Request Handling ─────────────────────────────────────────
  {
    id: "PERF-004",
    name: "Multiple rapid requests - sequential",
    category: "performance",
    prompt: "Count from 1 to 10",
    expectedBehavior: "Should handle quick succession",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = /\b\d\b/.test(response) && response.length > 10;
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Processed rapid request successfully" : "Failed on rapid request",
        evidence: response.slice(0, 100),
      };
    },
  },
  // ── Memory Usage Indicator ──────────────────────────────────────────────
  {
    id: "PERF-005",
    name: "Memory stability under load",
    category: "performance",
    prompt: "Write a 500-word essay on the history of computing",
    expectedBehavior: "Should return substantial text without issues",
    weight: 1,
    validationFn: async (response: string) => {
      const wordCount = response.split(/\s+/).length;
      const pass = wordCount > 100;
      return {
        pass,
        score: pass ? 100 : Math.round(wordCount / 100 * 100),
        details: pass ? `Generated ${wordCount} words` : `Only ${wordCount} words generated`,
        metrics: { wordCount },
        evidence: response.slice(0, 100),
      };
    },
  },
  // ── Streaming Quality ───────────────────────────────────────────────────
  {
    id: "PERF-006",
    name: "Streaming response completeness",
    category: "performance",
    prompt: "Write a short poem about programming",
    expectedBehavior: "Should return complete poem without truncation",
    weight: 1,
    validationFn: async (response: string) => {
      const hasPoemElements = /line|verse|rhyme|flow|code|program|debug|error|\.\n|,\n/i.test(response);
      const pass = response.length > 50 && hasPoemElements;
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Complete poetic response" : "Incomplete or non-poetic response",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Provider Failover Speed ─────────────────────────────────────────────
  {
    id: "PERF-007",
    name: "Error recovery speed",
    category: "performance",
    prompt: "This is a test message. Please respond with 'OK'.",
    expectedBehavior: "Should handle gracefully even under provider issues",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = response.length > 0;
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "API responded without errors" : "API failed",
        evidence: response.slice(0, 100),
      };
    },
  },
];
