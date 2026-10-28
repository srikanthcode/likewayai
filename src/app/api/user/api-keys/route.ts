import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "likeway_ai";

/**
 * Providers a user may store a personal key for. The provider name is used as
 * a MongoDB field path, so it must be an exact value from a fixed list —
 * otherwise `provider: "x.y"` (or `__proto__`) writes to arbitrary document
 * paths.
 */
const ALLOWED_PROVIDERS = new Set([
  "openrouter",
  "groq",
  "mistral",
  "together",
  "deepseek",
  "google",
  "openai",
  "anthropic",
]);

async function getDb() {
  const client = await clientPromise;
  return client.db(MONGODB_DB_NAME);
}

function getUserEmail(req: NextRequest): string | null {
  const tokens = getTokenFromCookies(req);
  if (!tokens.access) return null;
  const payload = verifyAccessToken(tokens.access);
  return (payload?.email as string) || null;
}

/** Never return a stored secret to the browser — only last-4 for recognition. */
function maskKey(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  try {
    const email = getUserEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const raw = (user.apiKeys || {}) as Record<string, unknown>;
    const keys: Record<string, { masked: string; configured: true }> = {};
    for (const [provider, value] of Object.entries(raw)) {
      const masked = maskKey(value);
      if (masked) keys[provider] = { masked, configured: true };
    }

    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const email = getUserEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider, key } = await req.json();

    if (typeof provider !== "string" || !ALLOWED_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }
    if (typeof key !== "string" || key.trim().length < 8 || key.length > 512) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("users").updateOne(
      { email },
      { $set: { [`apiKeys.${provider}`]: key.trim() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, provider, masked: maskKey(key.trim()) });
  } catch (error: any) {
    console.error("Error saving API key:", error);
    return NextResponse.json({ error: "Failed to save API key" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const email = getUserEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider } = await req.json();

    if (typeof provider !== "string" || !ALLOWED_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("users").updateOne(
      { email },
      { $unset: { [`apiKeys.${provider}`]: "" } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting API key:", error);
    return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
  }
}
