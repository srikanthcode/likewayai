 import type { TestCase } from "../types.js";

const baseline = (pass: boolean): boolean => pass;

export const functionalTests: TestCase[] = [
  // ── Normal Chat ───────────────────────────────────────────────────────────
  {
    id: "FUNC-001",
    name: "Basic greeting response",
    category: "functional",
    prompt: "Hello! How are you?",
    expectedBehavior: "Should respond with a friendly greeting",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = response.length > 10 && /hello|hi|hey|greetings|how can/i.test(response);
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Responds to greetings appropriately" : "Response does not contain greeting",
        evidence: response.slice(0, 200),
      };
    },
  },
  {
    id: "FUNC-002",
    name: "Informational question",
    category: "functional",
    prompt: "What is the capital of France?",
    expectedBehavior: "Should return factual answer",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = /paris/i.test(response);
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "Correctly identifies Paris as capital" : "Failed to identify Paris as capital",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Follow-up Questions ──────────────────────────────────────────────────
  {
    id: "FUNC-003",
    name: "Follow-up question with context",
    category: "functional",
    prompt: "What is the population of France?",
    history: [
      { role: "user", content: "What is the capital of France?" },
      { role: "assistant", content: "The capital of France is Paris." },
    ],
    expectedBehavior: "Should understand the context and answer about France",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = /\d/.test(response) && /france/i.test(response);
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Provides population data for France" : "Response missing population data",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Multi-turn Conversation ──────────────────────────────────────────────
  {
    id: "FUNC-004",
    name: "Three-turn conversation flow",
    category: "functional",
    prompt: "Can you recommend a book?",
    history: [
      { role: "user", content: "I like science fiction" },
      { role: "assistant", content: "Great! Sci-fi is a wonderful genre. Do you prefer hard sci-fi or space opera?" },
      { role: "user", content: "Hard sci-fi please" },
      { role: "assistant", content: "Here are some excellent hard sci-fi books: 'The Martian' by Andy Weir, 'Blindsight' by Peter Watts, and 'Rendezvous with Rama' by Arthur C. Clarke." },
    ],
    expectedBehavior: "Should recommend a book consistent with sci-fi preferences",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = response.length > 50 && /book|novel|author|sci.f/i.test(response);
      return {
        pass,
        score: pass ? 100 : 20,
        details: pass ? "Provides book recommendation" : "Failed to recommend a book",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── File Uploads ─────────────────────────────────────────────────────────
  {
    id: "FUNC-005",
    name: "Image/file context handling",
    category: "functional",
    prompt: "Analyze this data and tell me what trends you see",
    files: ["exports increase by 15% in Q1, 22% in Q2, 18% in Q3, 25% in Q4"],
    expectedBehavior: "Should reference the provided data",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = /export|increase|trend|q1|q2|q3|q4|15|22|18|25/i.test(response);
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "References attached data" : "Did not reference attached file content",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Code Generation ──────────────────────────────────────────────────────
  {
    id: "FUNC-006",
    name: "Simple code generation",
    category: "functional",
    prompt: "Write a JavaScript function that checks if a string is a palindrome",
    expectedBehavior: "Should output valid JavaScript code",
    weight: 1,
    validationFn: async (response: string) => {
      const hasCodeBlock = /```(?:javascript|js)?/i.test(response);
      const hasFunction = /\bfunction\b|\bconst\b.*=>|function palindrome/i.test(response);
      const pass = hasCodeBlock && hasFunction;
      return {
        pass,
        score: pass ? 100 : hasFunction ? 50 : 20,
        details: pass ? "Generates valid JavaScript code" : "Code generation incomplete",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Summarization ────────────────────────────────────────────────────────
  {
    id: "FUNC-007",
    name: "Text summarization",
    category: "functional",
    prompt: `Summarize this in 2-3 sentences: 
The Industrial Revolution was a period of major industrialization and innovation 
that took place during the late 1700s and early 1800s. It began in Great Britain 
and spread throughout the world. The steam engine, invented by James Watt, was 
one of the most important inventions of this era. It transformed manufacturing, 
transportation, and daily life.`,
    expectedBehavior: "Should produce a concise summary",
    weight: 1,
    validationFn: async (response: string) => {
      const sentenceCount = (response.match(/\./g) || []).length;
      const pass = sentenceCount >= 1 && sentenceCount <= 5 && response.length < 500;
      return {
        pass,
        score: pass ? 100 : 40,
        details: pass ? `Summary is ${response.length} chars with ${sentenceCount} sentences` : "Summary too long or too short",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Translation ──────────────────────────────────────────────────────────
  {
    id: "FUNC-008",
    name: "Translation task",
    category: "functional",
    prompt: "Translate 'Good morning, how are you today?' to Spanish",
    expectedBehavior: "Should translate correctly",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = /buenos días|buen día|buenas/i.test(response);
      return {
        pass,
        score: pass ? 100 : 20,
        details: pass ? "Translates to Spanish correctly" : "Translation not in Spanish",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Mathematical Reasoning ───────────────────────────────────────────────
  {
    id: "FUNC-009",
    name: "Basic arithmetic",
    category: "functional",
    prompt: "What is 15 * 7 + 23?",
    expectedBehavior: "Should compute correctly (128)",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = /128/.test(response);
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "Correctly computes 15*7+23 = 128" : "Incorrect arithmetic result",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Empty/Edge Prompts ───────────────────────────────────────────────────
  {
    id: "FUNC-010",
    name: "Empty prompt handling",
    category: "functional",
    prompt: "",
    expectedBehavior: "Should return error or request input",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = response.length === 0;
      return {
        pass,
        score: pass ? 100 : 50,
        details: pass ? "Correctly rejects empty prompt" : "Responded to empty prompt",
        evidence: response.slice(0, 200),
      };
    },
  },
  {
    id: "FUNC-011",
    name: "Very long prompt handling",
    category: "functional",
    prompt: "Write a detailed analysis of " + "A".repeat(10000),
    expectedBehavior: "Should handle long input without crashing",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = response.length > 50;
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? `Handled 10K+ char prompt, responded with ${response.length} chars` : "Failed on long prompt",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Special Characters ──────────────────────────────────────────────────
  {
    id: "FUNC-012",
    name: "Special characters in prompt",
    category: "functional",
    prompt: "What does this mean: @#$%^&*()?",
    expectedBehavior: "Should handle gracefully",
    weight: 1,
    validationFn: async (response: string) => {
      const pass = response.length > 10 && !response.includes("Internal Server Error");
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "Handles special characters" : "Failed on special characters",
        evidence: response.slice(0, 200),
      };
    },
  },
];
