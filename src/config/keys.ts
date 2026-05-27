const getKeys = (envVar: string): string[] => {
  const keys = process.env[envVar];
  if (!keys) return [];
  return keys.split(",").map(k => k.trim());
};

export const API_KEYS = {
  openrouter: getKeys("OPENROUTER_KEYS"),
  groq: getKeys("GROQ_KEYS"),
  tavily: process.env.TAVILY_API_KEY || "",
  openai: process.env.OPENAI_API_KEY || "",
  image: getKeys("IMAGE_GENERATION_KEYS"),
  // Prefer exposing a public URL via NEXT_PUBLIC_SEARXNG_URL for client builds.
  // Avoid embedding a localhost default into production bundles.
  // Runtime should provide `NEXT_PUBLIC_SEARXNG_URL` when needed.
  searxng: process.env.NEXT_PUBLIC_SEARXNG_URL || process.env.SEARXNG_URL || "",
  brave: process.env.BRAVE_API_KEY || "",
  firecrawl: process.env.FIRECRAWL_API_KEY || "",
};



