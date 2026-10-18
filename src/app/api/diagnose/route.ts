import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { keyPool } from "@/lib/api-manager";
import { getTokenFromCookies, verifyAccessToken, isAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function testKey(provider: string, key: string, url: string, model: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with only: ok" }],
        max_tokens: 5,
      }),
    });
    clearTimeout(timeout);
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, error: res.ok ? undefined : text.slice(0, 200) };
  } catch (e: any) {
    return { ok: false, error: e.message?.slice(0, 100) };
  }
}

export async function GET(req: NextRequest) {
  // SECURITY: This endpoint probes live provider keys and infrastructure.
  // It must never be public. Require an authenticated admin session.
  const tokens = getTokenFromCookies(req);
  const payload = tokens.access ? verifyAccessToken(tokens.access) : null;
  if (!payload || !isAdminUser({ role: payload.role })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Record<string, any> = {};

  const configs: Record<string, { url: string; model: string; envVar: string }> = {
    groq: { url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile", envVar: "GROQ_KEYS" },
    openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", model: "google/gemini-2.5-flash", envVar: "OPENROUTER_KEYS" },
    mistral: { url: "https://api.mistral.ai/v1/chat/completions", model: "mistral-small-latest", envVar: "MISTRAL_API_KEY" },
  };

  for (const [name, cfg] of Object.entries(configs)) {
    const count = keyPool.keyCount(name as any);
    if (count === 0) {
      results[name] = { status: "no_keys", envVar: cfg.envVar, message: `Set ${cfg.envVar} in Render env vars` };
      continue;
    }

    // Test the first key
    const key = (keyPool as any).keys[name]?.[0];
    if (!key) {
      results[name] = { status: "no_keys" };
      continue;
    }

    const test = await testKey(name, key, cfg.url, cfg.model);
    results[name] = {
      status: test.ok ? "working" : "broken",
      keyCount: count,
      testStatus: test.status,
      error: test.error,
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    platform: process.env.RENDER ? "render" : process.env.VERCEL ? "vercel" : "local",
    providers: results,
    fix: "If a provider shows 'broken', update its env var in Render Dashboard → Service → Environment",
  });
}
