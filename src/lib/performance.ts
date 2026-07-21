/**
 * Performance Monitoring Middleware
 * 
 * Tracks request metrics, response times, and error rates
 * for observability and optimization.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger, generateRequestId, extractRequestId } from "./logger";

// In-memory metrics store (resets on restart)
const metrics = {
  requests: 0,
  errors: 0,
  totalLatencyMs: 0,
  byEndpoint: new Map<string, { count: number; totalMs: number; errors: number }>(),
  byStatus: new Map<number, number>(),
  startTime: Date.now(),
};

export interface RequestMetrics {
  requestId: string;
  method: string;
  pathname: string;
  startTime: number;
  userId?: string;
}

// Start tracking a request
export function startRequestTracking(req: NextRequest): RequestMetrics {
  const requestId = extractRequestId(req.headers);
  const startTime = Date.now();
  
  return {
    requestId,
    method: req.method,
    pathname: req.nextUrl.pathname,
    startTime,
  };
}

// End tracking and log metrics
export function endRequestTracking(
  tracking: RequestMetrics,
  response: NextResponse | Response,
  error?: Error
): void {
  const latencyMs = Date.now() - tracking.startTime;
  const status = response.status || 500;

  // Update global metrics
  metrics.requests++;
  metrics.totalLatencyMs += latencyMs;
  
  if (status >= 400 || error) {
    metrics.errors++;
  }

  // Update status counts
  metrics.byStatus.set(status, (metrics.byStatus.get(status) || 0) + 1);

  // Update endpoint metrics (group dynamic routes)
  const endpoint = normalizeEndpoint(tracking.pathname);
  const endpointMetrics = metrics.byEndpoint.get(endpoint) || { count: 0, totalMs: 0, errors: 0 };
  endpointMetrics.count++;
  endpointMetrics.totalMs += latencyMs;
  if (status >= 400 || error) endpointMetrics.errors++;
  metrics.byEndpoint.set(endpoint, endpointMetrics);

  // Log slow requests (> 1 second)
  if (latencyMs > 1000) {
    logger.warn("Slow request", {
      requestId: tracking.requestId,
      method: tracking.method,
      pathname: tracking.pathname,
      latencyMs,
      status,
    });
  }

  // Log errors
  if (error) {
    logger.error("Request error", {
      requestId: tracking.requestId,
      method: tracking.method,
      pathname: tracking.pathname,
      latencyMs,
      error: error.message,
    });
  }
}

// Normalize endpoint for grouping (e.g., /api/users/123 → /api/users/:id)
function normalizeEndpoint(pathname: string): string {
  return pathname
    .replace(/\/[0-9a-f]{24}/g, "/:id") // MongoDB ObjectId
    .replace(/\/\d+/g, "/:id") // Numeric IDs
    .replace(/\/[a-f0-9-]{36}/g, "/:uuid"); // UUIDs
}

// Get current metrics snapshot
export function getMetrics() {
  const uptimeMs = Date.now() - metrics.startTime;
  const avgLatency = metrics.requests > 0 
    ? Math.round(metrics.totalLatencyMs / metrics.requests)
    : 0;

  return {
    uptime: Math.floor(uptimeMs / 1000),
    requests: metrics.requests,
    errors: metrics.errors,
    errorRate: metrics.requests > 0 
      ? `${((metrics.errors / metrics.requests) * 100).toFixed(2)}%`
      : "0%",
    avgLatencyMs: avgLatency,
    endpoints: Array.from(metrics.byEndpoint.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([path, data]) => ({
        path,
        count: data.count,
        avgMs: Math.round(data.totalMs / data.count),
        errors: data.errors,
      })),
    statusCodes: Object.fromEntries(metrics.byStatus),
  };
}

// Reset metrics (for testing or periodic reset)
export function resetMetrics() {
  metrics.requests = 0;
  metrics.errors = 0;
  metrics.totalLatencyMs = 0;
  metrics.byEndpoint.clear();
  metrics.byStatus.clear();
  metrics.startTime = Date.now();
}
