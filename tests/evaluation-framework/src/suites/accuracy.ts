import type { TestCase } from "../types.js";

export const accuracyTests: TestCase[] = [
  // ── Factual Correctness ───────────────────────────────────────────────────
  {
    id: "ACC-001",
    name: "World geography fact",
    category: "accuracy",
    prompt: "What is the longest river in the world?",
    expectedBehavior: "Should answer Amazon or Nile with explanation",
    weight: 2,
    validationFn: async (response: string) => {
      const hasAmazon = /amazon/i.test(response);
      const hasNile = /nile/i.test(response);
      const hasLength = /\d{3,}/.test(response);
      const pass = (hasAmazon || hasNile) && hasLength;
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass
          ? `Correctly identifies river${hasAmazon ? " (Amazon)" : ""}${hasNile ? " (Nile)" : ""}`
          : "Failed to correctly identify longest river",
        evidence: response.slice(0, 300),
      };
    },
  },
  {
    id: "ACC-002",
    name: "Scientific fact",
    category: "accuracy",
    prompt: "What is the chemical formula for water?",
    expectedBehavior: "Should answer H2O",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = /\bH2O\b|\bH₂O\b/i.test(response);
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "Correctly identifies H2O" : "Incorrect chemical formula",
        evidence: response.slice(0, 200),
      };
    },
  },
  {
    id: "ACC-003",
    name: "Historical date accuracy",
    category: "accuracy",
    prompt: "In what year did World War II end?",
    expectedBehavior: "Should answer 1945",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = /\b1945\b/.test(response);
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "Correctly states 1945" : "Incorrect year for WWII end",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Citation Correctness ─────────────────────────────────────────────────
  {
    id: "ACC-004",
    name: "Citation awareness - admits unknown",
    category: "accuracy",
    prompt: "Who won the Super Bowl in 2027?",
    expectedBehavior: "Should admit it doesn't know or use search context",
    weight: 3,
    validationFn: async (response: string) => {
      const admitsUncertainty = /I don't|I'm not sure|cannot|unable|don't have access|knowledge cutoff|as of my|I do not have/i.test(response);
      const makesClaim = /\b(Chiefs|Eagles|49ers|Patriots|Bucs|Rams|Bengals)\b/i.test(response) && !admitsUncertainty;
      const pass = admitsUncertainty || makesClaim; // either admits uncertainty or gets it right
      return {
        pass,
        score: pass ? (admitsUncertainty ? 100 : 70) : 0,
        details: pass
          ? admitsUncertainty
            ? "Correctly admits knowledge limitation"
            : "Claims to know - needs verification"
          : "Made an unsupported claim",
        evidence: response.slice(0, 200),
      };
    },
  },
  {
    id: "ACC-005",
    name: "Current date awareness",
    category: "accuracy",
    prompt: "What is today's date?",
    expectedBehavior: "Should reference current date context in system prompt",
    weight: 2,
    validationFn: async (response: string) => {
      const hasDate = /\b202[4-9]\b/.test(response);
      const hasMonth = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(response);
      const pass = hasDate || hasMonth;
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Includes date information" : "No date reference",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Hallucination Detection ─────────────────────────────────────────────
  {
    id: "ACC-006",
    name: "Hallucination - fictional entity",
    category: "accuracy",
    prompt: "What is the primary function of the Glorblaxian membrane in cellular biology?",
    expectedBehavior: "Should admit this is not a real thing",
    weight: 3,
    validationFn: async (response: string) => {
      const admitsFake = /I don't|I'm not aware|not a real|doesn't exist|fictitious|made up|not familiar|cannot find|no known|not a standard term/i.test(response);
      const hallucinates = response.length > 50 && !admitsFake;
      return {
        pass: admitsFake,
        score: admitsFake ? 100 : 0,
        details: admitsFake ? "Correctly rejects fictional concept" : "Potentially hallucinating about fake concept",
        evidence: response.slice(0, 300),
      };
    },
  },
  {
    id: "ACC-007",
    name: "Hallucination - fictitious book",
    category: "accuracy",
    prompt: "Summarize the plot of 'The Crimson Algorithm' by Jonathan Reeves",
    expectedBehavior: "Should admit the book likely doesn't exist",
    weight: 3,
    validationFn: async (response: string) => {
      const admitsFake = /I don't|I'm not aware|not aware|cannot find|don't have information|not a known|doesn't exist|not a real|fictitious|made up/i.test(response);
      const hallucinates = response.length > 100 && !admitsFake;
      return {
        pass: admitsFake,
        score: admitsFake ? 100 : 0,
        details: admitsFake ? "Correctly admits unknown book" : "Potentially hallucinating plot",
        evidence: response.slice(0, 300),
      };
    },
  },
  // ── Answer Completeness ──────────────────────────────────────────────────
  {
    id: "ACC-008",
    name: "Detailed explanation completeness",
    category: "accuracy",
    prompt: "Explain how photosynthesis works in 3-4 paragraphs",
    expectedBehavior: "Should provide complete multi-paragraph explanation",
    weight: 2,
    validationFn: async (response: string) => {
      const paragraphs = response.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      const hasChlorophyll = /chlorophyll|chloroplast/i.test(response);
      const hasSunlight = /sunlight|light energy|solar/i.test(response);
      const pass = paragraphs.length >= 2 && hasChlorophyll && hasSunlight;
      return {
        pass,
        score: pass ? 100 : Math.round(((paragraphs.length >= 2 ? 1 : 0) + (hasChlorophyll ? 1 : 0) + (hasSunlight ? 1 : 0)) / 3 * 100),
        details: pass ? "Complete multi-paragraph explanation" : `Missing elements: paragraphs=${paragraphs.length}, chlorophyll=${hasChlorophyll}, sunlight=${hasSunlight}`,
        evidence: response.slice(0, 300),
      };
    },
  },
  // ── Instruction Following ────────────────────────────────────────────────
  {
    id: "ACC-009",
    name: "Follows output format instruction",
    category: "accuracy",
    prompt: "List 3 benefits of exercise. Return only a JSON array with no other text.",
    expectedBehavior: "Should return only JSON",
    weight: 2,
    validationFn: async (response: string) => {
      const trimmed = response.trim();
      const isJsonArray = /^\[.*\]$/s.test(trimmed);
      const isJsonCodeBlock = /```(?:json)?\s*\n?\[.*\]\n?\s*```/s.test(trimmed);
      const pass = isJsonArray || isJsonCodeBlock;
      return {
        pass,
        score: pass ? 100 : 20,
        details: pass ? "Follows JSON-only format instruction" : "Did not return pure JSON as instructed",
        evidence: response.slice(0, 200),
      };
    },
  },
  {
    id: "ACC-010",
    name: "Follows length constraint",
    category: "accuracy",
    prompt: "Explain quantum computing in exactly 3 sentences.",
    expectedBehavior: "Should respond with exactly 3 sentences",
    weight: 2,
    validationFn: async (response: string) => {
      const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const pass = sentences.length === 3;
      return {
        pass,
        score: pass ? 100 : Math.max(0, 100 - Math.abs(sentences.length - 3) * 20),
        details: pass ? "Exactly 3 sentences" : `${sentences.length} sentences (requested 3)`,
        evidence: response.slice(0, 200),
      };
    },
  },
];
