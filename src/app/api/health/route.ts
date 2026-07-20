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
    } catch (err: any) {
      mongoStatus = `unhealthy: ${err.message?.slice(0, 50) || "connection failed"}`;
    }
  }

  // ── AI Provider Key Pools ──────────────────────────────────────────────
  const aiProviders: Record<string, string> = {};
  const providers = ["mistral", "groq", "openrouter"] as const;
  let anyProviderConfigured = false;
  for (const p of providers) {
    const count = keyPool.keyCount(p as any);
    aiProviders[p] = count > 0 ? `${count} key(s) configured` : "no keys";
    if (count > 0) anyProviderConfigured = true;
  }

  // ── Determine Overall Status ───────────────────────────────────────────
  const allHealthy = mongoStatus === "healthy" || mongoStatus === "not_configured";
  const aiHealthy = anyProviderConfigured;
  const envHealthy = envResult.valid;

  const overallStatus = (!allHealthy || !aiHealthy || !envHealthy)
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
      },
      aiProviders: {
        status: aiHealthy ? "healthy" : "no_keys_configured",
        details: aiProviders,
      },
      envValidation: {
        status: envHealthy ? "passed" : `${envResult.errors.length} issue(s)`,
        errors: envResult.errors.length > 0 ? envResult.errors : undefined,
        warnings: envResult.warnings.length > 0 ? envResult.warnings : undefined,
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
