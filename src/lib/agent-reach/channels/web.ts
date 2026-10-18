import { ReachResult } from "../types";

export async function readWebpage(targetUrl: string): Promise<ReachResult> {
  const startTime = Date.now();
  let cleanUrl = targetUrl.trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = "https://" + cleanUrl;
  }

  // 1. Primary Backend: Jina Reader (Zero config, transforms HTML to pristine Markdown)
  try {
    const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
    const res = await fetch(jinaUrl, {
      method: "GET",
      headers: {
        "Accept": "text/markdown, text/plain",
        "User-Agent": "LikeWay-Agent-Reach/1.0",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 40) {
        // Extract title if present in Jina markdown header
        const titleMatch = text.match(/^Title:\s*(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : undefined;

        return {
          success: true,
          channel: "web",
          url: cleanUrl,
          title,
          content: text.slice(0, 30000),
          backendUsed: "Jina Reader",
          durationMs: Date.now() - startTime,
        };
      }
    }
  } catch (jinaErr: any) {
    console.warn("[AgentReach:Web] Jina Reader failed, falling back to direct fetch:", jinaErr?.message);
  }

  // 2. Fallback Backend: Direct HTML fetch + text cleanup
  try {
    const directRes = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!directRes.ok) {
      throw new Error(`HTTP ${directRes.status}: ${directRes.statusText}`);
    }

    const html = await directRes.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Clean HTML
    const cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    return {
      success: true,
      channel: "web",
      url: cleanUrl,
      title,
      content: cleaned.slice(0, 20000),
      backendUsed: "Direct Fetch (Cleaned HTML)",
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      success: false,
      channel: "web",
      url: cleanUrl,
      content: "",
      backendUsed: "None",
      durationMs: Date.now() - startTime,
      error: `Failed to read webpage: ${err?.message || "Unknown error"}`,
    };
  }
}
