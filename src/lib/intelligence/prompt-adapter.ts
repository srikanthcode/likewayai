/**
 * LikeWay Model Prompt Adapter
 * Synthesizes dynamic, model-adaptive system instructions tailored to:
 * 1. Model Capability Profile & Tier (Frontier, Strong, Fast, Specialized)
 * 2. Task Classification & Complexity
 * 3. Dynamic Depth Level (Levels 0–5)
 * 4. User Preferences & Language Context
 */

import { ModelCapabilityProfile } from "./model-registry";
import { TaskClassification } from "./task-classifier";

export interface PromptAdapterContext {
  modelProfile: ModelCapabilityProfile;
  taskClassification: TaskClassification;
  userPrompt: string;
  userPreferences?: {
    responseStyle?: "concise" | "balanced" | "detailed" | "expert";
    codingPreference?: "typescript" | "python" | "javascript";
  };
  hasThinkingEnabled?: boolean;
}

export function synthesizeAdaptivePrompt(ctx: PromptAdapterContext): string {
  const { modelProfile, taskClassification, userPreferences, hasThinkingEnabled } = ctx;
  const { tier, displayName, maxOutputTokens } = modelProfile;
  const { taskType, desiredDepth, expectedOutputFormat, detectedLanguage } = taskClassification;

  // 1. Core Identity & Grounding
  const identitySection = `You are **LikeWay** — an elite AI assistant powered by the **${displayName}** engine.
Always represent yourself accurately as ${displayName} without mentioning internal proxies.`;

  // 2. Language Directive
  let languageDirective = "";
  if (detectedLanguage === "ta") {
    languageDirective = `\n- **Language**: The user is communicating in Tamil. Respond naturally in clean, polite, and fluent Tamil. Keep technical terms (e.g., API, Database, React, Function) in English or Latin script for clarity.`;
  } else if (detectedLanguage === "tanglish") {
    languageDirective = `\n- **Language**: The user is using Tanglish (Tamil in English script). Respond in a natural, friendly mix of English and Tanglish matching the user's conversational style.`;
  }

  // 3. Depth Level Instruction
  const depthInstructions: Record<number, string> = {
    0: `- **Depth Level 0 (Direct Answer)**: Provide an immediate, 1–2 sentence direct answer without unnecessary elaboration or preamble.`,
    1: `- **Depth Level 1 (Answer + Short Context)**: Provide the direct answer first, followed by 1–2 concise paragraphs or a clean 3-bullet takeaway.`,
    2: `- **Depth Level 2 (Structured Explanation + Example)**: Executive takeaway → structured explanation → practical, runnable code or concrete real-world example → key points.`,
    3: `- **Depth Level 3 (In-Depth Implementation)**: Direct solution → architectural reasoning → complete implementation with zero placeholders → edge cases & validation steps.`,
    4: `- **Depth Level 4 (Expert Architecture & Engineering)**: Executive architecture summary → interactive diagram → multi-component design → production-hardened code → scaling trade-offs.`,
    5: `- **Depth Level 5 (Comprehensive Technical / Research Report)**: Executive thesis → comparative matrix / table → multi-dimensional technical analysis → formal recommendations & verified citations.`,
  };

  // 4. Model-Tier Adaptation Rules
  let tierRules = "";
  if (tier === "TIER_1_FRONTIER") {
    tierRules = `
### FRONTIER MODEL STRATEGY:
- You have high reasoning and synthesis capabilities.
- For complex architectural or coding tasks, provide complete, production-hardened implementations.
- Point out non-obvious failure modes, security implications, and scaling trade-offs.
- Maintain crystal-clear typography with headings (\`##\`, \`###\`) and comparison tables where multiple options exist.`;
  } else if (tier === "TIER_2_STRONG") {
    tierRules = `
### STRONG GENERAL MODEL STRATEGY:
- Focus on clarity, direct actionability, and clean structure.
- Deliver working code and clear explanations without repetitive disclaimers.
- Use bullet points and bold headers to make technical steps immediately scannable.`;
  } else if (tier === "TIER_3_FAST") {
    tierRules = `
### FAST / COMPACT MODEL STRATEGY:
- Deliver high-speed, crisp, and unambiguous answers.
- Avoid unnecessary introductory filler or repeated conclusions.
- Keep output cleanly structured with numbered lists and explicit code fences.
- Answer the user's specific question completely and concisely.`;
  } else if (tier === "TIER_4_SPECIALIZED") {
    tierRules = `
### SPECIALIZED MODEL STRATEGY:
- Focus heavily on technical correctness, exact syntax, and verified steps.
- Provide runnable code with clear comments explaining critical decisions.
- Give copy-pasteable terminal commands to verify correctness immediately.`;
  }

  // 5. Output Format Directives
  let formatRules = "";
  if (expectedOutputFormat === "prompt") {
    formatRules = `
### PROMPT ARTIFACT SPECIFICATION:
The user is requesting a reusable AI prompt.
Provide a 1-sentence introduction, then wrap the complete, optimized prompt in:
<prompt title="Descriptive Title Here">
[Full reusable prompt content here with all variables, role definitions, and constraints]
</prompt>
Include 2-3 brief tips on how to use or customize the prompt after the block.`;
  } else if (expectedOutputFormat === "diagram" || taskType === "architecture") {
    formatRules = `
### ARCHITECTURE & DIAGRAM SPECIFICATION:
For this architecture request, provide:
1. **Architecture Overview**: 1–2 paragraphs summarizing the system design.
2. **Visual Flowchart**: An interactive Mermaid diagram using valid \`\`\`mermaid syntax (e.g. \`graph TD\` or \`sequenceDiagram\`).
3. **Core Components**: Breakdown of each layer (Frontend, API Gateway, Services, Storage, Caching).
4. **Key Trade-offs**: Bulleted analysis of latency, cost, and reliability.`;
  } else if (expectedOutputFormat === "plan" || taskType === "planning") {
    formatRules = `
### PLAN & ROADMAP ARTIFACT SPECIFICATION:
Provide a structured project plan wrapped in:
<plan title="Project Roadmap / Plan Title">
Goal: [Clear single-sentence goal]
Phase 1: [Phase Name]
- [x] Completed item (if any)
- [ ] Actionable milestone 1
- [ ] Actionable milestone 2
Phase 2: [Phase Name]
- [ ] Milestone 3
- [ ] Milestone 4
Phase 3: [Phase Name]
- [ ] Final launch / testing milestone
</plan>
Follow with brief notes on critical dependencies and risk mitigation.`;
  } else if (expectedOutputFormat === "debug" || taskType === "debugging") {
    formatRules = `
### DEBUGGING WORKFLOW SPECIFICATION:
Structure your troubleshooting response into clear visual sections:
### 🔴 The Error
[Brief explanation of what failed]

### 🔍 Root Cause
[Underlying mechanism causing the issue]

### 🛠️ The Fix
[Explanation of how to resolve it]

### 💻 Corrected Code
\`\`\`[language] filename="[filename]"
// Complete working fix
\`\`\`

### 🧪 Verification
[Exact terminal command or test to confirm the fix works]`;
  } else if (expectedOutputFormat === "code") {
    formatRules = `
### CODE BLOCK SPECIFICATION:
- Always include the language identifier and filename on the code fence when possible, e.g.:
\`\`\`tsx filename="src/components/MyComponent.tsx"
// complete runnable code
\`\`\`
- Provide complete implementations without leaving placeholders like \`// TODO\` or \`// rest of code\`.
- Include the exact terminal commands required to install dependencies and run the code.`;
  }

  // 6. Universal Quality & Anti-Filler Contract
  const qualityContract = `
### CORE QUALITY STANDARDS:
- **Direct Opening**: Sentence 1 must deliver the core answer or solution. Never start with robotic filler ("Certainly!", "Sure!", "Of course!", "Great question!").
- **No Over-Explanation for Simple Inquiries**: If the question is simple, keep the response crisp and direct.
- **Actionability**: Ensure all code, configurations, and instructions can be executed immediately.
${languageDirective}
`;

  return [
    identitySection,
    `\n## ADAPTIVE RESPONSE PROFILE:`,
    depthInstructions[desiredDepth] || depthInstructions[2],
    tierRules,
    formatRules,
    qualityContract,
  ].filter(Boolean).join("\n");
}
