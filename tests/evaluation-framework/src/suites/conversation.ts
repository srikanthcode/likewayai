import type { TestCase } from "../types.js";

export const conversationTests: TestCase[] = [
  // ── Memory Retention ─────────────────────────────────────────────────────
  {
    id: "CONV-001",
    name: "Remembers user name across turns",
    category: "conversation",
    prompt: "What is my name?",
    history: [
      { role: "user", content: "Hi, my name is Alex" },
      { role: "assistant", content: "Nice to meet you, Alex! How can I help you today?" },
    ],
    expectedBehavior: "Should remember the user's name from history",
    weight: 3,
    validationFn: async (response: string) => {
      const pass = /\bAlex\b/i.test(response);
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "Correctly remembers user name 'Alex' from history" : "Failed to remember user name from conversation history",
        evidence: response.slice(0, 200),
      };
    },
  },
  {
    id: "CONV-002",
    name: "Remembers preferences across turns",
    category: "conversation",
    prompt: "What kind of food do I like?",
    history: [
      { role: "user", content: "I love Italian food, especially pasta and pizza" },
      { role: "assistant", content: "Italian food is great! Pasta and pizza are classic favorites." },
    ],
    expectedBehavior: "Should recall Italian food preference",
    weight: 3,
    validationFn: async (response: string) => {
      const pass = /italian|pasta|pizza/i.test(response);
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "Remembers Italian food preference" : "Failed to recall food preference",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Context Switching ────────────────────────────────────────────────────
  {
    id: "CONV-003",
    name: "Handles topic change gracefully",
    category: "conversation",
    prompt: "Let's switch topics. What's the weather like in Paris right now?",
    history: [
      { role: "user", content: "Can you help me write a Python script?" },
      { role: "assistant", content: "I'd be happy to help you write a Python script! What kind of script do you need?" },
    ],
    expectedBehavior: "Should handle the topic switch without referencing Python",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = /paris|weather|temperature|climate|rain|sunny|cloud/i.test(response);
      return {
        pass,
        score: pass ? 100 : 50,
        details: pass ? "Successfully switches topic from Python to weather" : "Did not fully switch topics",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Follow-up Understanding ──────────────────────────────────────────────
  {
    id: "CONV-004",
    name: "Understands ambiguous follow-up",
    category: "conversation",
    prompt: "Can you give me more details about that?",
    history: [
      { role: "user", content: "Tell me about machine learning" },
      { role: "assistant", content: "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience. Key types include supervised learning, unsupervised learning, and reinforcement learning." },
    ],
    expectedBehavior: "Should elaborate on machine learning",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = /machine learning|supervised|unsupervised|reinforcement|algorithm|model|training|data/i.test(response);
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Correctly elaborates on machine learning" : "Did not reference machine learning context",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Personality Consistency ──────────────────────────────────────────────
  {
    id: "CONV-005",
    name: "Consistent tone across conversation",
    category: "conversation",
    prompt: "Thanks for all your help! You're really knowledgeable.",
    history: [
      { role: "user", content: "What's the capital of Japan?" },
      { role: "assistant", content: "The capital of Japan is Tokyo. It's a fascinating city with a rich history and modern culture!" },
      { role: "user", content: "Tell me more about Tokyo" },
      { role: "assistant", content: "Tokyo is a vibrant metropolis blending tradition and innovation. From the historic Senso-ji temple to the bustling Shibuya crossing, there's so much to explore!" },
    ],
    expectedBehavior: "Should respond graciously",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = /welcome|glad|happy|pleasure|thank|appreciate|you're welcome|anytime|feel free|always here/i.test(response);
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Responds graciously, maintaining helpful personality" : "Did not acknowledge thanks graciously",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Conversation Quality ─────────────────────────────────────────────────
  {
    id: "CONV-006",
    name: "Natural follow-up question",
    category: "conversation",
    prompt: "That's interesting. Can you tell me more about how they work?",
    history: [
      { role: "user", content: "Explain how neural networks work" },
      { role: "assistant", content: "Neural networks are computing systems inspired by biological neural networks. They consist of layers of nodes (neurons) that process and transmit information. Each connection has a weight that adjusts as learning occurs." },
    ],
    expectedBehavior: "Should provide deeper details about neural networks",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = /neuron|layer|weight|activation|backpropagat|gradient|bias|node|input|output|hidden/i.test(response);
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Provides deeper technical details about neural networks" : "Did not elaborate on neural network mechanisms",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Multi-turn Planning ──────────────────────────────────────────────────
  {
    id: "CONV-007",
    name: "Multi-step task coordination",
    category: "conversation",
    prompt: "Let's start the first step.",
    history: [
      { role: "user", content: "I want to build a website. Can you help me plan it?" },
      { role: "assistant", content: "Absolutely! Let's plan your website. First, what's the purpose of your website?" },
      { role: "user", content: "It's a portfolio site to showcase my photography" },
      { role: "assistant", content: "Great! A photography portfolio site. Let me outline the key steps:\n1. Design the layout and user experience\n2. Set up the tech stack\n3. Build the core pages\n4. Add image galleries\n5. Deploy\n\nShall we start with step 1?" },
    ],
    expectedBehavior: "Should know that step 1 is about design/layout",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = /design|layout|wireframe|mockup|gallery|portfolio|photo|plan|step/i.test(response);
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Correctly references planning context" : "Lost context of the multi-step plan",
        evidence: response.slice(0, 200),
      };
    },
  },
  // ── Correction Handling ──────────────────────────────────────────────────
  {
    id: "CONV-008",
    name: "Accepts and incorporates correction",
    category: "conversation",
    prompt: "Actually, I meant React Native, not React. Can you update your advice?",
    history: [
      { role: "user", content: "I'm building a mobile app with React" },
      { role: "assistant", content: "Great choice! React is excellent for building user interfaces. For a mobile app, you'd typically use React Native." },
    ],
    expectedBehavior: "Should acknowledge correction and adjust",
    weight: 2,
    validationFn: async (response: string) => {
      const pass = /react native|mobile|native/i.test(response);
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Correctly incorporates the correction to React Native" : "Did not acknowledge the React Native correction",
        evidence: response.slice(0, 200),
      };
    },
  },
];
