"use server";

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
    let links = [];
    while ((match = linkRegex.exec(text)) !== null) {
      links.push({ url: match[1], title: match[2].trim(), index: match.index });
    }
    
    const snippetRegex = /<td class='result-snippet'>([\s\S]*?)<\/td>/g;
    let snippets = [];
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
    const timeoutId = setTimeout(() => controller.abort(), 12000);

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

/**
 * Generates an image using a pool of API keys with rotation and failover.
 * Provider Order: OpenRouter Image Models -> Stability AI -> HuggingFace FLUX -> Pollinations
 */
export async function generateImage(prompt: string): Promise<string> {
  // Try OpenRouter image models first
  const openrouterKeys = getLiveKey("OPENROUTER_KEYS");
  const orKeys = openrouterKeys ? openrouterKeys.split(",").map(k => k.trim()).filter(Boolean) : [];
  
  for (const orKey of orKeys) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${orKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://likeway.ai",
          "X-Title": "Likeway AI"
        },
        body: JSON.stringify({
          model: "openai/dall-e-3",
          messages: [
            { role: "user", content: `Generate an image: ${prompt}` }
          ],
          max_tokens: 1000
        })
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.content || "";
        if (imageUrl) {
          console.log(`OpenRouter Image Generation: Success`);
          return "<artifact type=\"doc\" title=\"Generated Image (OpenRouter)\">\n" +
"![Generated Image](" + imageUrl + ")\n" +
"Prompt: " + prompt + "\n" +
"</artifact>";
        }
      }
    } catch (e) {
      console.warn(`OpenRouter image generation failed:`, e);
    }
  }

  // Try Stability AI with pool rotation & fallback
  const rawKeys = getLiveKey("IMAGE_GENERATION_KEYS");
  const keys = rawKeys ? rawKeys.split(",").map(k => k.trim()).filter(Boolean) : [];
  if (process.env.STABILITY_API_KEY) {
    keys.push(process.env.STABILITY_API_KEY);
  }

  for (const stabilityKey of keys) {
    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("output_format", "webp");
      // Appending empty Blob instead of string for file field 'none'
      formData.append("none", new Blob([''], { type: 'text/plain' }));

      const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/ultra", {
        method: "POST",
        headers: {
          "authorization": `Bearer ${stabilityKey}`,
          "accept": "image/*"
        },
        body: formData as any
      });

      if (response.status === 200) {
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        console.log(`Stability AI Image Generation: Success using key ${stabilityKey.slice(0, 8)}...`);
        return "<artifact type=\"doc\" title=\"Generated Image (Stability AI)\">\n" +
"![Generated Image](data:image/webp;base64," + base64 + ")\n" +
"Prompt: " + prompt + "\n" +
"</artifact>";
      } else {
        console.warn(`Stability AI key ${stabilityKey.slice(0, 8)}... returned status ${response.status}`);
      }
    } catch (e) {
      console.warn(`Stability AI generation failed for key ${stabilityKey.slice(0, 8)}...`, e);
    }
  }

  // Fallback 1: HuggingFace FLUX
  const hfToken = process.env.HF_TOKEN;
  if (hfToken) {
    try {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
        {
          headers: {
            "Authorization": `Bearer ${hfToken}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({ inputs: prompt }),
        }
      );

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return "<artifact type=\"doc\" title=\"Generated Image (HuggingFace FLUX)\">\n" +
"![Generated Image](data:image/jpeg;base64," + base64 + ")\n" +
"Prompt: " + prompt + "\n" +
"</artifact>";
      }
    } catch (e) {
      console.warn("HuggingFace FLUX generation failed, falling back...", e);
    }
  }

  // Fallback 2: Pollinations (No key required, instant)
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) + "?width=1024&height=1024&nologo=true&seed=" + seed + "&model=flux";
  
  return "<artifact type=\"doc\" title=\"Realtime Generated Image (Pollinations)\">\n" +
"![Generated Image](" + imageUrl + ")\n" +
"*System Note: High-speed generation active.*\n" +
"Prompt: " + prompt + "\n" +
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
