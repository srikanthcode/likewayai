/**
 * Structured Logging System for LikeWay AI
 * 
 * Provides consistent, machine-readable logs with request tracking,
 * performance metrics, and error context.
 */

// ═══════════════════════════════════════════════════════════════════════════
// LOG LEVELS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST ID TRACKING
// ═══════════════════════════════════════════════════════════════════════════

let requestIdCounter = 0;

export function generateRequestId(): string {
  return `req_${Date.now()}_${++requestIdCounter}`;
}

export function extractRequestId(headers: Headers): string {
  return headers.get("x-request-id") || generateRequestId();
}

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURED LOG FORMAT
// ═══════════════════════════════════════════════════════════════════════════

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  duration?: number;
  error?: string;
  stack?: string;
  [key: string]: any;
}

function formatLogEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    // JSON format for production (easier to parse by log aggregators)
    return JSON.stringify(entry);
  }
  
  // Human-readable format for development
  const parts = [
    entry.timestamp,
    `[${entry.level.toUpperCase()}]`,
    entry.requestId ? `[${entry.requestId}]` : "",
    entry.message,
  ];
  
  if (entry.userId) parts.push(`user=${entry.userId}`);
  if (entry.duration !== undefined) parts.push(`${entry.duration}ms`);
  if (entry.error) parts.push(`error=${entry.error}`);
  
  return parts.filter(Boolean).join(" ");
}

function log(level: LogLevel, message: string, meta: Record<string, any> = {}): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const formatted = formatLogEntry(entry);

  switch (level) {
    case "debug":
      console.debug(formatted);
      break;
    case "info":
      console.log(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
    case "fatal":
      console.error(formatted);
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC LOGGER API
// ═══════════════════════════════════════════════════════════════════════════

export const logger = {
  debug: (message: string, meta?: Record<string, any>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, any>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, any>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, any>) => log("error", message, meta),
  fatal: (message: string, meta?: Record<string, any>) => log("fatal", message, meta),

  // Request-scoped logger
  request: (requestId: string, userId?: string) => ({
    info: (message: string, meta?: Record<string, any>) => 
      log("info", message, { requestId, userId, ...meta }),
    warn: (message: string, meta?: Record<string, any>) => 
      log("warn", message, { requestId, userId, ...meta }),
    error: (message: string, meta?: Record<string, any>) => 
      log("error", message, { requestId, userId, ...meta }),
  }),

  // Performance timer
  timer: (operation: string, requestId?: string) => {
    const start = Date.now();
    return {
      end: (meta?: Record<string, any>) => {
        const duration = Date.now() - start;
        log("info", `${operation} completed`, { 
          requestId, 
          duration, 
          ...meta 
        });
        return duration;
      },
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// AI LATENCY MONITORING
// ═══════════════════════════════════════════════════════════════════════════

export interface AiMetrics {
  provider: string;
  model: string;
  latencyMs: number;
  tokensUsed?: number;
  success: boolean;
  error?: string;
}

const aiMetricsBuffer: AiMetrics[] = [];
const METRICS_FLUSH_INTERVAL = 60000; // Flush every minute

export function recordAiMetric(metric: AiMetrics): void {
  aiMetricsBuffer.push(metric);
  
  if (aiMetricsBuffer.length >= 100) {
    flushAiMetrics();
  }
}

async function flushAiMetrics(): Promise<void> {
  if (aiMetricsBuffer.length === 0) return;
  
  const metrics = [...aiMetricsBuffer];
  aiMetricsBuffer.length = 0;
  
  // Calculate aggregate stats
  const byProvider = new Map<string, { count: number; totalLatency: number; errors: number }>();
  
  for (const m of metrics) {
    const existing = byProvider.get(m.provider) || { count: 0, totalLatency: 0, errors: 0 };
    existing.count++;
    existing.totalLatency += m.latencyMs;
    if (!m.success) existing.errors++;
    byProvider.set(m.provider, existing);
  }
  
  for (const [provider, stats] of byProvider) {
    log("info", `AI Provider: ${provider}`, {
      requests: stats.count,
      avgLatencyMs: Math.round(stats.totalLatency / stats.count),
      errorRate: `${((stats.errors / stats.count) * 100).toFixed(1)}%`,
    });
  }
}

// Flush metrics periodically
if (typeof setInterval !== "undefined") {
  setInterval(flushAiMetrics, METRICS_FLUSH_INTERVAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CONTEXT HELPER
// ═══════════════════════════════════════════════════════════════════════════

export function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    };
  }
  return { message: String(error) };
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK LOGGING
// ═══════════════════════════════════════════════════════════════════════════

export interface HealthCheckResult {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs: number;
  details?: Record<string, any>;
  error?: string;
}

export function logHealthCheck(result: HealthCheckResult): void {
  const level = result.status === "healthy" ? "info" : 
                result.status === "degraded" ? "warn" : "error";
  
  log(level, `Health check: ${result.service} — ${result.status}`, {
    latencyMs: result.latencyMs,
    ...result.details,
    error: result.error,
  });
}
