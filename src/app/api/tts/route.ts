import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity, unauthorizedResponse } from "@/lib/request-auth";
import { consumeEntitlement, entitlementDenied, resolveEffectivePlan } from "@/lib/entitlements";
import { synthesizeSpeech, getTtsCapabilities } from "@/lib/tts-provider";

export const maxDuration = 30;

/** Cap per request: short phrases keep time-to-first-audio low and cost bounded. */
const MAX_TTS_CHARS = 600;

/**
 * GET — report which speech providers are configured (no secrets).
 */
export async function GET() {
  const caps = getTtsCapabilities();
  return NextResponse.json({
    available: caps.primary.configured || caps.secondary.configured,
    providers: caps,
  });
}

/**
 * POST — synthesize one short phrase and return base64 audio.
 * If every provider fails the response asks the client to fall back to the
 * browser's built-in speech synthesis rather than showing a hard error.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = getRequestIdentity(req);
    if (!identity) return unauthorizedResponse();

    const body = await req.json().catch(() => ({}));
    const { text, voice } = body as { text?: unknown; voice?: unknown };

    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // Neural TTS is a paid, metered capability.
    const plan = await resolveEffectivePlan(identity.userId!, identity.plan, identity.role);
    const entitlement = await consumeEntitlement(identity.userId!, plan, "realtime_voice", identity.role);
    if (!entitlement.allowed) {
      return NextResponse.json(entitlementDenied(entitlement), { status: 402 });
    }

    const phrase = text.trim().slice(0, MAX_TTS_CHARS);
    const voiceName = typeof voice === "string" && /^[a-zA-Z0-9_-]{1,32}$/.test(voice)
      ? voice
      : "alloy";

    const result = await synthesizeSpeech(phrase, voiceName);

    if (!result.ok || !result.audio) {
      console.warn("[TTS] All providers failed:", result.error);
      return NextResponse.json(
        {
          error: "Neural voice is temporarily unavailable.",
          fallback: "browser",
          remaining: entitlement.remaining,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      audioBase64: result.audio.toString("base64"),
      mimeType: result.mimeType,
      provider: result.provider,
      voice: voiceName,
      remaining: entitlement.remaining,
    });
  } catch (error: any) {
    console.error("[TTS] Error:", error);
    return NextResponse.json(
      { error: "Voice synthesis failed.", fallback: "browser" },
      { status: 500 }
    );
  }
}
