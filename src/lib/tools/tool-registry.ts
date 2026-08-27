import { AppError } from "../errors/error-types";
import { getVerifiedLatestInfo } from "../browsing";

export type ToolCategory = "browser" | "web" | "apps" | "payment" | "system" | "documents" | "sandbox" | "data" | "code";
export type ToolRiskLevel = "low" | "medium" | "high";
export type ToolPermission = "read" | "write" | "execute" | "admin" | "network";

export interface ToolParameterSchema {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  enum?: string[];
  default?: any;
}

export type ToolSchema = Record<string, any>;

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  result?: T;
  error?: string;
  metadata?: any;
  durationMs?: number;
}

export interface ToolContext {
  userId?: string;
  sessionId?: string;
  traceId?: string;
  [key: string]: any;
}

export interface ToolDefinition<TParams = any, TResult = any> {
  name: string;
  category?: ToolCategory;
  description: string;
  riskLevel?: ToolRiskLevel;
  requiresConfirmation?: boolean;
  parameters?: Record<string, ToolParameterSchema> | ToolSchema;
  timeoutMs?: number;
  permissions?: ToolPermission[];
  executor?: (params: TParams, context?: ToolContext) => Promise<TResult>;
  execute?: (params: TParams, context?: ToolContext) => Promise<ToolResult<TResult>>;
  validator?: (params: TParams) => { valid: boolean; error?: string };
}

export type Tool = ToolDefinition;

export function createTool(def: any, execute?: (params: any, context?: any) => Promise<ToolResult>): Tool {
  if (execute) {
    return {
      ...def,
      execute,
    };
  }
  return def;
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, ToolDefinition> = new Map();

  private constructor() {
    this.registerBuiltInTools();
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public registerAll(tools: ToolDefinition[]): void {
    tools.forEach((t) => this.register(t));
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public getAll(): ToolDefinition[] {
    return this.getAllTools();
  }

  public getToolsByCategory(category: ToolCategory): ToolDefinition[] {
    return this.getAllTools().filter((t) => t.category === category);
  }

  public getToolDescriptions(): Array<{
    name: string;
    description: string;
    parameters: any;
    riskLevel?: ToolRiskLevel;
    requiresConfirmation?: boolean;
  }> {
    return this.getAllTools().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters || {},
      riskLevel: t.riskLevel,
      requiresConfirmation: t.requiresConfirmation,
    }));
  }

  public async execute(name: string, params: any, context?: ToolContext): Promise<ToolResult> {
    return this.executeTool(name, params, context);
  }

  public async executeTool(name: string, params: any, context?: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const tool = this.getTool(name);

    if (!tool) {
      return {
        success: false,
        error: `Tool "${name}" is not registered in the Tool Registry.`,
        durationMs: Date.now() - startTime,
      };
    }

    // 1. Parameter Validation if defined
    if (tool.parameters && typeof tool.parameters === "object") {
      for (const [paramName, schema] of Object.entries(tool.parameters as Record<string, ToolParameterSchema>)) {
        if (schema?.required && (params[paramName] === undefined || params[paramName] === null || params[paramName] === "")) {
          return {
            success: false,
            error: `Missing required parameter "${paramName}" for tool "${name}".`,
            durationMs: Date.now() - startTime,
          };
        }
      }
    }

    if (tool.validator) {
      const validation = tool.validator(params);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || `Parameter validation failed for tool "${name}".`,
          durationMs: Date.now() - startTime,
        };
      }
    }

    // 2. Timeout protected execution
    const timeoutMs = tool.timeoutMs || 30000;
    try {
      const execFunc = tool.execute || (tool.executor ? async (p: any, c?: any) => ({ success: true, data: await tool.executor!(p, c) }) : undefined);

      if (!execFunc) {
        throw new Error(`Tool "${name}" does not have an execute or executor method`);
      }

      const execPromise = execFunc(params, context);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new AppError({ category: "TIMEOUT_ERROR", message: `Tool "${name}" execution timed out after ${timeoutMs}ms` })), timeoutMs)
      );

      const rawResult: any = await Promise.race([execPromise, timeoutPromise]);
      const resData = rawResult?.data !== undefined ? rawResult.data : rawResult?.result !== undefined ? rawResult.result : rawResult;

      return {
        success: rawResult?.success ?? true,
        data: resData,
        result: resData,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }

  private registerBuiltInTools(): void {
    // ── Web Tools ─────────────────────────────────────────────────────────────
    this.register({
      name: "web.search",
      category: "web",
      description: "Search the live web in real time for verified current facts, news, weather, stock prices, or events.",
      riskLevel: "low",
      requiresConfirmation: false,
      timeoutMs: 15000,
      parameters: {
        query: { type: "string", required: true, description: "The search query" },
      },
      executor: async ({ query }: any) => {
        const searchResult = await getVerifiedLatestInfo(query);
        return {
          context: searchResult?.context || "",
          verifiedFacts: searchResult?.verifiedFacts || [],
        };
      },
    });

    this.register({
      name: "web.weather",
      category: "web",
      description: "Retrieve real-time weather and temperature for any city or region.",
      riskLevel: "low",
      requiresConfirmation: false,
      timeoutMs: 10000,
      parameters: {
        location: { type: "string", required: true, description: "City or location name" },
      },
      executor: async ({ location }: any) => {
        const res = await getVerifiedLatestInfo(`weather in ${location} current temperature forecast`);
        return {
          location,
          weatherInfo: res?.context || `Weather data for ${location}`,
        };
      },
    });

    // ── App Navigation Tools ──────────────────────────────────────────────────
    this.register({
      name: "apps.open",
      category: "apps",
      description: "Open popular web applications and services directly (e.g. WhatsApp, YouTube, Google, Amazon, Instagram, Twitter/X, Spotify, Netflix, Gmail, GitHub).",
      riskLevel: "low",
      requiresConfirmation: false,
      parameters: {
        appName: { type: "string", required: true, description: "The name of the app or website" },
        targetUrl: { type: "string", required: false, description: "Direct target URL if known" },
      },
      executor: async ({ appName, targetUrl }: any) => {
        const KNOWN_MAP: Record<string, string> = {
          whatsapp: "https://web.whatsapp.com",
          youtube: "https://www.youtube.com",
          google: "https://www.google.com",
          amazon: "https://www.amazon.in",
          flipkart: "https://www.flipkart.com",
          instagram: "https://www.instagram.com",
          facebook: "https://www.facebook.com",
          twitter: "https://x.com",
          x: "https://x.com",
          spotify: "https://open.spotify.com",
          netflix: "https://www.netflix.com",
          github: "https://github.com",
          reddit: "https://www.reddit.com",
          linkedin: "https://www.linkedin.com",
          gmail: "https://mail.google.com",
          chatgpt: "https://chatgpt.com",
          maps: "https://maps.google.com",
        };

        const key = appName.toLowerCase().trim();
        const resolvedUrl = targetUrl || KNOWN_MAP[key] || `https://www.google.com/search?q=${encodeURIComponent(appName)}`;
        return {
          appName,
          targetUrl: resolvedUrl,
          message: `Opening ${appName} for you now.`,
          action: "client_open_window",
        };
      },
    });

    // ── Browser Automation Tools ──────────────────────────────────────────────
    this.register({
      name: "browser.navigate",
      category: "browser",
      description: "Navigate autonomous browser to a specific URL and extract structured page content.",
      riskLevel: "medium",
      requiresConfirmation: false,
      timeoutMs: 45000,
      parameters: {
        url: { type: "string", required: true, description: "Target URL to navigate to" },
        goal: { type: "string", required: false, description: "Goal or extraction instructions" },
      },
      executor: async ({ url, goal }: any) => {
        const apiBase = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const agentUrl = `${apiBase}/api/browser-agent`;

        const res = await fetch(agentUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: goal || `Navigate to ${url} and summarize page contents`,
            startUrl: url,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Browser navigation failed: ${errText.slice(0, 100)}`);
        }

        const data = await res.json();
        return {
          url,
          answer: data.answer || "Navigation completed",
          lastScreenshot: data.lastScreenshot,
        };
      },
    });

    // ── High Risk Action with Explicit Confirmation ───────────────────────────
    this.register({
      name: "payment.create",
      category: "payment",
      description: "Initiate subscription plan upgrade or payment order.",
      riskLevel: "high",
      requiresConfirmation: true,
      parameters: {
        plan: { type: "string", required: true, enum: ["core", "pro"], description: "Plan type" },
        amount: { type: "number", required: true, description: "Payment amount in INR" },
      },
      executor: async ({ plan, amount }: any) => {
        return {
          plan,
          amount,
          status: "pending_user_confirmation",
          confirmationMessage: `Are you sure you want to upgrade to the ${plan.toUpperCase()} plan for ₹${amount}?`,
        };
      },
    });
  }
}

export const toolRegistry = ToolRegistry.getInstance();
