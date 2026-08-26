// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — BUILT-IN TOOLS
// Wraps existing functionality into the standardized tool interface
// ══════════════════════════════════════════════════════════════════════

import { createTool, ToolSchema, ToolResult } from "./tool-registry";
import { braveSearch, duckDuckGoSearch, firecrawlSearch, searxngSearch } from "../tools";
import { getVerifiedLatestInfo } from "../browsing";
import { documentTools } from "./document-tools";
import { sandboxTools } from "./sandbox-tools";

// ── Web Search Tool ──────────────────────────────────────────────────

export const webSearchTool = createTool(
  {
    name: "SEARCH_WEB",
    description: "Search the web for current information. Returns titles, URLs, and snippets from multiple sources.",
    category: "search",
    parameters: [
      { name: "query", type: "string", description: "Search query", required: true },
      { name: "maxResults", type: "number", description: "Maximum results to return", required: false, default: 5 },
    ],
    permissions: ["network"],
    cost: { tokens: 500, credits: 0, money: 0 },
    timeout: 15000,
    retryable: true,
    examples: ["latest AI news 2026", "React 19 new features"],
  },
  async (params) => {
    const results = await searxngSearch(params.query);
    return {
      success: !!results,
      data: results || "No results found",
      metadata: { duration: 0, tokensUsed: 0, sources: ["searxng", "duckduckgo", "google-news"] },
    };
  }
);

// ── Deep Search Tool (Firecrawl) ─────────────────────────────────────

export const deepSearchTool = createTool(
  {
    name: "DEEP_SEARCH",
    description: "Deep web search with full-page content extraction. Returns detailed markdown content from top sources.",
    category: "search",
    parameters: [
      { name: "query", type: "string", description: "Search query for deep research", required: true },
    ],
    permissions: ["network"],
    cost: { tokens: 2000, credits: 1, money: 0.001 },
    timeout: 30000,
    retryable: true,
    examples: ["comprehensive analysis of quantum computing 2026"],
  },
  async (params) => {
    const results = await firecrawlSearch(params.query);
    return {
      success: !!results,
      data: results || "No deep results found",
      metadata: { duration: 0, tokensUsed: 0, sources: ["firecrawl"] },
    };
  }
);

// ── Web Fetch Tool ───────────────────────────────────────────────────

export const webFetchTool = createTool(
  {
    name: "FETCH_WEBPAGE",
    description: "Fetch and extract content from a specific URL. Returns cleaned text content.",
    category: "search",
    parameters: [
      { name: "url", type: "string", description: "URL to fetch", required: true },
    ],
    permissions: ["network"],
    cost: { tokens: 1000, credits: 0, money: 0 },
    timeout: 20000,
    retryable: true,
    examples: ["https://example.com/article"],
  },
  async (params) => {
    try {
      const response = await fetch(params.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LikeWayBot/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      const text = await response.text();
      // Basic HTML stripping
      const cleaned = text
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 10000);
      return { success: true, data: cleaned };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
);

// ── Verified Info Tool ───────────────────────────────────────────────

export const verifiedInfoTool = createTool(
  {
    name: "VERIFIED_INFO",
    description: "Get verified, cross-referenced information with confidence scores. Best for factual queries.",
    category: "search",
    parameters: [
      { name: "query", type: "string", description: "Query to verify", required: true },
    ],
    permissions: ["network"],
    cost: { tokens: 1500, credits: 1, money: 0.001 },
    timeout: 25000,
    retryable: true,
    examples: ["who is the CEO of OpenAI in 2026"],
  },
  async (params) => {
    const info = await getVerifiedLatestInfo(params.query);
    return {
      success: info.confidence > 20,
      data: info.context || "No verified information found",
      metadata: { duration: 0, tokensUsed: 0, confidence: info.confidence },
    };
  }
);

// ── All Built-in Tools ───────────────────────────────────────────────

export const builtinTools = [
  webSearchTool,
  deepSearchTool,
  webFetchTool,
  verifiedInfoTool,
  ...documentTools,
  ...sandboxTools,
];
