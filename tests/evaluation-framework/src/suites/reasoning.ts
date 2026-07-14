import type { TestCase } from "../types.js";

export const reasoningTests: TestCase[] = [
  // ── Logical Reasoning ────────────────────────────────────────────────────
  {
    id: "REAS-001",
    name: "Syllogistic reasoning",
    category: "reasoning",
    prompt: `All humans are mortal. Socrates is human. 
Therefore, what can we conclude about Socrates?`,
    expectedBehavior: "Should correctly apply syllogism",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = /mortal|will die|dies/i.test(response);
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "Correctly applies syllogistic reasoning" : "Failed syllogism",
        evidence: response.slice(0, 200),
      };
    },
  },
  {
    id: "REAS-002",
    name: "Logical contradiction detection",
    category: "reasoning",
    prompt: `Is the following statement logically consistent? 
"This statement is false." Explain your reasoning.`,
    expectedBehavior: "Should identify the liar paradox",
    weight: 3,
    validationFn: async (response: string) => {
      const pass = /paradox|contradiction|self.referen|inconsistent|logically impossible|circular/i.test(response);
      return {
        pass,
        score: pass ? 100 : 20,
        details: pass ? "Correctly identifies liar paradox" : "Did not identify the paradox",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Step-by-Step Reasoning ───────────────────────────────────────────────
  {
    id: "REAS-003",
    name: "Multi-step arithmetic with explanation",
    category: "reasoning",
    prompt: `A store has a 20% discount on all items. 
If a shirt originally costs $45 and there is an additional 10% off 
the discounted price, what is the final price? Show your work.`,
    expectedBehavior: "Should calculate $32.40 step by step",
    weight: 3,
    validationFn: async (response: string) => {
      const hasStepByStep = /step|first|then|next|finally|calculate/i.test(response);
      const correctAnswer = /32\.40|32\.4|\$32/i.test(response);
      const pass = hasStepByStep && correctAnswer;
      return {
        pass,
        score: pass ? 100 : correctAnswer ? 60 : hasStepByStep ? 30 : 0,
        details: pass ? "Correct step-by-step calculation" : `Missing: steps=${hasStepByStep}, answer=${correctAnswer}`,
        evidence: response.slice(0, 300),
      };
    },
  },
  // ── Problem Decomposition ────────────────────────────────────────────────
  {
    id: "REAS-004",
    name: "Complex problem decomposition",
    category: "reasoning",
    prompt: `Plan a birthday party for 30 people with a budget of $500. 
Break down the costs and explain your planning process.`,
    expectedBehavior: "Should decompose into sub-problems",
    weight: 2,
    validationFn: async (response: string) => {
      const hasBudget = /\$|budget|cost|price|spend/i.test(response);
      const hasItems = /food|decor|venue|cake|drink|invitation|activity|supplies/i.test(response);
      const structured = /\d+\.|\-|•|\*|first|second|third/i.test(response);
      const pass = hasBudget && hasItems && structured;
      return {
        pass,
        score: pass ? 100 : ((hasBudget ? 1 : 0) + (hasItems ? 1 : 0) + (structured ? 1 : 0)) / 3 * 100,
        details: pass ? "Well-structured plan with budget breakdown" : `Missing: budget=${hasBudget}, items=${hasItems}, structure=${structured}`,
        evidence: response.slice(0, 300),
      };
    },
  },
  // ── Edge Cases ───────────────────────────────────────────────────────────
  {
    id: "REAS-005",
    name: "Temporal reasoning",
    category: "reasoning",
    prompt: `If I leave my house at 8:45 AM and my appointment is 
at 9:30 AM, but I need to be there 15 minutes early to check in, 
and the drive takes 25 minutes, will I make it on time?`,
    expectedBehavior: "Should calculate arrival at 9:10, check-in by 9:15, on time",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = /yes|make it|on time|9:10|9:1[0-5]/i.test(response);
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Correct temporal reasoning" : "Incorrect time calculation",
        evidence: response.slice(0, 200),
      };
    },
  },
  {
    id: "REAS-006",
    name: "Probabilistic reasoning",
    category: "reasoning",
    prompt: `If you flip a fair coin 3 times, what is the probability 
of getting exactly 2 heads? Explain your reasoning.`,
    expectedBehavior: "Should calculate 3/8 or 0.375",
    weight: 2,
    validationFn: async (response: string) => {
      const hasReasoning = /possible outcomes|combinations|HH|HT|TH/i.test(response);
      const correctProb = /3\/8|0\.375|37\.5|three.eighths/i.test(response);
      const pass = hasReasoning && correctProb;
      return {
        pass,
        score: pass ? 100 : correctProb ? 70 : hasReasoning ? 30 : 0,
        details: pass ? "Correct probability with reasoning" : `Missing: reasoning=${hasReasoning}, correct=${correctProb}`,
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Multi-Step Planning ──────────────────────────────────────────────────
  {
    id: "REAS-007",
    name: "Project planning with constraints",
    category: "reasoning",
    prompt: `You need to build a web app in 1 week with: user auth, 
a dashboard, and a payment system. You have 2 developers. 
Create a day-by-day plan.`,
    expectedBehavior: "Should create structured timeline",
    weight: 2,
    validationFn: async (response: string) => {
      const hasDays = /day \d|day 1|day 2|day 3|monday|tuesday|wednesday|thursday|friday/i.test(response);
      const hasTasks = /auth|dashboard|payment|backend|frontend|api|database|test|deploy/i.test(response);
      const pass = hasDays && hasTasks;
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Detailed project plan with timeline" : `Missing: days=${hasDays}, tasks=${hasTasks}`,
        evidence: response.slice(0, 300),
      };
    },
  },
  // ── Counterfactual Reasoning ─────────────────────────────────────────────
  {
    id: "REAS-008",
    name: "Counterfactual thinking",
    category: "reasoning",
    prompt: `If the internet had been invented in the 1800s, 
how would history have been different? Give 2 specific examples.`,
    expectedBehavior: "Should provide plausible counterfactuals",
    weight: 2,
    validationFn: async (response: string) => {
      const examples = (response.match(/\d\.|\-|•|first|second|example/i) || []).length;
      const pass = examples >= 2;
      return {
        pass,
        score: pass ? 100 : Math.round(examples / 2 * 100),
        details: pass ? "Provides multiple specific counterfactual examples" : `Only ${examples} example(s)`,
        evidence: response.slice(0, 200),
      };
    },
  },
];
