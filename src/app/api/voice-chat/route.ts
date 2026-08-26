import { NextRequest, NextResponse } from "next/server";
import { API_KEYS, getMergedApiKeys } from "@/config/keys";
import { fetchAI } from "@/lib/api-manager";

export const maxDuration = 60;

const VOICE_SYSTEM_INSTRUCTION = `You are a real-time voice assistant for LikeWay AI, responding directly to user speech.
CRITICAL RULES FOR VOICE RESPONSES:
1. Speak naturally, warmly, and concisely (typically 1 to 3 conversational sentences).
2. NEVER use markdown symbols like asterisks (**bold**, *italics*), hashtags (#), bullet points (- or *), or blockquotes.
3. NEVER output code snippets or HTML tags in voice mode unless explicitly asked to spell out code.
4. Spell out numbers, acronyms, or symbols if necessary for clear speech pronunciation.
5. Sound smart, helpful, friendly, and human—just like Google Gemini Voice Assistant.`;

// Clean any leftover markdown or symbols for speech output
function sanitizeForVoice(text: string): string {
  if (!text) return "";
  return text
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<artifact[\s\S]*?<\/artifact>/gi, "")
    .replace(/```[\s\S]*?```/gi, "")
    .replace(/[#*`_~>\[\]()!]/g, "")
    .replace(/https?:\/\/\S+/g, "link")
    .replace(/\s+/g, " ")
    .trim();
}

async function callGeminiDirect(prompt: string, history: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];
  
  // Format contents for Google Gemini REST API
  const contents: any[] = [];

  // Add recent history (up to last 6 turns for conversational voice context)
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    const role = msg.role === "user" ? "user" : "model";
    contents.push({
      role,
      parts: [{ text: msg.content }]
    });
  }

  // Add the current user prompt
  contents.push({
    role: "user",
    parts: [{ text: prompt }]
  });

  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      
      const payload = {
        systemInstruction: {
          parts: [{ text: VOICE_SYSTEM_INSTRUCTION }]
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 500,
        }
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Voice API] Gemini model ${model} returned ${res.status}:`, errText.slice(0, 150));
        
        // Also test Bearer token auth if ?key= rejected it
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          const authRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
          });
          if (authRes.ok) {
            const data = await authRes.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;
          }
        }
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text;
      }
    } catch (e: any) {
      lastError = e;
      console.warn(`[Voice API] Gemini direct call failed for ${model}:`, e.message);
    }
  }

  throw lastError || new Error("Gemini direct API failed");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, history = [], userId } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Voice prompt is required" }, { status: 400 });
    }

    const mergedKeys = userId ? await getMergedApiKeys(userId) : API_KEYS;
    const geminiKey = (typeof mergedKeys.gemini === "string" ? mergedKeys.gemini : "") || process.env.GEMINI_API_KEY || "";

    let replyText = "";
    let providerUsed = "gemini-direct";

    // 1. Try Direct Google Gemini API with the user provided key
    if (geminiKey) {
      try {
        replyText = await callGeminiDirect(prompt, history, geminiKey);
      } catch (err: any) {
        console.warn("[Voice API] Direct Gemini failed, falling back to multi-provider router:", err.message);
      }
    }

    // 2. Fallback to OpenRouter / Groq / Mistral with Gemini or Llama model if needed
    if (!replyText) {
      providerUsed = "fallback-router";
      const messages = [
        { role: "system", content: VOICE_SYSTEM_INSTRUCTION },
        ...history.slice(-6).map((m: any) => ({ role: m.role === "model" ? "assistant" : m.role, content: m.content })),
        { role: "user", content: prompt }
      ];

      const response = await fetchAI("openrouter", "https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          temperature: 0.7,
          max_tokens: 500,
        })
      });

      if (response.ok) {
        const data = await response.json();
        replyText = data?.choices?.[0]?.message?.content || "";
      }
    }

    if (!replyText) {
      replyText = "I'm listening, but I couldn't generate a response right now. Please try again.";
    }

    const cleanedText = sanitizeForVoice(replyText);

    return NextResponse.json({
      success: true,
      text: cleanedText,
      raw: replyText,
      provider: providerUsed,
    });
  } catch (error: any) {
    console.error("[Voice Chat API Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process voice request",
        text: "I encountered a brief issue. Please say that again."
      },
      { status: 500 }
    );
  }
}
