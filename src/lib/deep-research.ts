import { fetchAI } from "./api-manager";
import { searxngSearch, tavilySearch } from "./tools";
import { MODELS } from "./models";
import { PlanType } from "./plans";
import { Message } from "./memory";

export async function executeDeepResearch(
  prompt: string,
  modelId: string,
  history: Message[],
  plan: PlanType,
  extendedThinking: boolean = false
): Promise<Response> {
  const encoder = new TextEncoder();

  // Find the selected model
  const selectedModel = MODELS.find((m) => m.id === modelId) || MODELS[3];
  const finalUrl = selectedModel.provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

  // Use a fast model for sub-queries
  const fastModel = MODELS[0];
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
        // Step 1: User asked complex question. Acknowledge start.
        sendChunk("> 🔍 **Deep Research Flow Initiated**\n");
        sendChunk("> ⏳ Analyzing query and generating sub-questions...\n");

        // Step 2: System breaks into sub-questions
        const now = new Date();
        const currentYear = now.getFullYear();
        const subQueryPrompt = `Break down this complex question into exactly 3 highly specific search queries that will help answer it fully. The current year is ${currentYear}. If the user asks for "new", "latest", or current updates, ensure your search queries specifically target ${currentYear} or the most recent available data. Return ONLY the queries, one per line. No numbering, no bullets, no introduction.\n\nQuestion: ${prompt}`;
        
        const subQueryRes = await fetchAI(fastModel.provider, fastUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: fastModel.id,
                messages: [{ role: "user", content: subQueryPrompt }],
                temperature: 0.2,
                max_tokens: 150
            })
        });

        if (!subQueryRes.ok) throw new Error("Failed to generate sub-questions.");

        const subQueryData = await subQueryRes.json();
        const queriesText = subQueryData.choices?.[0]?.message?.content || "";
        const queries = queriesText.split('\n').map((q: string) => q.trim()).filter((q: string) => q.length > 0).slice(0, 3);
        
        if (queries.length === 0) {
            queries.push(prompt);
        }

        sendChunk(`> 🎯 Identified ${queries.length} paths of inquiry:\n`);
        queries.forEach((q: string) => sendChunk(`>   • *"${q}"*\n`));
        
        // Step 3 & 4: Web/API search triggered + Multiple sources collected
        sendChunk("> 🌐 Querying web and API sources concurrently...\n");
        
        const searchPromises = queries.map((q: string) => searxngSearch(q).catch(() => tavilySearch(q).catch(() => "")));
        const searchResults = await Promise.all(searchPromises);

        // Step 5: Filter + rank info
        sendChunk("> 🧹 Filtering and synthesizing collected knowledge...\n> \n---\n\n");

        let maxContextChars = 20000; // OpenRouter default (massive token limits)
        if (selectedModel.provider === "groq") {
            maxContextChars = 4000; // Groq limit (approx. 1,000 tokens) to guarantee safety under TPM limit
        }

        let combinedContext = searchResults.filter(res => res.trim().length > 0).join("\n\n---\n\n");
        if (combinedContext.length > maxContextChars) {
            combinedContext = combinedContext.slice(0, maxContextChars) + "\n\n...[Context Truncated for Rate Limit Safety]";
        }

        // Step 6: Send structured data to LLM
        const now2 = new Date();
        const dateStr = now2.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const finalPrompt = `You are a Deep Research AI. Synthesize the following research data to provide a comprehensive, highly-structured answer to the user's original query. 
Current Date: ${dateStr}
IMPORTANT: If the research data contains information from 2025 or 2026, treat it as the most current and relevant data. Ignore older training data (like 2013) if a newer 2026 version of the subject exists in the research data.

ORIGINAL QUERY:
${prompt}

RESEARCH DATA:
${combinedContext}`;

        // Compress history: take last 3 messages, trim long content to prevent history bloat
        const compressedHistory = history.slice(-3).map(m => {
            const rawContent = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
            const trimmedContent = rawContent.length > 1000 ? rawContent.slice(0, 1000) + "...[History Trimmed]" : rawContent;
            return { role: m.role, content: trimmedContent };
        });

        const isMovieQuery = /movie|film|cinema|actor|director|starring|release|cast|imdb|tmdb|box office/i.test(prompt) || (prompt.length < 35 && !prompt.includes("how to") && !prompt.includes("code") && !prompt.includes("css"));
        
        let customSystemRules = "";
        if (isMovieQuery) {
            customSystemRules = `
### MOVIE FORMATTING RULES:
If the user is asking about a movie, organize the output strictly in this premium structure:
- **[Movie Name]** (with Overview paragraph)
- **Movie Details** (List: Movie Name, Hero, Director, Music, Production, Languages)
- **Cast** (Bullet list of cast with their characters)
- **Story / Theme** (Paragraph explaining theme/genre/plot)
- **Latest Update** (Current production/release status, leaks, delays, etc.)
- **Watch Glimpse / Glimpse Link** (If any YouTube or first look link/teaser is available in the verified context)

### GRAMMAR CORRECTION:
If the user's question has casing, grammatical, or formatting issues (e.g. lowercase "tell me about jananayagan"), add a gentle, polite "English correction:" section at the very end suggesting the correct professional phrasing (e.g. suggesting: "Instead of 'tell me about jananayagan', a better sentence is: 'Tell me about Jananayagan.'").`;
        }

        const messages = [
            { 
              role: "system", 
              content: `You are the Deep Research Agent — an exhaustive, evidence-based analyst. Today is ${dateStr}. 
              
### STRICT RULES:
1. NEVER invent, fabricate, or hallucinate any facts, names, years, cast lists, box office figures, or reviews.
2. Rely ONLY on the provided RESEARCH DATA below. Do NOT use your internal training memory to make up details (such as older directors, cast, or release dates) that are not present in the research data.
3. If a specific section (e.g. plot or reviews) is not present in the research data, do NOT list a placeholder or state that 'the engine failed to fetch it'. Simply omit that section entirely.
4. Present multiple viewpoints and cite sources from the provided context. ALWAYS prioritize the provided RESEARCH DATA over your internal training data.
${customSystemRules}` 
            },
            ...compressedHistory,
            { role: "user", content: finalPrompt }
        ];

        // Step 7: LLM generates final answer (streamed)
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
            throw new Error(`Final LLM request failed: ${err}`);
        }

        const reader = finalResponse.body?.getReader();
        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
            }
        }

        controller.close();

      } catch (err: any) {
        sendChunk(`\n\n⚠️ **Deep Research Failed:** ${err.message}\n`);
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}
