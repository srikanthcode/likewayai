import { NextRequest, NextResponse } from "next/server";
import { logger, generateRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

// Free news APIs (no API key required)
const NEWS_SOURCES = [
  {
    name: "NewsAPI.org",
    url: "https://newsapi.org/v2/top-headlines",
    getKey: () => process.env.NEWS_API_KEY,
  },
  {
    name: "GNews",
    url: "https://gnews.io/api/v4/top-headlines",
    getKey: () => process.env.GNEWS_API_KEY,
  },
];

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/news — Fetch latest news headlines
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const reqLogger = logger.request(requestId);

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "general";
    const country = searchParams.get("country") || "us";
    const query = searchParams.get("q") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);

    reqLogger.info("News request", { category, country, query, limit });

    // Try NewsAPI first
    const articles = await fetchFromNewsAPI(category, country, query, limit);
    
    if (articles.length > 0) {
      return NextResponse.json({
        success: true,
        source: "newsapi",
        articles,
        total: articles.length,
        cached: false,
      });
    }

    // Fallback to GNews if available
    const gnewsArticles = await fetchFromGNews(category, country, query, limit);
    
    if (gnewsArticles.length > 0) {
      return NextResponse.json({
        success: true,
        source: "gnews",
        articles: gnewsArticles,
        total: gnewsArticles.length,
        cached: false,
      });
    }

    // No API keys configured - return mock data for development
    return NextResponse.json({
      success: true,
      source: "mock",
      articles: getMockNews(category, limit),
      total: limit,
      cached: false,
      note: "Configure NEWS_API_KEY or GNEWS_API_KEY for real news",
    });

  } catch (error: any) {
    reqLogger.error("News fetch failed", { error: error.message });
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch news",
        articles: getMockNews("general", 5),
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NEWS API FETCHER
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromNewsAPI(
  category: string,
  country: string,
  query?: string,
  limit: number = 10
): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    let url: string;
    
    if (query) {
      // Search endpoint
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=${limit}&sortBy=publishedAt&apiKey=${apiKey}`;
    } else {
      // Top headlines endpoint
      url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=${limit}&apiKey=${apiKey}`;
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "LikeWayAI/1.0" },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`[NewsAPI] Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    return (data.articles || []).map((article: any) => ({
      title: article.title || "Untitled",
      description: article.description || "",
      url: article.url || "#",
      source: article.source?.name || "Unknown",
      publishedAt: article.publishedAt || new Date().toISOString(),
      imageUrl: article.urlToImage || undefined,
    }));
  } catch (error) {
    console.error("[NewsAPI] Fetch failed:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GNEWS FETCHER
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromGNews(
  category: string,
  country: string,
  query?: string,
  limit: number = 10
): Promise<NewsArticle[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  try {
    let url: string;
    
    if (query) {
      url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&max=${limit}&apikey=${apiKey}`;
    } else {
      url = `https://gnews.io/api/v4/top-headlines?category=${category}&country=${country}&max=${limit}&apikey=${apiKey}`;
    }

    const response = await fetch(url, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`[GNews] Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    return (data.articles || []).map((article: any) => ({
      title: article.title || "Untitled",
      description: article.description || "",
      url: article.url || "#",
      source: article.source?.name || "Unknown",
      publishedAt: article.publishedAt || new Date().toISOString(),
      imageUrl: article.image || undefined,
    }));
  } catch (error) {
    console.error("[GNews] Fetch failed:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK NEWS (Development/No API Keys)
// ═══════════════════════════════════════════════════════════════════════════

function getMockNews(category: string, limit: number): NewsArticle[] {
  const mockNews: NewsArticle[] = [
    {
      title: "AI Technology Advances in 2025",
      description: "New developments in artificial intelligence continue to reshape industries worldwide.",
      url: "#",
      source: "Tech News",
      publishedAt: new Date().toISOString(),
    },
    {
      title: "Space Exploration Milestone Achieved",
      description: "Scientists announce breakthrough in deep space research and exploration.",
      url: "#",
      source: "Science Daily",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      title: "Global Climate Summit Updates",
      description: "World leaders gather to discuss climate action and sustainability goals.",
      url: "#",
      source: "World News",
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      title: "Cybersecurity Trends to Watch",
      description: "Expert analysis on emerging threats and protection strategies.",
      url: "#",
      source: "Security Weekly",
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      title: "Startup Funding Reaches New High",
      description: "Venture capital investment in tech startups continues to grow.",
      url: "#",
      source: "Business Insider",
      publishedAt: new Date(Date.now() - 14400000).toISOString(),
    },
  ];

  return mockNews.slice(0, limit);
}
