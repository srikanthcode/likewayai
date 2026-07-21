import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb";
import { keyPool } from "@/lib/api-manager";
import { validateEnv } from "@/lib/env-validate";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkKey = (val: string | undefined) => {
    if (!val || val.trim() === "") return "MISSING";
    return "SET";
  };

  const startTime = Date.now();

  // ── Environment Validation ────────────────────────────────────────────
  const envResult = validateEnv();

  // ── MongoDB Check ──────────────────────────────────────────────────────
  let mongoStatus = "not_configured";
  let mongoLatency = 0;
  let mongoCollections = 0;
  if (isMongoConfigured()) {
    try {
      const mongoStart = Date.now();
      const clientPromise = (await import("@/lib/mongodb")).default;
      const client = await Promise.race([
        clientPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      mongoLatency = Date.now() - mongoStart;
      await client.db("admin").command({ ping: 1 });
      mongoStatus = "healthy";
      
      // Count collections for diagnostics
      const db = client.db(process.env.MONGODB_DB_NAME || "likeway_ai");
      const collections = await db.listCollections().toArray();
      mongoCollections = collections.length;
    } catch (err: any) {
      mongoStatus = `unhealthy: ${err.message?.slice(0, 50) || "connection failed"}`;
    }
  }

  // ── AI Provider Key Pools ──────────────────────────────────────────────
  const aiProviders: Record<string, string> = {};
  const providers = ["mistral", "groq", "openrouter"] as const;
  let anyProviderConfigured = false;
  let totalKeys = 0;
  for (const p of providers) {
    const count = keyPool.keyCount(p as any);
    aiProviders[p] = count > 0 ? `${count} key(s) configured` : "no keys";
    if (count > 0) anyProviderConfigured = true;
    totalKeys += count;
  }

  // ── Memory Usage ───────────────────────────────────────────────────────
  const memUsage = process.memoryUsage();
  const memoryMb = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024),
  };

  // ── Event Loop Lag ─────────────────────────────────────────────────────
  const eventLoopLag = await new Promise<number>((resolve) => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1e6;
      resolve(Math.round(lag * 100) / 100);
    });
  });

  // ── Determine Overall Status ───────────────────────────────────────────
  const mongoHealthy = mongoStatus === "healthy" || mongoStatus === "not_configured";
  const aiHealthy = anyProviderConfigured;
  const envHealthy = envResult.valid;
  const memoryHealthy = memoryMb.heapUsed < 500; // Alert if > 500MB
  const eventLoopHealthy = eventLoopLag < 100; // Alert if > 100ms lag

  const overallStatus = (!mongoHealthy || !aiHealthy || !envHealthy || !memoryHealthy || !eventLoopHealthy)
    ? "degraded"
    : "ok";

  const totalLatency = Date.now() - startTime;

  const health = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    platform: process.env.VERCEL ? "vercel" : process.env.RENDER ? "render" : "local",
    latency: `${totalLatency}ms`,
    dependencies: {
      mongodb: {
        status: mongoStatus,
        latency: mongoLatency ? `${mongoLatency}ms` : "0ms",
        collections: mongoCollections,
      },
      aiProviders: {
        status: aiHealthy ? "healthy" : "no_keys_configured",
        totalKeys,
        details: aiProviders,
      },
      envValidation: {
        status: envHealthy ? "passed" : `${envResult.errors.length} issue(s)`,
        errors: envResult.errors.length > 0 ? envResult.errors : undefined,
        warnings: envResult.warnings.length > 0 ? envResult.warnings : undefined,
      },
      memory: {
        status: memoryHealthy ? "healthy" : "high_usage",
        heapUsed: `${memoryMb.heapUsed}MB`,
        heapTotal: `${memoryMb.heapTotal}MB`,
        rss: `${memoryMb.rss}MB`,
        external: `${memoryMb.external}MB`,
      },
      eventLoop: {
        status: eventLoopHealthy ? "healthy" : "high_lag",
        lagMs: eventLoopLag,
      },
      browserAutomation: {
        status: process.env.VERCEL ? "proxy_to_render" : "direct",
        note: process.env.VERCEL ? "Uses Render backend" : "Direct browser launch",
      },
    },
    apiKeys: {
      MISTRAL_API_KEY: checkKey(process.env.MISTRAL_API_KEY),
      GROQ_KEYS: checkKey(process.env.GROQ_KEYS),
      OPENROUTER_KEYS: checkKey(process.env.OPENROUTER_KEYS),
      JWT_SECRET: checkKey(process.env.JWT_SECRET),
      MONGODB_URI: checkKey(process.env.MONGODB_URI),
      NEXT_PUBLIC_APP_URL: checkKey(process.env.NEXT_PUBLIC_APP_URL),
      TAVILY_API_KEY: checkKey(process.env.TAVILY_API_KEY),
      RESEND_API_KEY: checkKey(process.env.RESEND_API_KEY),
      STRIPE_SECRET_KEY: checkKey(process.env.STRIPE_SECRET_KEY),
      RAZORPAY_KEY_ID: checkKey(process.env.RAZORPAY_KEY_ID),
    },
    version: "1.0.0",
    build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
  };

  // Return 503 if unhealthy
  const statusCode = overallStatus === "ok" ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
