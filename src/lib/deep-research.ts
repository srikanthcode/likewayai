import { fetchAI } from "./api-manager";
import { searxngSearch, tavilySearch } from "./tools";
import { MODELS } from "./models";
import { PlanType } from "./plans";
import { Message } from "./memory";

// ── Multi-source search with fallback chain ──────────────────────────
async function searchMultipleSources(query: string): Promise<{ text: string; source: string }[]> {
  const results: { text: string; source: string }[] = [];

  // Try SearXNG first
  try {
    const searxng = await searxngSearch(query);
    if (searxng && searxng.trim().length > 50) {
      results.push({ text: searxng, source: "SearXNG" });
    }
  } catch {}

  // Try Tavily
  try {
    const tavily = await tavilySearch(query);
    if (tavily && tavily.trim().length > 50) {
      results.push({ text: tavily, source: "Tavily" });
    }
  } catch {}

  // Fallback: Try Brave Search API if available
  const braveKey = process.env.BRAVE_API_KEY;
  if (braveKey && results.length < 2) {
    try {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
        headers: { "Accept": "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": braveKey }
      });
      if (res.ok) {
        const data = await res.json();
        const webResults = data.web?.results?.map((r: any) => `${r.title}: ${r.description}`).join("\n") || "";
        if (webResults.length > 50) {
          results.push({ text: webResults, source: "Brave Search" });
        }
      }
    } catch {}
  }

  return results;
}

// ── Extract sources from research data ───────────────────────────────
function extractSources(context: string): string[] {
  const sourcePatterns = [
    /\[source:([^\]]+)\]/gi,
    /\[VERIFIED[^]]*?\]/gi,
    /Source:\s*(https?:\/\/[^\s]+)/gi,
    /According to ([^.]+)/gi,
  ];
  const sources = new Set<string>();
  for (const pattern of sourcePatterns) {
    let match;
    while ((match = pattern.exec(context)) !== null) {
      sources.add(match[1] || match[0]);
    }
  }
  return Array.from(sources).slice(0, 10);
}

// ── Main Deep Research Engine ────────────────────────────────────────
export async function executeDeepResearch(
  prompt: string,
  modelId: string,
  history: Message[],
  plan: PlanType,
  extendedThinking: boolean = false
): Promise<Response> {
  const encoder = new TextEncoder();

  const selectedModel = MODELS.find((m) => m.id === modelId) || MODELS[3];
  const finalUrl = selectedModel.provider === "groq"
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";

  // Use fast model for sub-query generation
  const fastModel = MODELS.find(m => m.fast) || MODELS[0];
  const fastUrl = fastModel.provider === "groq"
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";

  const stream = new ReadableStream({
    async start(controller) {
      const sendChunk = (text: string) => {
        const chunkData = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
        controller.enqueue(encoder.encode(chunkData));
      };

      try {
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const currentYear = now.getFullYear();

        // ── Phase 1: Initialize ─────────────────────────────────────
        sendChunk("> 🔍 **Deep Research Initiated**\n");
        sendChunk("> ⏳ Phase 1/4: Analyzing query and generating search paths...\n\n");

        // ── Phase 2: Generate sub-queries ───────────────────────────
        const subQueryPrompt = `You are a research query planner. Break down this complex question into exactly 4 highly specific, diverse search queries that will collectively answer it fully. The current date is ${dateStr}.

Rules:
- Each query must target a DIFFERENT angle of the topic
- If the user asks for "latest" or "2026", queries MUST target ${currentYear}
- Queries must be specific enough for web search engines
- Return ONLY the queries, one per line, no numbering or bullets

Question: ${prompt}`;

        const subQueryRes = await fetchAI(fastModel.provider, fastUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: fastModel.id,
            messages: [{ role: "user", content: subQueryPrompt }],
            temperature: 0.3,
            max_tokens: 250,
          }),
        });

        if (!subQueryRes.ok) throw new Error("Failed to generate search queries");

        const subQueryData = await subQueryRes.json();
        const queriesText = subQueryData.choices?.[0]?.message?.content || "";
        const queries = queriesText
          .split("\n")
          .map((q: string) => q.replace(/^\d+[\.\)]\s*/, "").trim())
          .filter((q: string) => q.length > 10)
          .slice(0, 4);

        if (queries.length === 0) queries.push(prompt);

        sendChunk(`> 🎯 **${queries.length} search paths identified:**\n`);
        queries.forEach((q: string) => sendChunk(`>  • *"${q}"*\n`));
        sendChunk("\n");

        // ── Phase 3: Multi-source parallel search ───────────────────
        sendChunk("> 🌐 **Phase 2/4:** Searching across multiple sources...\n\n");

        const searchResults = await Promise.all(
          queries.map(async (q: string) => {
            const sources = await searchMultipleSources(q);
            return sources.map(s => `[Source: ${s.source}] ${s.text}`);
          })
        );

        const allResults = searchResults.flat();
        const totalResults = allResults.length;
        sendChunk(`> 📊 Found **${totalResults}** result sets from ${new Set(allResults.map(r => r.match(/\[Source: ([^\]]+)\]/)?.[1] || "unknown")).size} sources\n\n`);

        // ── Phase 4: Synthesize with LLM ───────────────────────────
        sendChunk("> 🧠 **Phase 3/4:** Synthesizing and cross-referencing data...\n\n");

        let maxContextChars = 25000;
        if (selectedModel.provider === "groq") maxContextChars = 4000;

        let combinedContext = allResults.join("\n\n---\n\n");
        if (combinedContext.length > maxContextChars) {
          combinedContext = combinedContext.slice(0, maxContextChars) + "\n\n...[Context truncated for rate limit safety]";
        }

        const sources = extractSources(combinedContext);

        // Detect query type for specialized formatting
        const isMovieQuery = /\b(movie|film|cinema|actor|director|starring|release|cast|imdb|tmdb|box office|trailer)\b/i.test(prompt);
        const isPoliticalQuery = /\b(cm|chief minister|minister|election|government|political|party|parliament|assembly|rajya sabha|lok sabha|mp|mla)\b/i.test(prompt);
        const isTechQuery = /\b(code|programming|api|database|server|deploy|docker|react|nextjs|python|javascript|typescript)\b/i.test(prompt);

        let formatRules = "";
        if (isMovieQuery) {
          formatRules = `
### MOVIE FORMAT:
- **Title** (with release year and overview)
- **Details:** Director, Music, Production, Languages, Runtime
- **Cast:** Lead actors with character names
- **Plot:** Concise story summary
- **Reception:** Ratings, box office, critical response
- **Latest:** Current status, sequels, updates`;
        } else if (isPoliticalQuery) {
          formatRules = `
### POLITICAL FORMAT:
- **Current Leader:** Name, party, term start date
- **Key Facts:** Constituency, coalition, cabinet
- **Recent Actions:** Policy decisions, schemes, initiatives
- **Political Context:** Opposition, alliances, upcoming elections
- **Sources:** Cite all claims with source markers`;
        } else if (isTechQuery) {
          formatRules = `
### TECH FORMAT:
- **Overview:** What it is and why it matters
- **Architecture:** Technical structure
- **Implementation:** Code examples if relevant
- **Best Practices:** Industry standards
- **Alternatives:** Related tools/approaches`;
        }

        const finalPrompt = `You are a Deep Research Agent producing a comprehensive, well-structured, evidence-based report. Today is ${dateStr}.

### CORE RULES:
1. ONLY use information from the RESEARCH DATA below. NEVER fabricate facts.
2. If data is missing for a section, omit it entirely — never use placeholders.
3. Prioritize ${currentYear} data over older information.
4. Cite sources inline using [Source: Name] format.
5. Be thorough but concise — aim for quality over quantity.
${formatRules}

### ORIGINAL QUERY:
${prompt}

### RESEARCH DATA:
${combinedContext}

### SOURCES FOUND:
${sources.length > 0 ? sources.map(s => `- ${s}`).join("\n") : "Direct web search results"}`;

        const compressedHistory = history.slice(-3).map(m => {
          const raw = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
          return { role: m.role, content: raw.length > 800 ? raw.slice(0, 800) + "..." : raw };
        });

        const messages = [
          {
            role: "system",
            content: `You are the Deep Research Agent — an exhaustive, evidence-based analyst. Today is ${dateStr}.

STRICT RULES:
1. NEVER fabricate facts, names, dates, or statistics.
2. ONLY use the provided RESEARCH DATA. Do not use training memory for specifics.
3. If a section cannot be answered from the data, omit it.
4. Present multiple viewpoints when available.
5. Use markdown formatting with headers, lists, and bold for key facts.
6. Always cite sources inline.`,
          },
          ...compressedHistory,
          { role: "user", content: finalPrompt },
        ];

        sendChunk("> ✍️ **Phase 4/4:** Generating final report...\n\n---\n\n");

        // Stream the final answer
        const finalResponse = await fetchAI(selectedModel.provider, finalUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel.id,
            messages,
            stream: true,
            max_tokens: extendedThinking ? 8192 : 4096,
            temperature: 0.3,
          }),
        });

        if (!finalResponse.ok) {
          const err = await finalResponse.text();
          throw new Error(`LLM request failed: ${err}`);
        }

        const reader = finalResponse.body?.getReader();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        }

        // Append source footer
        if (sources.length > 0) {
          sendChunk(`\n\n---\n\n📚 **Sources:** ${sources.join(" | ")}`);
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

      } catch (err: any) {
        sendChunk(`\n\n⚠️ **Research Error:** ${err.message}\n`);
        sendChunk("Try rephrasing your question or try again in a moment.\n");
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}
