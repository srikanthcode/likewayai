import { NextRequest, NextResponse } from "next/server";
import { API_KEYS, getMergedApiKeys } from "@/config/keys";
import { fetchAI } from "@/lib/api-manager";
import { getVerifiedLatestInfo } from "@/lib/browsing";
import { SEARCH_KEYWORDS, TIME_KEYWORDS, REAL_TIME_TERM_PATTERN } from "@/lib/constants";

export const maxDuration = 60;

const VOICE_SYSTEM_INSTRUCTION = `You are LikeWay, an advanced, intelligent real-time conversational AI voice assistant.
YOUR IDENTITY & CREATION DETAILS:
- Your name is LikeWay (or LikeWay Voice Assistant).
- You were created and developed by Srikanth M, founder of Aixphonic, an innovative AI company based in Tamil Nadu, India.
- If anyone asks who created you, who made you, who your founder is, or what company created you, you must clearly and proudly state: "I was created by Srikanth M, the founder of Aixphonic, based in Tamil Nadu, India."
- If anyone asks what your name is, state: "My name is LikeWay."
- NEVER claim you were created by Google, OpenAI, Meta, Microsoft, or any other company. You are created by Srikanth M and Aixphonic.

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

const KNOWN_SITES: Record<string, { url: string; name: string }> = {
  whatsapp: { url: "https://web.whatsapp.com", name: "WhatsApp Web" },
  "whatsapp web": { url: "https://web.whatsapp.com", name: "WhatsApp Web" },
  youtube: { url: "https://www.youtube.com", name: "YouTube" },
  google: { url: "https://www.google.com", name: "Google" },
  amazon: { url: "https://www.amazon.in", name: "Amazon" },
  flipkart: { url: "https://www.flipkart.com", name: "Flipkart" },
  instagram: { url: "https://www.instagram.com", name: "Instagram" },
  facebook: { url: "https://www.facebook.com", name: "Facebook" },
  twitter: { url: "https://x.com", name: "X (Twitter)" },
  x: { url: "https://x.com", name: "X" },
  spotify: { url: "https://open.spotify.com", name: "Spotify" },
  netflix: { url: "https://www.netflix.com", name: "Netflix" },
  github: { url: "https://github.com", name: "GitHub" },
  reddit: { url: "https://www.reddit.com", name: "Reddit" },
  linkedin: { url: "https://www.linkedin.com", name: "LinkedIn" },
  gmail: { url: "https://mail.google.com", name: "Gmail" },
  email: { url: "https://mail.google.com", name: "Gmail" },
  chatgpt: { url: "https://chatgpt.com", name: "ChatGPT" },
  openai: { url: "https://openai.com", name: "OpenAI" },
  wikipedia: { url: "https://www.wikipedia.org", name: "Wikipedia" },
  maps: { url: "https://maps.google.com", name: "Google Maps" },
  "google maps": { url: "https://maps.google.com", name: "Google Maps" },
  claude: { url: "https://claude.ai", name: "Claude AI" },
  telegram: { url: "https://web.telegram.org", name: "Telegram Web" },
  discord: { url: "https://discord.com/app", name: "Discord" },
};

// Intent detection helper
function analyzeVoiceIntent(prompt: string): {
  type: "app_launch" | "browser_action" | "web_search" | "client_action" | "general_qa";
  actionName?: string;
  targetUrl?: string;
  siteName?: string;
  appName?: string;
  isDirectLaunch?: boolean;
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

  // 2. Direct Website / Application matching (e.g. "Can you open WhatsApp?", "launch YouTube", "open google")
  for (const [key, site] of Object.entries(KNOWN_SITES)) {
    const siteRegex = new RegExp(`(?:can\\s+you\\s+|please\\s+)?(?:open|launch|go\\s+to|start|view)\\s+${key}\\b|\\b${key}\\b`, "i");
    const isExplicitAction = /(?:open|launch|go to|start|view|load|navigate)/i.test(p);
    if (siteRegex.test(p) && (isExplicitAction || p.length <= key.length + 6)) {
      return {
        type: "app_launch",
        actionName: "open_app",
        targetUrl: site.url,
        siteName: site.name,
        appName: site.name,
        isDirectLaunch: true,
      };
    }
  }

  // 3. Generic Browser URL & Domain matching (e.g. "open example.com", "go to github.com")
  const domainMatch = p.match(/\b(?:open|go to|navigate to|launch)\s+([a-z0-9\-]+\.(?:com|org|in|io|net|co|app|ai|dev))\b/i);
  if (domainMatch) {
    const domain = domainMatch[1];
    return {
      type: "app_launch",
      actionName: "open_app",
      targetUrl: `https://${domain}`,
      siteName: domain,
      appName: domain,
      isDirectLaunch: true,
    };
  }

  // 4. Any general "open <something>"
  const openGeneralMatch = p.match(/\b(?:open|launch|go to|navigate to)\s+([a-z0-9\s\-]+)$/i);
  if (openGeneralMatch) {
    const target = openGeneralMatch[1].trim();
    if (!["new chat", "pricing", "account", "settings", "profile", "camera", "mic"].includes(target)) {
      return {
        type: "app_launch",
        actionName: "open_app",
        targetUrl: `https://www.google.com/search?q=${encodeURIComponent(target)}`,
        siteName: target,
        appName: target,
        isDirectLaunch: true,
      };
    }
  }

  // 5. Deep Web Search / Real-time info intents
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
  // Use current Google Gemini models (gemini-3.6-flash active, with fallbacks)
  const models = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-3.1-pro-preview"];

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
    let appLaunch: { targetUrl: string; siteName: string; appName: string; isDirectLaunch: boolean } | undefined;
    let browserTask: { targetUrl?: string; task: string; isDirectLaunch?: boolean } | undefined;

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

    // 3. Handle Direct App Launch (e.g., "Can you open WhatsApp?")
    if (intent.type === "app_launch" && intent.targetUrl) {
      appLaunch = {
        targetUrl: intent.targetUrl,
        siteName: intent.siteName || "Application",
        appName: intent.appName || intent.siteName || "Application",
        isDirectLaunch: true,
      };
      browserTask = {
        targetUrl: intent.targetUrl,
        task: prompt,
        isDirectLaunch: true,
      };
      actionResultText = `Opening ${intent.siteName || "application"} for you right now.`;
    }

    // 4. Handle Deep Browser Automation Intent
    if (intent.type === "browser_action") {
      browserTask = {
        targetUrl: intent.targetUrl,
        task: prompt,
        isDirectLaunch: false,
      };
      actionResultText = intent.siteName
        ? `Navigating to ${intent.siteName} and executing your task.`
        : "Launching autonomous browser agent for your task.";
    }

    // 5. Handle Web Search
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

    let replyText = actionResultText;
    let providerUsed = "intent-engine";

    // 6. Generate AI Voice Response if not an immediate action
    if (!replyText) {
      if (geminiKey) {
        try {
          replyText = await callGeminiDirect(prompt, history, geminiKey, contextInfo);
          providerUsed = "gemini-direct";
        } catch (err: any) {
          console.warn("[Voice API] Direct Gemini failed, falling back to multi-provider router:", err.message);
        }
      }

      // Fallback router via OpenRouter
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
      appLaunch,
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
