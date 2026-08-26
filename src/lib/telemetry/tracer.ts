import crypto from "crypto";

export interface TraceSpan {
  traceId: string;
  spanId: string;
  name: string;
  startTime: number;
  tags: Record<string, string | number | boolean>;
}

export class TelemetryTracer {
  static createTraceId(): string {
    return `tr_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
  }

  static createSpan(name: string, traceId?: string, tags: Record<string, any> = {}): TraceSpan {
    return {
      traceId: traceId || this.createTraceId(),
      spanId: `sp_${crypto.randomBytes(3).toString("hex")}`,
      name,
      startTime: Date.now(),
      tags,
    };
  }

  static endSpan(span: TraceSpan, extraTags: Record<string, any> = {}): {
    traceId: string;
    spanId: string;
    name: string;
    durationMs: number;
    tags: Record<string, any>;
  } {
    const durationMs = Date.now() - span.startTime;
    const combinedTags = { ...span.tags, ...extraTags };

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Trace] [${span.traceId}] ${span.name} took ${durationMs}ms`, combinedTags);
    }

    return {
      traceId: span.traceId,
      spanId: span.spanId,
      name: span.name,
      durationMs,
      tags: combinedTags,
    };
  }

  static sanitize(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;
    const sanitized: Record<string, any> = Array.isArray(obj) ? [] : {};
    const SENSITIVE_KEYS = ["password", "token", "key", "secret", "authorization", "cookie", "jwt", "cvv", "card"];

    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.some((sk) => k.toLowerCase().includes(sk))) {
        sanitized[k] = "[REDACTED]";
      } else if (typeof v === "object" && v !== null) {
        sanitized[k] = this.sanitize(v);
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }
}
