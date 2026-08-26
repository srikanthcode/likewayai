import type { ChatRequest, ChatResponse, Message } from "./types.js";
333333333
export class ApiClient {
  private url: string;
  private defaultModel: string;
  private defaultUserId: string;

  constructor(url: string, defaultModel: string) {
    this.url = url;
    this.defaultModel = defaultModel;
    this.defaultUserId = `eval-user-${Date.now()}`;
  }

  async sendMessage(
    prompt: string,
    options?: {
      modelId?: string;
      history?: Message[];
      files?: string[];
      mode?: string;
      plan?: string;
      extendedThinking?: boolean;
      userId?: string;
      conversationId?: string;
    }
  ): Promise<ChatResponse> {
    const startTime = performance.now();

    const body: ChatRequest = {
      prompt,
      modelId: options?.modelId || this.defaultModel,
      history: options?.history,
      files: options?.files,
      mode: (options?.mode as any) || "General",
      plan: (options?.plan as any) || "Pro",
      extendedThinking: options?.extendedThinking || false,
      userId: options?.userId || this.defaultUserId,
      conversationId: options?.conversationId,
    };

    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": body.userId! },
        body: JSON.stringify(body),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        const errText = await response.text().catch(() => "Unknown error");
        return {
          content: "",
          latencyMs,
          success: false,
          error: errText,
          statusCode: response.status,
        };
      }

      // Read the streaming SSE response
      const contentType = response.headers.get("content-type") || "";
      let content = "";

      if (contentType.includes("text/event-stream")) {
        content = await this.parseStream(response);
      } else {
        const json = await response.json();
        content = typeof json === "string" ? json : JSON.stringify(json);
      }

      return {
        content,
        latencyMs,
        success: true,
        statusCode: response.status,
      };
    } catch (error: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        content: "",
        latencyMs,
        success: false,
        error: error.message || "Network error",
      };
    }
  }

  private async parseStream(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) return "";

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
            try {
              const parsed = JSON.parse(line.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content || "";
              fullContent += delta;
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  async fetchHistory(userId: string, conversationId?: string): Promise<Message[]> {
    const params = new URLSearchParams();
    if (conversationId) params.set("conversationId", conversationId);

    const url = this.url.replace("/chat", `/chat?${params.toString()}`);
    try {
      const res = await fetch(url, {
        headers: { "x-user-id": userId },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  getUserId(): string {
    return this.defaultUserId;
  }
}
