import type { TestCase } from "../types.js";

export const memoryTests: TestCase[] = [
  {
    id: "MEM-001",
    name: "Remembers user name across turns",
    category: "conversation",
    prompt: "What is my name?",
    history: [
      { role: "user", content: "Hi, my name is Sarah" },
      { role: "assistant", content: "Nice to meet you, Sarah! How can I help you today?" },
    ],
    expectedBehavior: "Should remember the user's name",
    weight: 3,
    validationFn: async (response: string) => {
      const pass = /\bSarah\b/i.test(response);
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "Correctly remembers user name" : "Failed to remember user name from history",
        evidence: response.slice(0, 200),
      };
    },
  },
  {
    id: "MEM-002",
    name: "Remembers topic across turns",
    category: "conversation",
    prompt: "Can you elaborate on that third point?",
    history: [
      { role: "user", content: "What are the three main benefits of cloud computing?" },
      { role: "assistant", content: "The three main benefits are:\n1. Cost efficiency - pay only for what you use\n2. Scalability - easily scale resources up or down\n3. Accessibility - access from anywhere with internet" },
    ],
    expectedBehavior: "Should know what 'third point' refers to",
    weight: 3,
    validationFn: async (response: string) => {
      const pass = /accessibility|access|internet|anywhere|third|point 3/i.test(response);
      return {
        pass,
        score: pass ? 100 : 20,
        details: pass ? "Correctly identifies third point as accessibility" : "Failed to identify the third point reference",
        evidence: response.slice(0, 200),
      };
    },
  },
  {
    id: "MEM-003",
    name: "Remembers project context across turns",
    category: "conversation",
    prompt: "Remind me, what tech stack did I choose?",
    history: [
      { role: "user", content: "I'm deciding between React + Node.js or Django + PostgreSQL for my project" },
      { role: "assistant", content: "Both are great choices! React + Node.js is excellent for real-time applications, while Django + PostgreSQL is great for data-heavy apps." },
      { role: "user", content: "I'll go with React + Node.js" },
      { role: "assistant", content: "Excellent choice! React + Node.js will give you a modern, scalable stack." },
    ],
    expectedBehavior: "Should remember the chosen stack",
    weight: 3,
    validationFn: async (response: string) => {
      const pass = /react|node/i.test(response);
      return {
        pass,
        score: pass ? 100 : 0,
        details: pass ? "Correctly remembers React + Node.js stack choice" : "Failed to remember technology stack",
        evidence: response.slice(0, 200),
      };
    },
  },
  {
    id: "MEM-004",
    name: "Long conversation context retention",
    category: "conversation",
    prompt: "What was my original question?",
    history: [
      { role: "user", content: "I want to learn web development" },
      { role: "assistant", content: "Great! Web development is a valuable skill. Where would you like to start?" },
      { role: "user", content: "Frontend, I think" },
      { role: "assistant", content: "Frontend is a great choice! I recommend starting with HTML, CSS, and JavaScript." },
      { role: "user", content: "How long will it take to learn?" },
      { role: "assistant", content: "With consistent practice, you can learn the basics in 3-6 months." },
      { role: "user", content: "What resources do you recommend?" },
      { role: "assistant", content: "I recommend freeCodeCamp, MDN Web Docs, and The Odin Project." },
    ],
    expectedBehavior: "Should remember the original intent to learn web development",
    weight: 3,
    validationFn: async (response: string) => {
      const pass = /web development|learn web|web dev/i.test(response);
      return {
        pass,
        score: pass ? 100 : 20,
        details: pass ? "Retains context from earlier in conversation" : "Lost track of initial conversation topic",
        evidence: response.slice(0, 200),
      };
    },
  },
];
