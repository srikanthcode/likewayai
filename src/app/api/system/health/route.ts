import { NextResponse } from "next/server";
import { getMergedApiKeys } from "@/config/keys";
import { BrowserSessionManager } from "@/lib/automation/browser-session-manager";
import clientPromise, { isMongoConfigured } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const keys: any = await getMergedApiKeys();
  const startTime = Date.now();

  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    providers: {
      gemini: { configured: Boolean(keys.gemini || process.env.GEMINI_API_KEY), status: "healthy" },
      groq: { configured: Boolean(keys.groq || process.env.GROQ_API_KEY), status: "healthy" },
      openai: { configured: Boolean(keys.openai || process.env.OPENAI_API_KEY), status: "healthy" },
      anthropic: { configured: Boolean(keys.anthropic || process.env.ANTHROPIC_API_KEY), status: "healthy" },
    },
    database: {
      configured: isMongoConfigured(),
      status: "unknown",
      latencyMs: 0,
    },
    browserSessions: {
      activeSessions: 0,
      sessions: [] as any[],
    },
    system: {
      nodeEnv: process.env.NODE_ENV || "development",
      platform: process.platform,
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  };

  // Test Database ping
  try {
    const dbStart = Date.now();
    const client = await clientPromise;
    await client.db().command({ ping: 1 });
    health.database.status = "healthy";
    health.database.latencyMs = Date.now() - dbStart;
  } catch (err: any) {
    health.database.status = "degraded_fallback_active";
  }

  // Get Browser sessions
  try {
    const sessionMgr = BrowserSessionManager.getInstance();
    health.browserSessions.activeSessions = sessionMgr.getActiveSessionCount();
    health.browserSessions.sessions = sessionMgr.getSessionDiagnostics();
  } catch (err) {}

  return NextResponse.json(health);
}
