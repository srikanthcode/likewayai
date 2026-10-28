import { NextRequest, NextResponse } from "next/server";
import { BrowserSessionManager } from "@/lib/automation/browser-session-manager";
import clientPromise, { isMongoConfigured } from "@/lib/mongodb";
import { getRequestIdentity, isAdmin } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

/**
 * Minimal liveness/readiness probe. Public callers get status only — the
 * detailed provider, session and platform diagnostics are operator data and
 * are served to admins only.
 */
export async function GET(req: NextRequest) {
  const summary: Record<string, any> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: { configured: isMongoConfigured(), status: "unknown" },
  };

  try {
    const dbStart = Date.now();
    const client = await clientPromise;
    await client.db().command({ ping: 1 });
    summary.database.status = "healthy";
    summary.database.latencyMs = Date.now() - dbStart;
  } catch {
    summary.database.status = "unavailable";
    summary.status = "degraded";
  }

  const identity = getRequestIdentity(req);
  if (!isAdmin(identity)) {
    return NextResponse.json(summary);
  }

  // ── Operator detail (admin only) ──────────────────────────────────────
  let activeSessions = 0;
  let sessions: any[] = [];
  try {
    const sessionMgr = BrowserSessionManager.getInstance();
    activeSessions = sessionMgr.getActiveSessionCount();
    sessions = sessionMgr.getSessionDiagnostics();
  } catch {}

  return NextResponse.json({
    ...summary,
    uptime: process.uptime(),
    browserSessions: { activeSessions, sessions },
    system: {
      nodeEnv: process.env.NODE_ENV || "development",
      platform: process.platform,
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  });
}
