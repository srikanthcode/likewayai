import { tavily } from "@tavily/core";
import fs from "fs";
import path from "path";
import Parser from "rss-parser";

function cleanSimpleQuery(q: string): string {
  // Remove site: operators (e.g. site:wikipedia.org)
  let cleaned = q.replace(/site:\S+/gi, "");
  // Remove boolean operators (OR / AND)
  cleaned = cleaned.replace(/\b(or|and)\b/gi, "");
  // Clean double spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

/**
 * FREE SEARCH: DuckDuckGo (Scraping-based, no API key needed)
 */
export async function duckDuckGoSearch(rawQuery: string): Promise<string> {
  const query = cleanSimpleQuery(rawQuery);
  try {
    const response = await fetch("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      },
      body: "q=" + encodeURIComponent(query)
    });
    
    if (!response.ok) return "";
    const text = await response.text();
    
    const linkRegex = /<a rel="nofollow" href="([^"]+)" class='result-link'>([^<]+)<\/a>/g;
    let match;
    const links = [];
    while ((match = linkRegex.exec(text)) !== null) {
      links.push({ url: match[1], title: match[2].trim(), index: match.index });
    }

    const snippetRegex = /<td class='result-snippet'>([\s\S]*?)<\/td>/g;
    const snippets = [];
    while ((match = snippetRegex.exec(text)) !== null) {
      snippets.push({ snippet: match[1].replace(/<[^>]+>/g, '').trim(), index: match.index });
    }
    
    const results = [];
    for (let i = 0; i < Math.min(links.length, snippets.length); i++) {
      results.push({
        title: links[i].title,
        url: links[i].url,
        description: snippets[i].snippet
      });
    }

    if (results.length > 0) {
      console.log("DuckDuckGo Lite Search: Success.");
      return results.slice(0, 8).map((r: any, i: number) => `
Source ${i + 1}
Title: ${r.title}
Description: ${r.description}
URL: ${r.url}
`).join("\n");
    }
  } catch (e) {
    console.warn("DuckDuckGo Lite Search failed:", e);
  }
  return "";
}

/**
 * FREE NEWS: Google News RSS (No API key needed)
 */
export async function googleNewsSearch(rawQuery: string): Promise<string> {
  const query = cleanSimpleQuery(rawQuery);
  try {
    const parser = new Parser();
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const feed = await parser.parseURL(url);
    const items = feed.items || [];
    if (items.length > 0) {
      console.log("Google News RSS Search: Success.");
      return items.slice(0, 8).map((item: any, i: number) => `
News Source ${i + 1}
Title: ${item.title}
URL: ${item.link}
Date: ${item.pubDate || "N/A"}
`).join("\n");
    }
  } catch (e) {
    console.warn("Google News RSS Search failed:", e);
  }
  return "";
}


// 🚀 LIVE ENV LOADER: Bypasses process.env cache for instant key activation
function getLiveKey(keyName: string): string {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(new RegExp(`^${keyName}=(.*)$`, "m"));
      if (match && match[1]) return match[1].trim();
    }
  } catch (e) {
    console.error(`Error reading live key ${keyName}:`, e);
  }
  return process.env[keyName] || "";
}

// 🔄 KEY ROTATOR: Picks one key from a comma-separated list (round-robin by timestamp)
// Use this for keys you have multiple of (e.g. TAVILY_API_KEY has 4 keys)
function getLiveKeyRotated(keyName: string): string {
  const raw = getLiveKey(keyName);
  if (!raw) return "";
  const keys = raw.split(",").map(k => k.trim()).filter(Boolean);
  if (keys.length === 1) return keys[0];
  const index = Math.floor(Date.now() / 1000) % keys.length;
  return keys[index];
}


// NOTE: Keys are fetched inside each function (not here at module level)
// so that getLiveKey() can properly bypass Next.js process.env caching per-request.

/**
 * DEEP RESEARCH: Firecrawl (High-fidelity scraping and search)
 */
export async function firecrawlSearch(query: string): Promise<string> {
  const FIRECRAWL_KEY = getLiveKey("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_KEY) return "";

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FIRECRAWL_KEY}`
      },
      body: JSON.stringify({
        query,
        limit: 3,
        lang: "en",
        scrapeOptions: {
          formats: ["markdown"]
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        console.log("Firecrawl Search: Success.");
        return data.data.map((r: any, i: number) => `
### Deep Research Source ${i + 1}
Title: ${r.title}
URL: ${r.url}
Content: ${r.markdown?.slice(0, 3000) || r.description}
`).join("\n\n---\n\n");
      }
    }
  } catch (e) {
    console.warn("Firecrawl Search failed:", e);
  }
  return "";
}

/**
 * GUARANTEED Web Search using Brave Search (Production Quality)
 * Falls back to Jina, Tavily, and News Scrapers.
 */
export async function braveSearch(query: string): Promise<string> {
  const BRAVE_KEY = getLiveKey("BRAVE_API_KEY");
  if (!BRAVE_KEY) return "";

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": BRAVE_KEY
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      const results = data.web?.results || [];
      if (results.length > 0) {
        console.log("Brave Search: Success.");
        return results.map((r: any, i: number) => `
Source ${i + 1}
Title: ${r.title}
Description: ${r.description}
URL: ${r.url}
`).join("\n");
      }
    }
  } catch (e) {
    console.warn("Brave Search failed:", e);
  }
  return "";
}

/**
 * Searches the web using Jina.ai (Free, No API Key, Bot-Proof)
 * Falls back to Tavily if configured.
 */
export async function searxngSearch(query: string): Promise<string> {
  // ✅ 1st PRIORITY: Free DuckDuckGo + Google News RSS (No Key, Fresh Data)
  try {
    const [ddgResults, newsResults] = await Promise.all([
      duckDuckGoSearch(query).catch(() => ""),
      googleNewsSearch(query).catch(() => "")
    ]);
    const combined = [ddgResults, newsResults].filter(Boolean).join("\n\n---\n\n");
    if (combined.trim().length > 100) {
      console.log("Free Search Combo: Success.");
      return combined;
    }
  } catch (e) {
    console.warn("Free search combo failed, trying fallback...", e);
  }

  // ✅ 2nd PRIORITY: Brave Search (if key provided)
  const braveResults = await braveSearch(query);
  if (braveResults) return braveResults;

  // ✅ 3rd PRIORITY: Jina.ai Search API — free, no key, designed for AI bots
  try {
    const jinaUrl = `https://s.jina.ai/?q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(jinaUrl, {
      headers: {
        "Accept": "application/json",
        "X-With-Generated-Alt": "true"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const text = await response.text();
      if (text && text.length > 100) {
        console.log("Jina.ai Search: Success.");
        return `Web Search Results:\n\n${text.slice(0, 6000)}`;
      }
    }
  } catch (e) {
    console.warn("Jina.ai failed, trying fallback...", e);
  }

  // ✅ SECONDARY: Tavily (if API key configured)
  const TAVILY_KEY = getLiveKeyRotated("TAVILY_API_KEY");
  if (TAVILY_KEY) {
    console.log("Using Tavily fallback...");
    return await tavilySearch(query);
  }

  // ✅ TERTIARY: Direct Movie News Scraper (IndiaGlitz/Behindwoods)
  try {
    const newsUrl = `https://www.indiaglitz.com/tamil-news`;
    const newsResponse = await fetch(newsUrl);
    if (newsResponse.ok) {
      const html = await newsResponse.text();
      // Look for the query keyword in the latest news list
      if (html.toLowerCase().includes(query.split(' ')[0].toLowerCase())) {
        console.log("Movie News Crawler: Success.");
        return `Latest Cinema News Context:\n\n${html.slice(0, 4000)}`;
      }
    }
  } catch (e) {
    console.warn("News crawler failed:", e);
  }

  // ✅ QUATERNARY: Wikipedia API (free, no key, always works for known topics)
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json&origin=*`;
    const wikiResponse = await fetch(wikiUrl);
    if (wikiResponse.ok) {
      const data = await wikiResponse.json();
      const [, titles, descriptions, urls] = data;
      if (titles?.length > 0) {
        const ctx = titles.map((t: string, i: number) =>
          `Title: ${t}\nDescription: ${descriptions[i] || "N/A"}\nURL: ${urls[i]}`
        ).join("\n\n");
        return `Wikipedia Search Results:\n\n${ctx}`;
      }
    }
  } catch (e) {
    console.warn("Wikipedia fallback failed:", e);
  }

  return "";
}


/**
 * Searches the web using Tavily for high-quality context for AI responses.
 */
export async function tavilySearch(query: string): Promise<string> {
  const TAVILY_KEY = getLiveKeyRotated("TAVILY_API_KEY");
  if (!TAVILY_KEY) {
    return ""; // Silently fail for natural handling
  }

  try {
    const tvly = tavily({ apiKey: TAVILY_KEY });
    
    const response = await tvly.search(query, {
      searchDepth: "advanced",
      maxResults: 5,
      includeAnswer: true
    });


    const context = response.results
      .map((r: any) => `Source: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
      .join("\n\n");

    return `Search Query: ${query}\n\nSummary Answer: ${response.answer || "N/A"}\n\nDetailed Context:\n${context}`;
  } catch (error) {
    console.error("Tavily Search Error:", error);
    return `Error performing search: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function cleanImagePrompt(p: string): string {
  let cleaned = p.replace(/\b(generate|create|make|draw|design|paint|render|produce)\s+(an?\s+)?(image|picture|photo|photograph|illustration|artwork|art|portrait|wallpaper|logo|banner|sketch|graphic)\s+(of\s+)?/gi, "");
  cleaned = cleaned.replace(/\b(show me|can you draw|please draw|draw)\s+(an?\s+)?/gi, "");
  cleaned = cleaned.trim();
  return cleaned.length > 3 ? cleaned : p;
}

/**
 * Generates an image using the Image Router.
 * Route: ComfyUI (self-hosted, free) → Authenticated Gen API (100% watermark-free, unlisted)
 */
export async function generateImage(
  rawPrompt: string,
  options?: { model?: string; width?: number; height?: number }
): Promise<string> {
  const prompt = cleanImagePrompt(rawPrompt);
  const seed = Math.floor(Math.random() * 1000000);

  // 0th Route: ComfyUI (self-hosted, free, no API cost)
  try {
    const { generateWithComfyUI, checkComfyUIHealth, enhancePrompt, selectModel } = await import("@/lib/comfyui");
    const comfyAvailable = await checkComfyUIHealth();
    if (comfyAvailable) {
      const enhancedPrompt = enhancePrompt(prompt);
      const { checkpoint, modelType } = selectModel(prompt);
      const result = await generateWithComfyUI({ prompt: enhancedPrompt });
      if (result.success && result.imageBase64) {
        console.log(`Image Router: ComfyUI ${modelType.toUpperCase()} succeeded.`);
        return "<artifact type=\"doc\" title=\"Generated Image\">\n" +
          `![Generated Image](${result.imageBase64})\n\n` +
          "**Prompt:** " + prompt + "\n\n" +
          `*Model: ComfyUI / ${modelType.toUpperCase()}*\n` +
          "</artifact>";
      }
    }
  } catch { /* fall through to cloud */ }

  // 1st Route: Authenticated Gen API (Exact dimensions, private=true, nologo=true)
  const { buildPollinationsImageUrl, resolveImageModel, getImageModelDisplayName } = await import("@/lib/image-models");
  const selectedModel = resolveImageModel(options?.model);
  const width = options?.width || 1024;
  const height = options?.height || 1024;
  const imageUrl = buildPollinationsImageUrl({
    prompt,
    model: selectedModel,
    width,
    height,
    seed,
  });

  const displayName = getImageModelDisplayName(selectedModel);

  return "<artifact type=\"doc\" title=\"Generated Image\">\n" +
    `![Generated Image](${imageUrl})\n\n` +
    `**Prompt:** ${prompt}\n\n` +
    `*Model: ${displayName} (${width}x${height})*\n` +
    "</artifact>";
}

/**
 * Edits an uploaded image (true image-to-image) using an image-capable model
 * on OpenRouter. Unlike the previous implementation, this sends the ORIGINAL
 * image to the model — it does not generate an unrelated new image.
 *
 * Configure via IMAGE_EDIT_MODEL (default: google/gemini-2.5-flash-image).
 * Throws a descriptive error when editing is unavailable or returns no image.
 */
export async function editImage(imageUrl: string, editPrompt: string): Promise<string> {
  const { fetchAI } = await import("@/lib/api-manager");
  const model = process.env.IMAGE_EDIT_MODEL || "google/gemini-2.5-flash-image";
  const instruction = cleanImagePrompt(editPrompt) || editPrompt;

  const res = await fetchAI("openrouter", "https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Edit the provided image as follows: "${instruction}". ` +
                "Preserve the subject and composition; apply only the requested change. " +
                "Return the resulting image.",
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Image editing failed (${res.status}). ${errText.slice(0, 160)}`);
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;

  // Providers return generated images in different shapes — normalize them.
  const images = Array.isArray(message?.images) ? message.images : [];
  let outUrl: string | undefined =
    images[0]?.image_url?.url || images[0]?.url || undefined;

  if (!outUrl && typeof message?.content === "string") {
    const match = message.content.match(/(?:https?:\/\/|data:image\/)[^\s)"']+/i);
    if (match) outUrl = match[0];
  }

  if (!outUrl) {
    throw new Error("Image editing returned no image. Check IMAGE_EDIT_MODEL availability.");
  }

  return "<artifact type=\"doc\" title=\"Edited Image\">\n" +
    `![Edited Image](${outUrl})\n\n` +
    `**Original Reference:** [View Original](${imageUrl})\n\n` +
    `**Edit Instruction:** ${instruction}\n\n` +
    `*Model: ${model} (image-to-image)*\n` +
    "</artifact>";
}


/**
 * Parses a message for tool calls (simple regex-based protocol for this implementation).
 * Format: [TOOL: search | image | code] { "query": "..." }
 */
export async function processToolCalls(aiResponse: string): Promise<{ content: string; hasTools: boolean }> {
  const toolCallMatch = aiResponse.match(/\[TOOL: (\w+)\] (\{.*\})/);
  
  if (!toolCallMatch) {
    return { content: aiResponse, hasTools: false };
  }

  const [fullMatch, toolName, toolArgsStr] = toolCallMatch;
  let toolArgs;
  try {
    toolArgs = JSON.parse(toolArgsStr);
  } catch (e) {
    return { content: aiResponse, hasTools: false };
  }

  let toolResult = "";
  if (toolName === "search") {
    // Prefer SearXNG for multi-engine research
    toolResult = await searxngSearch(toolArgs.query);
  } else if (toolName === "image") {
    toolResult = await generateImage(toolArgs.prompt);
  }

  // Prepend the tool results back for the model to synthesize
  const synthesizedPrompt = `\n\n--- TOOL RESULT (${toolName.toUpperCase()}) ---\n${toolResult}\n--- END TOOL RESULT ---\n\nPlease synthesize the above info and provide a final professional response.`;
  
  return { 
    content: aiResponse.replace(fullMatch, "\n*(Processing Tool: " + toolName + ")*") + synthesizedPrompt, 
    hasTools: true 
  };
}
