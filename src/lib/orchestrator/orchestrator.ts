// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — AI ORCHESTRATOR
// The brain: plans tasks, selects tools/agents/models, executes workflow
// ══════════════════════════════════════════════════════════════════════

import { TaskPlan, TaskStep, OrchestratorResult, StepResult, OrchestratorContext } from "./types";
import { createTaskPlan } from "./task-planner";
import { toolRegistry, ToolContext } from "../tools/tool-registry";
import { builtinTools } from "../tools/builtin-tools";
import { AGENT_REGISTRY } from "../agent-registry";
import { MODELS, getProviderForModel } from "../models";
import { fetchAI } from "../api-manager";
import { saveMessage } from "../memory";
import crypto from "crypto";

// ── Initialize Tool Registry ─────────────────────────────────────────

let toolsInitialized = false;
function ensureToolsRegistered() {
  if (!toolsInitialized) {
    toolRegistry.registerAll(builtinTools);
    toolsInitialized = true;
  }
}

// ── Orchestrator Configuration ───────────────────────────────────────

interface OrchestratorConfig {
  maxSteps: number;
  maxTokens: number;
  maxDuration: number;
  enableVerification: boolean;
  enableToolExecution: boolean;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxSteps: 10,
  maxTokens: 50000,
  maxDuration: 120000,
  enableVerification: true,
  enableToolExecution: true,
};

// ── Main Orchestrator Class ──────────────────────────────────────────

export class AIOrchestrator {
  private config: OrchestratorConfig;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    ensureToolsRegistered();
  }

  /**
   * Main entry point: analyze a user request and create an execution plan
   */
  async analyze(prompt: string, mode?: string): Promise<TaskPlan> {
    return createTaskPlan(prompt, mode);
  }

  /**
   * Execute a task plan end-to-end
   */
  async execute(
    plan: TaskPlan,
    prompt: string,
    context: OrchestratorContext,
    options: {
      modelId?: string;
      extendedThinking?: boolean;
      onStep?: (step: string, status: string) => void;
      stream?: (text: string) => void;
    } = {}
  ): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    const agentsUsed: string[] = [];
    const toolsUsed: string[] = [];
    const modelsUsed: string[] = [];
    let totalTokens = 0;

    // Use recommended model if none specified
    const modelId = options.modelId || plan.modelRecommendation || "mistral-medium-latest";
    modelsUsed.push(modelId);

    // Build tool context
    const toolContext: ToolContext = {
      userId: context.userId,
      projectId: context.projectId,
      conversationId: context.conversationId,
      plan: context.plan,
      modelId,
    };

    // Execute each step (respecting dependencies)
    const completedSteps = new Set<string>();
    const sortedSteps = this.topologicalSort(plan.steps);

    for (const step of sortedSteps) {
      // Check if dependencies are met
      if (step.dependsOn) {
        const depsMet = step.dependsOn.every(dep => completedSteps.has(dep));
        if (!depsMet) {
          if (!step.optional) {
            stepResults.push({
              stepId: step.id,
              success: false,
              error: "Dependencies not met",
              duration: 0,
              tokensUsed: 0,
            });
          }
          continue;
        }
      }

      // Check token budget
      if (totalTokens >= this.config.maxTokens) {
        stepResults.push({
          stepId: step.id,
          success: false,
          error: "Token budget exceeded",
          duration: 0,
          tokensUsed: 0,
        });
        continue;
      }

      options.onStep?.(step.action, "running");

      try {
        const result = await this.executeStep(step, prompt, context, toolContext, options, stepResults);
        stepResults.push(result);
        completedSteps.add(step.id);
        totalTokens += result.tokensUsed;

        if (result.success) {
          options.onStep?.(step.action, "completed");
        } else {
          options.onStep?.(step.action, "failed");
        }
      } catch (error: any) {
        stepResults.push({
          stepId: step.id,
          success: false,
          error: error.message,
          duration: 0,
          tokensUsed: 0,
        });
        options.onStep?.(step.action, "error");
      }
    }

    // Generate final output
    const finalOutput = await this.compileOutput(plan, stepResults, prompt, context, modelId);
    totalTokens += this.estimateTokens(finalOutput);

    const success = stepResults.filter(s => s.success).length > 0;
    const totalDuration = Date.now() - startTime;

    return {
      plan,
      steps: stepResults,
      success,
      finalOutput,
      totalTokens,
      totalDuration,
      metadata: {
        agentsUsed,
        toolsUsed: [...new Set(toolsUsed)],
        modelsUsed,
      },
    };
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: TaskStep,
    prompt: string,
    context: OrchestratorContext,
    toolContext: ToolContext,
    options: any,
    priorResults: StepResult[] = []
  ): Promise<StepResult> {
    const startTime = Date.now();

    // If step has a tool, execute it
    if (step.tool && this.config.enableToolExecution) {
      const resolvedInput = this.resolveStepInput(step, priorResults);
      const result = await toolRegistry.execute(step.tool, resolvedInput, toolContext);
      return {
        stepId: step.id,
        success: result.success,
        output: result.data,
        error: result.error,
        duration: Date.now() - startTime,
        tokensUsed: result.metadata?.tokensUsed || 0,
      };
    }

    // Otherwise, use LLM to execute the step
    const modelId = step.model || options.modelId || "mistral-medium-latest";
    const provider = getProviderForModel(modelId);
    const url =
      provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : provider === "mistral"
        ? "https://api.mistral.ai/v1/chat/completions"
        : "https://openrouter.ai/api/v1/chat/completions";

    // Thread outputs from completed dependency steps into the LLM context
    const depOutputs = (step.dependsOn || [])
      .map((depId) => priorResults.find((r) => r.stepId === depId))
      .filter((r): r is StepResult => !!r && r.success && r.output != null)
      .map((r) => String(r.output).slice(0, 6000));

    const systemPrompt = `You are executing step: ${step.action}
Context: ${prompt}
${
      depOutputs.length > 0
        ? "Use the RESULTS FROM PREVIOUS STEPS below as your primary source material."
        : ""
    }
Provide a clear, structured response.`;

    const userContent =
      depOutputs.length > 0
        ? `${prompt}

## RESULTS FROM PREVIOUS STEPS
${depOutputs.map((o, i) => `[Step result ${i + 1}]
${o}`).join("\n\n")}`
        : prompt;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];

    try {
      const response = await fetchAI(provider, url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          messages,
          stream: false,
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const tokens = data.usage?.total_tokens || this.estimateTokens(content);

      return {
        stepId: step.id,
        success: true,
        output: content,
        duration: Date.now() - startTime,
        tokensUsed: tokens,
      };
    } catch (error: any) {
      return {
        stepId: step.id,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        tokensUsed: 0,
      };
    }
  }

  /**
   * Compile final output from all step results
   */
  private async compileOutput(
    plan: TaskPlan,
    results: StepResult[],
    prompt: string,
    context: OrchestratorContext,
    modelId: string
  ): Promise<string> {
    const successfulResults = results.filter(r => r.success && r.output);
    if (successfulResults.length === 0) {
      return "I wasn't able to complete this task. Please try again or rephrase your request.";
    }

    // For simple tasks, return the single result
    if (plan.steps.length === 1 && successfulResults.length === 1) {
      return String(successfulResults[0].output);
    }

    // For multi-step tasks, compile results
    const provider = getProviderForModel(modelId);
    const url =
      provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : provider === "mistral"
        ? "https://api.mistral.ai/v1/chat/completions"
        : "https://openrouter.ai/api/v1/chat/completions";

    const stepOutputs = successfulResults
      .map((r, i) => `Step ${i + 1}: ${plan.steps.find(s => s.id === r.stepId)?.action}\nResult: ${String(r.output).slice(0, 2000)}`)
      .join("\n\n---\n\n");

    const systemPrompt = `You are compiling results from a multi-step task into a coherent, well-formatted response.
Original request: ${prompt}
Organize the results logically and present them clearly.
Use markdown formatting for readability.`;

    try {
      const response = await fetchAI(provider, url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: stepOutputs },
          ],
          stream: false,
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || stepOutputs;
      }
    } catch (e) {
      console.warn("Failed to compile output, using raw results");
    }

    return stepOutputs;
  }

  /**
   * Resolve {{step:id}} templates in a tool-step's input, substituting the
   * output of completed dependency steps. This is how an LLM-written draft
   * flows into CREATE_PDF, or analysis results flow into CREATE_XLSX.
   */
  private resolveStepInput(step: TaskStep, priorResults: StepResult[]): Record<string, any> {
    const resolveValue = (value: any): any => {
      if (typeof value !== "string") return value;
      return value.replace(/\{\{step:([a-zA-Z0-9_-]+)\}\}/g, (_match, stepId) => {
        const dep = priorResults.find((r) => r.stepId === stepId);
        if (!dep || !dep.success || dep.output == null) {
          throw new Error(`Step "${stepId}" has no successful output to substitute into tool input`);
        }
        // Pass objects (e.g. structured data) through; stringify text
        return typeof dep.output === "string" ? dep.output : JSON.stringify(dep.output);
      });
    };

    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(step.input)) {
      resolved[key] = value != null && typeof value === "object" && !Array.isArray(value)
        ? this.resolveStepInput({ ...step, input: value as Record<string, any> }, priorResults)
        : resolveValue(value);
    }
    return resolved;
  }

  /**
   * Topological sort for steps with dependencies
   */
  private topologicalSort(steps: TaskStep[]): TaskStep[] {
    const sorted: TaskStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (step: TaskStep) => {
      if (visited.has(step.id)) return;
      if (visiting.has(step.id)) return; // Circular dependency
      visiting.add(step.id);

      if (step.dependsOn) {
        for (const depId of step.dependsOn) {
          const depStep = steps.find(s => s.id === depId);
          if (depStep) visit(depStep);
        }
      }

      visiting.delete(step.id);
      visited.add(step.id);
      sorted.push(step);
    };

    for (const step of steps) {
      visit(step);
    }

    return sorted;
  }

  /**
   * Estimate token count from text
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// ── Singleton ────────────────────────────────────────────────────────

export const orchestrator = new AIOrchestrator();

// ── Quick analysis helper ────────────────────────────────────────────

export function analyzeIntent(prompt: string, mode?: string): TaskPlan {
  return createTaskPlan(prompt, mode);
}
