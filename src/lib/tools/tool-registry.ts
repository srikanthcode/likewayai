// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — UNIVERSAL TOOL SYSTEM
// Standardized tool interface for dynamic discovery and execution
// ══════════════════════════════════════════════════════════════════════

import { z } from "zod";

// ── Tool Types ───────────────────────────────────────────────────────

export type ToolCategory =
  | "search"
  | "browser"
  | "code"
  | "document"
  | "data"
  | "image"
  | "communication"
  | "file"
  | "api"
  | "system";

export type ToolPermission =
  | "read"
  | "write"
  | "execute"
  | "network"
  | "filesystem"
  | "browser"
  | "email"
  | "calendar";

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  default?: any;
  enum?: string[];
}

export interface ToolSchema {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  permissions: ToolPermission[];
  cost: {
    tokens: number;       // Estimated token cost
    credits: number;      // Platform credit cost
    money: number;        // Real money cost (USD)
  };
  timeout: number;        // Max execution time in ms
  retryable: boolean;
  examples: string[];
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration: number;
    tokensUsed: number;
    sources?: string[];
    [key: string]: any;
  };
}

export interface Tool {
  schema: ToolSchema;
  execute: (params: Record<string, any>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  userId: string;
  projectId: string;
  conversationId?: string;
  plan: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
}

// ── Tool Registry ────────────────────────────────────────────────────

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private schemas: Map<string, ToolSchema> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.schema.name, tool);
    this.schemas.set(tool.schema.name, tool.schema);
  }

  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getSchema(name: string): ToolSchema | undefined {
    return this.schemas.get(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getAllSchemas(): ToolSchema[] {
    return Array.from(this.schemas.values());
  }

  getByCategory(category: ToolCategory): Tool[] {
    return this.getAll().filter(t => t.schema.category === category);
  }

  getByPermission(permission: ToolPermission): Tool[] {
    return this.getAll().filter(t => t.schema.permissions.includes(permission));
  }

  search(query: string): Tool[] {
    const q = query.toLowerCase();
    return this.getAll().filter(t =>
      t.schema.name.toLowerCase().includes(q) ||
      t.schema.description.toLowerCase().includes(q) ||
      t.schema.category.toLowerCase().includes(q)
    );
  }

  /** Get tool schemas formatted for OpenAI function calling */
  toFunctionSchemas(tools?: string[]): any[] {
    const targetTools = tools
      ? tools.map(name => this.schemas.get(name)).filter((s): s is ToolSchema => !!s)
      : this.getAllSchemas();

    return targetTools.map(schema => ({
      type: "function",
      function: {
        name: schema.name,
        description: schema.description,
        parameters: {
          type: "object",
          properties: Object.fromEntries(
            schema.parameters.map(p => [
              p.name,
              {
                type: p.type,
                description: p.description,
                ...(p.enum ? { enum: p.enum } : {}),
                ...(p.default !== undefined ? { default: p.default } : {}),
              },
            ])
          ),
          required: schema.parameters.filter(p => p.required).map(p => p.name),
        },
      },
    }));
  }

  /** Execute a tool by name with params */
  async execute(
    name: string,
    params: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool "${name}" not found` };
    }

    // Check plan access
    if (tool.schema.cost.credits > 0 && context.plan === "Core") {
      return {
        success: false,
        error: `Tool "${name}" requires a paid plan. Upgrade to use this tool.`,
      };
    }

    const startTime = Date.now();
    try {
      const result = await Promise.race([
        tool.execute(params, context),
        new Promise<ToolResult>((_, reject) =>
          setTimeout(() => reject(new Error("Tool timeout")), tool.schema.timeout)
        ),
      ]);

      return {
        ...result,
        metadata: {
          tokensUsed: 0,
          ...result.metadata,
          duration: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Tool execution failed",
        metadata: { duration: Date.now() - startTime, tokensUsed: 0 },
      };
    }
  }
}

// ── Singleton Export ─────────────────────────────────────────────────

export const toolRegistry = new ToolRegistry();

// ── Helper: Create a tool from schema + execute function ─────────────

export function createTool(
  schema: ToolSchema,
  execute: (params: Record<string, any>, context: ToolContext) => Promise<ToolResult>
): Tool {
  return { schema, execute };
}
