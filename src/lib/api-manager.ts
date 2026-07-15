import { API_KEYS } from "@/config/keys";

type Provider = "openrouter" | "groq" | "mistral" | "image";

class KeyPool {
  private keys: Record<Provider, string[]>;
  private indices: Record<Provider, number>;
  private failedKeys: Set<string> = new Set();

  constructor() {
    this.keys = API_KEYS as Record<Provider, string[]>;
    this.indices = {
      openrouter: 0,
      groq: 0,
      mistral: 0,
      image: 0,
    };
  }

  getNextKey(provider: Provider): string | null {
    const providerKeys = this.keys[provider];
    if (!providerKeys || providerKeys.length === 0) return null;

    let attempts = 0;
    while (attempts < providerKeys.length) {
      const index = this.indices[provider];
      const key = providerKeys[index];
      
      this.indices[provider] = (index + 1) % providerKeys.length;

      if (!this.failedKeys.has(key)) {
        return key;
      }
      attempts++;
    }

    // SELF-HEALING: If all keys are temporarily marked failed, reset the pool for this provider.
    // Rate limits (429) are temporary, so we must give them another chance!
    console.log(`[KeyPool] Self-healing activated: resetting pool for provider "${provider}"`);
    this.resetProvider(provider);
    return providerKeys[0] || null;
  }

  markKeyFailed(key: string) {
    this.failedKeys.add(key);
  }

  resetProvider(provider: Provider) {
    const providerKeys = this.keys[provider];
    if (providerKeys) {
      providerKeys.forEach(k => this.failedKeys.delete(k));
    }
  }
}

export const keyPool = new KeyPool();

// ── Provider Health Check ─────────────────────────────────────────────────
// Logs active key pools on server startup so missing env vars are immediately visible
const _providerStatus = (["mistral", "groq", "openrouter"] as const).map(p => {
  const keys = API_KEYS[p as keyof typeof API_KEYS];
  const count = Array.isArray(keys) ? keys.filter(Boolean).length : 0;
  return `${p}: ${count > 0 ? `✅ ${count} key(s)` : "❌ NO KEYS — set env var"}`;
});
console.log("[LikeWay API] Provider pool status:\n" + _providerStatus.join("\n"));

const PROVIDER_URLS: Record<Provider, string> = {
    groq: "https://api.groq.com/openai/v1/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
    mistral: "https://api.mistral.ai/v1/chat/completions",
    image: "https://api.deepai.org/api/text2img" // Not really used this way anymore
};

export async function fetchAI(provider: Provider, url: string, options: any) {
  const providersToTry: Provider[] = [];
  if (provider === "groq") {
    providersToTry.push("groq", "openrouter", "mistral");
  } else if (provider === "mistral") {
    providersToTry.push("mistral", "openrouter", "groq");
  } else {
    providersToTry.push("openrouter", "groq", "mistral");
  }
  
  for (const currentProvider of providersToTry) {
    let key;
    const currentUrl = PROVIDER_URLS[currentProvider] || url;

    // Translate body parameters dynamically during fallback
    let requestOptions = options;
    if (currentProvider !== provider && options.body) {
      try {
        const bodyObj = JSON.parse(options.body);
        if (currentProvider === "mistral") {
          bodyObj.model = "mistral/mistral-medium-latest";
        } else if (currentProvider === "groq") {
          bodyObj.model = "llama-3.3-70b-versatile";
        } else if (currentProvider === "openrouter") {
          bodyObj.model = "google/gemini-2.5-flash";
        }
        requestOptions = {
          ...options,
          body: JSON.stringify(bodyObj)
        };
      } catch (e) {
        console.warn("[Key Rotator] Dynamic translation failed during fallback:", e);
      }
    }

    // Try all keys for current provider (max attempts to prevent infinite loop from self-healing)
    let providerAttempts = 0;
    const maxProviderAttempts = 6; // Enough to try all keys + one self-healing reset cycle
    while ((key = keyPool.getNextKey(currentProvider)) !== null && providerAttempts++ < maxProviderAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(currentUrl, {
          ...requestOptions,
          signal: controller.signal,
          headers: {
            ...requestOptions.headers,
            "Authorization": "Bearer " + key,
            "HTTP-Referer": "https://likeway.ai",
            "X-Title": "Likeway AI",
          },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.clone().text().catch(() => "");
          const isRateLimit = response.status === 429 || 
                              response.status === 413 || 
                              errText.includes("rate_limit") || 
                              errText.includes("rate_limit_exceeded") ||
                              errText.includes("tokens per minute") ||
                              errText.includes("Limit") ||
                              errText.includes("too large") ||
                              errText.includes("TPM");
          
          if (isRateLimit || response.status === 401) {
            console.warn(`[Key Rotator] Key failed with rate/limit/auth issue (${response.status}). Rotating to next key...`);
            keyPool.markKeyFailed(key);
            continue;
          }
        }

        // If it's a 5xx error, try next key
        if (response.status >= 500) {
            keyPool.markKeyFailed(key);
            continue;
        }

        return response;
      } catch (error) {
        keyPool.markKeyFailed(key);
      }
    }
    
    // If we are here, current provider is exhausted, loop will try next provider
    console.warn("Provider " + currentProvider + " exhausted. Trying fallback...");
  }

  throw new Error("Critical: All AI providers and keys are currently unavailable. Please try again in a moment.");
}
