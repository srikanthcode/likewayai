const getKeys = (envVar: string): string[] => {
  const keys = process.env[envVar];
  if (!keys) return [];
  return keys.split(",").map(k => k.trim());
};

export const API_KEYS = {
  openrouter: getKeys("OPENROUTER_KEYS"),
  groq: getKeys("GROQ_KEYS"),
  mistral: getKeys("MISTRAL_API_KEY"),
  tavily: process.env.TAVILY_API_KEY || "",
  openai: process.env.OPENAI_API_KEY || "",
  image: getKeys("IMAGE_GENERATION_KEYS"),
  // Prefer exposing a public URL via NEXT_PUBLIC_SEARXNG_URL for client builds.
  // Avoid embedding a localhost default into production bundles.
  // Runtime should provide `NEXT_PUBLIC_SEARXNG_URL` when needed.
  searxng: process.env.NEXT_PUBLIC_SEARXNG_URL || process.env.SEARXNG_URL || "",
  brave: process.env.BRAVE_API_KEY || "",
  firecrawl: process.env.FIRECRAWL_API_KEY || "",
  stability: getKeys("STABILITY_API_KEY"),
  huggingface: process.env.HF_TOKEN || "",
};

// Helper function to get user-specific API keys
export async function getUserApiKeys(userId: string): Promise<Record<string, string>> {
  try {
    const clientPromise = (await import("@/lib/mongodb")).default;
    const { ObjectId } = await import("mongodb");
    const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "likeway_ai";

    const client = await clientPromise;
    const db = client.db(MONGODB_DB_NAME);

    const oid = new ObjectId(userId);
    const user = await db.collection("users").findOne({ _id: oid });

    return user?.apiKeys || {};
  } catch (error) {
    console.error("Error fetching user API keys:", error);
    return {};
  }
}

// Helper function to merge env keys with user-specific keys
export async function getMergedApiKeys(userId: string): Promise<Record<string, string[] | string>> {
  const userKeys = await getUserApiKeys(userId);
  
  return {
    openrouter: userKeys.openrouter ? [userKeys.openrouter] : API_KEYS.openrouter,
    groq: userKeys.groq ? [userKeys.groq] : API_KEYS.groq,
    mistral: userKeys.mistral ? [userKeys.mistral] : API_KEYS.mistral,
    tavily: userKeys.tavily || API_KEYS.tavily,
    openai: userKeys.openai || API_KEYS.openai,
    image: userKeys.image ? [userKeys.image] : API_KEYS.image,
    searxng: API_KEYS.searxng,
    brave: userKeys.brave || API_KEYS.brave,
    firecrawl: userKeys.firecrawl || API_KEYS.firecrawl,
    stability: userKeys.stability ? [userKeys.stability] : API_KEYS.stability,
    huggingface: userKeys.huggingface || API_KEYS.huggingface,
  };
}



