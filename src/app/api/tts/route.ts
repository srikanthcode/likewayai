import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";

export const maxDuration = 30;

// Sentence-chunked neural TTS. Returns base64 audio for one short phrase so the
// client can start speaking almost immediately while later chunks are generated.
// If no TTS provider is configured we return 501 and the client falls back to
// the browser's built-in speech synthesis.
export async function POST(req: NextRequest) {
  try {
    const tokens = getTokenFromCookies(req);
    const payload = tokens.access ? verifyAccessToken(tokens.access) : null;
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, voice } = await req.json().catch(() => ({}));
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // Keep phrases short so time-to-first-audio stays low.
    const phrase = text.trim().slice(0, 600);

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.TTS_MODEL || "gemini-2.5-flash-preview-tts";
    const voiceName = voice || process.env.TTS_VOICE || "Kore";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Neural TTS is not configured", fallback: "browser" },
        { status: 501 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: phrase }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[TTS] Provider error:", res.status, errText.slice(0, 160));
      return NextResponse.json(
        { error: "TTS provider unavailable", fallback: "browser" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const inline = data?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData)?.inlineData;

    if (!inline?.data) {
      return NextResponse.json(
        { error: "TTS provider returned no audio", fallback: "browser" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      audioBase64: inline.data,
      mimeType: inline.mimeType || "audio/L16;codec=pcm;rate=24000",
      voice: voiceName,
    });
  } catch (error: any) {
    console.error("[TTS] Error:", error);
    return NextResponse.json(
      { error: error.message || "TTS failed", fallback: "browser" },
      { status: 500 }
    );
  }
}