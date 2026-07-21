import { NextRequest, NextResponse } from "next/server";
import { logger, generateRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/news/search — Search news by query
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const reqLogger = logger.request(requestId);

  try {
    const body = await req.json();
    const { query, from, to, language = "en", limit = 10 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { success: false, error: "Query is required" },
        { status: 400 }
      );
    }

    reqLogger.info("News search", { query, language, limit });

    // Search using NewsAPI
    const articles = await searchNewsAPI(query, from, to, language, limit);

    return NextResponse.json({
      success: true,
      query,
      articles,
      total: articles.length,
    });

  } catch (error: any) {
    reqLogger.error("News search failed", { error: error.message });
    return NextResponse.json(
      { success: false, error: "Search failed", articles: [] },
      { status: 500 }
    );
  }
}

async function searchNewsAPI(
  query: string,
  from?: string,
  to?: string,
  language: string = "en",
  limit: number = 10
): Promise<any[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return getMockSearchResults(query, limit);
  }

  try {
    const params = new URLSearchParams({
      q: query,
      pageSize: Math.min(limit, 20).toString(),
      sortBy: "publishedAt",
      language,
      apiKey,
    });

    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const response = await fetch(
      `https://newsapi.org/v2/everything?${params.toString()}`,
      {
        headers: { "User-Agent": "LikeWayAI/1.0" },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.error(`[NewsSearch] Error: ${response.status}`);
      return getMockSearchResults(query, limit);
    }

    const data = await response.json();
    
    return (data.articles || []).map((article: any) => ({
      title: article.title || "Untitled",
      description: article.description || "",
      content: article.content || "",
      url: article.url || "#",
      source: article.source?.name || "Unknown",
      publishedAt: article.publishedAt || new Date().toISOString(),
      imageUrl: article.urlToImage || undefined,
    }));
  } catch (error) {
    console.error("[NewsSearch] Fetch failed:", error);
    return getMockSearchResults(query, limit);
  }
}

function getMockSearchResults(query: string, limit: number): any[] {
  return [
    {
      title: `Latest News: ${query}`,
      description: `Search results for "${query}" - configure NEWS_API_KEY for real results.`,
      url: "#",
      source: "Mock Data",
      publishedAt: new Date().toISOString(),
    },
  ].slice(0, limit);
}
