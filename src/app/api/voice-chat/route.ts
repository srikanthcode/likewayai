import { NextRequest, NextResponse } from "next/server";
import { API_KEYS, getMergedApiKeys } from "@/config/keys";
import { fetchAI } from "@/lib/api-manager";
import { getVerifiedLatestInfo } from "@/lib/browsing";
import { SEARCH_KEYWORDS, TIME_KEYWORDS, REAL_TIME_TERM_PATTERN } from "@/lib/constants";

export const maxDuration = 60;

const VOICE_SYSTEM_INSTRUCTION = `You are a real-time conversational voice assistant for LikeWay AI, modeled after Google Gemini Voice.
CRITICAL RULES FOR VOICE RESPONSES:
1. Speak naturally, warmly, and concisely (typically 1 to 3 conversational sentences).
2. NEVER use markdown symbols like asterisks (**bold**, *italics*), hashtags (#), bullet points (- or *), or blockquotes.
3. NEVER output code snippets or raw JSON in voice mode unless explicitly asked to spell out code.
4. Spell out numbers, acronyms, or symbols when needed for clear, natural speech.
5. If search results or facts are provided, summarize the most important points directly and concisely.
6. Sound intelligent, helpful, friendly, and human.`;

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

// Intent detection helper
function analyzeVoiceIntent(prompt: string): {
  type: "browser_action" | "web_search" | "client_action" | "general_qa";
  actionName?: string;
  targetUrl?: string;
  searchQuery?: string;
} {
  const p = prompt.toLowerCase().trim();

  // 1. In-App Client navigation intents
  if (/\b(open|go to|show|view)\s+(pricing|plans|subscription)\b/i.test(p)) {
    return { type: "client_action", actionName: "open_pricing" };
  }
  if (/\b(new\s+chat|start\s+new\s+conversation|clear\s+chat|reset\s+chat)\b/i.test(p)) {
    return { type: "client_action", actionName: "new_chat" };
  }
  if (/\b(open|go to|show)\s+(account|settings|profile)\b/i.test(p)) {
    return { type: "client_action", actionName: "open_account" };
  }

  // 2. Browser Automation intents (e.g. "open amazon and search for...", "go to youtube...", "automate browser")
  const browserMatch = p.match(/\b(?:open|go to|navigate to|search on|buy on|check on)\s+([a-z0-9\-]+\.(?:com|org|in|io|net|co|app|ai)|amazon|flipkart|youtube|google|twitter|x\.com|github|linkedin|reddit)\b/i);
  if (browserMatch || /\b(?:browse|browser|automate|automation|click on|fill form|order|scrape)\b/i.test(p)) {
    let site = browserMatch ? browserMatch[1] : "";
    if (site && !site.includes(".")) {
      site = site === "youtube" ? "youtube.com" : site === "amazon" ? "amazon.in" : site === "google" ? "google.com" : `${site}.com`;
    }
    return {
      type: "browser_action",
      actionName: "browser_automation",
      targetUrl: site ? (site.startsWith("http") ? site : `https://${site}`) : undefined,
    };
  }

  // 3. Web Search / Real-time info intents (weather, scores, latest news, current stock, dates)
  const isSearchQuery =
    SEARCH_KEYWORDS.some((kw) => p.includes(kw)) ||
    TIME_KEYWORDS.some((kw) => p.includes(kw)) ||
    REAL_TIME_TERM_PATTERN.test(p) ||
    /\b(weather|temperature|score|who won|current price|today's news|latest update|stock price)\b/i.test(p);

  if (isSearchQuery) {
    return {
      type: "web_search",
      searchQuery: prompt,
    };
  }

  return { type: "general_qa" };
}

async function callGeminiDirect(
  prompt: string,
  history: Array<{ role: string; content: string }>,
  apiKey: string,
  contextInfo?: string
): Promise<string> {
  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];

  const contents: any[] = [];

  // Add recent history
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    const role = msg.role === "user" ? "user" : "model";
    contents.push({
      role,
      parts: [{ text: msg.content }],
    });
  }

  // Combine user prompt with any retrieved real-time context
  let finalPrompt = prompt;
  if (contextInfo) {
    finalPrompt = `[Live Verified Context: ${contextInfo}]\n\nUser Question: ${prompt}\n\nPlease provide a brief, clear, natural spoken voice response based on the above information.`;
  }

  contents.push({
    role: "user",
    parts: [{ text: finalPrompt }],
  });

  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const payload = {
        systemInstruction: {
          parts: [{ text: VOICE_SYSTEM_INSTRUCTION }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 120,
        },
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

        // Bearer token fallback
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          const authRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
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
    const geminiKey =
      (typeof mergedKeys.gemini === "string" ? mergedKeys.gemini : "") || process.env.GEMINI_API_KEY || "";

    // 1. Analyze user intent
    const intent = analyzeVoiceIntent(prompt);
    let actionResultText = "";
    let clientAction: string | undefined;
    let browserTask: { targetUrl?: string; task: string } | undefined;

    // 2. Handle In-App Client Navigation
    if (intent.type === "client_action") {
      clientAction = intent.actionName;
      if (clientAction === "open_pricing") {
        actionResultText = "Opening our plans and pricing for you.";
      } else if (clientAction === "new_chat") {
        actionResultText = "Starting a fresh conversation. What would you like to explore?";
      } else if (clientAction === "open_account") {
        actionResultText = "Opening your account and profile settings.";
      }
    }

    // 3. Handle Web Search
    let contextInfo = "";
    if (intent.type === "web_search" && intent.searchQuery) {
      try {
        const searchResult = await getVerifiedLatestInfo(intent.searchQuery);
        if (searchResult && searchResult.context) {
          contextInfo = searchResult.context.slice(0, 1500);
        }
      } catch (err: any) {
        console.warn("[Voice API] Web search failed, continuing without search context:", err.message);
      }
    }

    // 4. Handle Browser Automation Intent
    if (intent.type === "browser_action") {
      browserTask = {
        targetUrl: intent.targetUrl,
        task: prompt,
      };
    }

    let replyText = actionResultText;
    let providerUsed = "gemini-direct";

    // 5. Generate AI Voice Response if not already handled by client action
    if (!replyText) {
      if (geminiKey) {
        try {
          replyText = await callGeminiDirect(prompt, history, geminiKey, contextInfo);
        } catch (err: any) {
          console.warn("[Voice API] Direct Gemini failed, falling back to multi-provider router:", err.message);
        }
      }

      // Fallback router
      if (!replyText) {
        providerUsed = "fallback-router";
        const messages = [
          { role: "system", content: VOICE_SYSTEM_INSTRUCTION },
          ...history.slice(-6).map((m: any) => ({
            role: m.role === "model" ? "assistant" : m.role,
            content: m.content,
          })),
          {
            role: "user",
            content: contextInfo ? `[Context: ${contextInfo}]\n\nQuestion: ${prompt}` : prompt,
          },
        ];

        const response = await fetchAI("openrouter", "https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages,
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          replyText = data?.choices?.[0]?.message?.content || "";
        }
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
      intent: intent.type,
      clientAction,
      browserTask,
    });
  } catch (error: any) {
    console.error("[Voice Chat API Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process voice request",
        text: "I encountered a brief issue. Please say that again.",
      },
      { status: 500 }
    );
  }
}
