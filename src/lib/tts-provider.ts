// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — TEXT-TO-SPEECH PROVIDERS
//
// Two OpenAI-compatible providers, tried in order:
//
//   1. TTS_BASE_URL (default https://speech.ai.unturf.com/v1) — exposes
//      /audio/speech with model `tts-1-f5` (see /models on that host).
//   2. Gemini native TTS (GEMINI_API_KEY), used when the first fails.
//
// Both return raw audio. If neither is configured/available the caller gets
// a `fallback: "browser"` signal so the client can use speechSynthesis
// instead of showing an error.
// ══════════════════════════════════════════════════════════════════════

const DEFAULT_TTS_BASE_URL = "https://speech.ai.unturf.com/v1";
const DEFAULT_TTS_MODEL = "tts-1-f5";

export interface TtsResult {
  ok: boolean;
  /** Raw audio bytes when ok. */
  audio?: Buffer;
  mimeType?: string;
  provider?: "openai-compatible" | "gemini";
  error?: string;
  /** True when the client should fall back to browser speech synthesis. */
  fallbackToBrowser?: boolean;
}

function ttsBaseUrl(): string {
  return (process.env.TTS_BASE_URL || DEFAULT_TTS_BASE_URL).replace(/\/+$/, "");
}

function ttsModel(): string {
  return process.env.TTS_MODEL || DEFAULT_TTS_MODEL;
}

/** OpenAI-compatible /audio/speech endpoint. */
async function synthesizeOpenAICompatible(text: string, voice: string): Promise<TtsResult> {
  const url = `${ttsBaseUrl()}/audio/speech`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // The endpoint is keyless by default; send a key only when one is configured.
  if (process.env.TTS_API_KEY) {
    headers.Authorization = `Bearer ${process.env.TTS_API_KEY}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: ttsModel(),
        input: text,
        voice,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err: any) {
    return { ok: false, error: `TTS request failed: ${err?.message || "network error"}` };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, error: `TTS provider returned ${res.status}: ${detail.slice(0, 160)}` };
  }

  const arrayBuffer = await res.arrayBuffer();
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return { ok: false, error: "TTS provider returned empty audio" };
  }

  const contentType = res.headers.get("content-type") || "audio/mpeg";
  return {
    ok: true,
    audio: Buffer.from(arrayBuffer),
    mimeType: contentType.split(";")[0] || "audio/mpeg",
    provider: "openai-compatible",
  };
}

/** Gemini native TTS (kept as a secondary provider). */
async function synthesizeGemini(text: string, voiceName: string): Promise<TtsResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY is not configured" };

  const model = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err: any) {
    return { ok: false, error: `Gemini TTS failed: ${err?.message || "network error"}` };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, error: `Gemini TTS returned ${res.status}: ${detail.slice(0, 160)}` };
  }

  const data = await res.json().catch(() => null);
  const inline = data?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData)?.inlineData;
  if (!inline?.data) {
    return { ok: false, error: "Gemini TTS returned no audio" };
  }

  return {
    ok: true,
    audio: Buffer.from(inline.data, "base64"),
    mimeType: inline.mimeType || "audio/L16;codec=pcm;rate=24000",
    provider: "gemini",
  };
}

/**
 * Synthesize speech, trying each configured provider in order.
 * `text` is capped by the caller; this function assumes it is already short.
 */
export async function synthesizeSpeech(text: string, voice = "alloy"): Promise<TtsResult> {
  const errors: string[] = [];

  const primary = await synthesizeOpenAICompatible(text, voice);
  if (primary.ok) return primary;
  errors.push(primary.error || "primary TTS failed");

  const secondary = await synthesizeGemini(text, process.env.TTS_VOICE || "Kore");
  if (secondary.ok) return secondary;
  errors.push(secondary.error || "secondary TTS failed");

  return {
    ok: false,
    error: errors.join("; "),
    fallbackToBrowser: true,
  };
}

/** Which providers are configured, for the health/UI capability display. */
export function getTtsCapabilities(): {
  primary: { configured: boolean; baseUrl: string; model: string };
  secondary: { configured: boolean };
} {
  return {
    primary: {
      configured: true, // keyless by default
      baseUrl: ttsBaseUrl(),
      model: ttsModel(),
    },
    secondary: { configured: Boolean(process.env.GEMINI_API_KEY) },
  };
}
