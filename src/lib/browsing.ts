import { searxngSearch, tavilySearch, firecrawlSearch, braveSearch } from "./tools";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs))
  ]);
}

export interface FactData {
  title?: string;
  year?: string;
  director?: string;
  cast?: string[];
  releaseDate?: string;
  source?: string;
  confidence: number;
}

/**
 * Detects political intent BEFORE any query transformation,
 * so abbreviations like "cm" are caught correctly.
 */
function detectPolitical(raw: string): boolean {
  return /\b(cm|dmk|aidmk|admk|bjp|tvk|politics|election|minister|governor|government|party|political|tamil\s*nadu|chief\s*minister)\b/i.test(raw);
}

/**
 * Normalises/expands common user typing mistakes into clean search terms.
 */
function optimizeSearchQuery(q: string): string {
  let cleaned = q.toLowerCase();

  // Fix common typos
  cleaned = cleaned.replace(/\b(vindo|vindwo|windo)\b/g, "window");
  cleaned = cleaned.replace(/\b(contxt|contex)\b/g, "context");
  cleaned = cleaned.replace(/\b(paramters|paramter|parms)\b/g, "parameters");
  cleaned = cleaned.replace(/\b(tmailnadu|tamilnadu|tamillnadu|tamilnad)\b/g, "tamil nadu");

  // Expand CM abbreviation
  cleaned = cleaned.replace(/\bcm\b/g, "chief minister");

  // Clean conversational filler for cleaner web search
  cleaned = cleaned.replace(/\b(this models?|show me|tell me|what is the|what's the|can you show|please show)\b/g, "");

  // Remove excess whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Truncate query to a safe length so APIs like Tavily don't reject it.
 */
function safeQueryLength(q: string, max = 200): string {
  return q.length > max ? q.slice(0, max).trim() : q;
}

export async function getVerifiedLatestInfo(rawQuery: string): Promise<{ context: string, confidence: number, verifiedFacts: string[] }> {
  // Run political detection on RAW query (before cm→chief minister expansion)
  const isPolitical = detectPolitical(rawQuery);

  const query = optimizeSearchQuery(rawQuery);

  // 1. Parallel Multi-Engine Retrieval
  const temporalKeywords = ["latest", "new", "current", "recent", "update", "release", "today", "now", "2026", "box office"];
  const isTemporalQuery = temporalKeywords.some(kw => query.includes(kw));
  const isMovieKeyword = /movie|film|cinema|actor|director|starring|release|cast|imdb|tmdb|box office/i.test(query);
  const isMovieQuery = isMovieKeyword && !isPolitical;
  const isTechQuery = /glm[- ]?[0-9.]+|gpt[- ]?[0-9.]+|claude|gemini|deepseek|llama|qwen|mistral|kimi|minimax|context window|tokens|parameters|specs|specifications/i.test(query);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentDateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Detect if user is asking for TODAY'S movies generically
  const todayMovieIntent = /today|releasing today|released today|new release today|movies? today/i.test(query);
  const genericOnlyWords = /^(tell me about|what is|show me|latest|new|today|released?|movie|film|the|a|an|\s)+$/i.test(query.trim());
  const isGenericTodayMovieQuery = todayMovieIntent && !isPolitical && (genericOnlyWords || query.trim().split(' ').length < 8);

  let smartQuery: string;
  if (isGenericTodayMovieQuery) {
    smartQuery = `movies releasing on ${currentDateStr} new theatrical release ${currentYear}`;
  } else if (isMovieQuery) {
    const dateSuffix = (query.includes("today") || query.includes("now"))
      ? currentDateStr
      : isTemporalQuery ? `${currentYear}` : "";
    smartQuery = safeQueryLength(`${query}${dateSuffix ? ` ${dateSuffix}` : ""} movie site:imdb.com OR wikipedia.org`);
  } else if (isPolitical) {
    smartQuery = safeQueryLength(`${query} ${currentYear} site:wikipedia.org OR site:thehindu.com OR site:ndtv.com OR site:timesofindia.com`);
  } else if (isTechQuery) {
    smartQuery = safeQueryLength(`${query}`);
  } else if (query.includes("today") || query.includes("now")) {
    smartQuery = safeQueryLength(`${query} ${currentDateStr}`);
  } else if (isTemporalQuery) {
    smartQuery = safeQueryLength(`${query} ${currentYear}`);
  } else {
    smartQuery = safeQueryLength(query);
  }

  // ── Retrieval strategy ──────────────────────────────────────────────
  let tavily = "";
  if (process.env.TAVILY_API_KEY) {
    tavily = await withTimeout(tavilySearch(smartQuery).catch(() => ""), 8000, "");
  }

  let freeCombo = "";
  if (!tavily || tavily.startsWith("Error performing search:")) {
    const [brave, jina] = await Promise.all([
      withTimeout(braveSearch(smartQuery).catch(() => ""), 6000, ""),
      withTimeout(searxngSearch(smartQuery).catch(() => ""), 6000, "")
    ]);
    freeCombo = [brave, jina].join("\n\n");
  }

  const effectiveResults = (!tavily || tavily.startsWith("Error performing search:")) ? freeCombo : tavily;
  const rawResults = effectiveResults.slice(0, 8000);

  if (!rawResults.trim() || rawResults.startsWith("Error performing search:")) {
    return { context: "", confidence: 0, verifiedFacts: [] };
  }

  // 2. Fact Extraction & Authority Ranking
  const facts: string[] = [];
  const confidenceTriggers = [
    // Tech & Developer Authorities
    { pattern: /unsloth\.ai|huggingface\.co|github\.com|nvidia\.com|openai\.com|anthropic\.com|google\.com|zhipu\.ai|z\.ai|openrouter\.ai|artificialanalysis\.ai|arxiv\.org|docs\.|documentation/i, weight: 45, label: "Tech Authority" },
    // Global & Regional News / Reference Authorities
    { pattern: /wikipedia\.org|reuters\.com|bloomberg\.com|thehindu\.com|ndtv\.com|timesofindia\.com|imdb\.com|techcrunch\.com|theverge\.com/i, weight: 40, label: "Global Authority" },
    // Status & Technical Fact markers
    { pattern: /official|confirmed|announced|specification|specs|context window|tokens|parameters|benchmark/i, weight: 25, label: "Technical Fact Match" },
    { pattern: /202[4-9]|release|theatre|cinema|election|chief minister/i, weight: 20, label: "Temporal/Status Match" },
    { pattern: /behindwoods|indiaglitz|timesofindia|thehindu|pinkvilla|variety|deadline|ndtv|hindustan/i, weight: 20, label: "Verified News Portal" },
    { pattern: /vijay|suriya|trisha|rj balaji|thalapathy|tvk|dmk|cmk/i, weight: 20, label: "Entity Match" }
  ];

  let totalConfidence = 0;
  if (rawResults.length > 100) {
    totalConfidence += 35;
  }
  const lowerResults = rawResults.toLowerCase();

  confidenceTriggers.forEach(trigger => {
    if (trigger.pattern.test(lowerResults)) {
      totalConfidence += trigger.weight;
      facts.push(trigger.label);
    }
  });

  // 3. Data Cleaning
  const cleanedContext = rawResults
    .split("\n\n")
    .filter(snippet => snippet.length > 30)
    .slice(0, 12)
    .map(urlRewrite)
    .join("\n\n");

  const hasEntity = /vijay|suriya|trisha|thalapathy|tvk/i.test(lowerResults);
  const hasYear = /2026/i.test(lowerResults);
  if (hasEntity && hasYear && totalConfidence < 50) totalConfidence = 55;

  const confidence = Math.min(totalConfidence, 100);

  // 4. Build context with appropriate guard based on query type
  const guardHeader = `[Search performed: ${currentDateStr}. Query: "${smartQuery}"]`;
  const guardNote = isPolitical
    ? `⚠️ IMPORTANT: Use ONLY the verified context below to answer. Do NOT invent political facts. If the exact information is not in context, say so clearly and naturally.\n\n`
    : isMovieQuery
    ? `⚠️ IMPORTANT: If the verified context below does NOT contain this specific movie, explicitly say so. Do NOT invent movie names, cast, or release dates from prior training data.\n\n`
    : `⚠️ IMPORTANT: Answer based strictly on the verified context below. When technical specifications or facts are present in context, you MUST use them.\n\n`;

  const contextWithGuard = `${guardHeader}\n${guardNote}${cleanedContext}`;

  return {
    context: contextWithGuard,
    confidence,
    verifiedFacts: facts
  };
}

/**
 * ChatGPT-Style Source Link Rewriter
 */
function urlRewrite(text: string): string {
  return text.replace(/https?:\/\/[^\s)]+/g, (url) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes("imdb.com") || u.hostname.includes("wikipedia.org")) {
        u.searchParams.set("utm_source", "likeway.ai");
      }
      return u.toString();
    } catch (e) { return url; }
  });
}
