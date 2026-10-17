import { API_KEYS } from "@/config/keys";

type Provider = "openrouter" | "groq" | "mistral" | "image" | "freemodels" | "tokenharbor";

// ── Model mapping for each provider ──────────────────────────────────────
// Key insight: Direct Mistral API expects model names WITHOUT "mistral/" prefix
// OpenRouter expects model names WITH "mistral/" prefix (provider/model format)
const FALLBACK_MODELS: Record<Provider, string> = {
  mistral: "mistral-medium-latest",     // Direct Mistral API: NO prefix
  groq: "llama-3.3-70b-versatile",
  openrouter: "google/gemini-2.5-flash",
  image: "",
  freemodels: "llama-3.3-70b-versatile", // fallback within free proxy
  tokenharbor: "mimo-v2.6-flash:free",   // default to mimo for tokenharbor
};

// TokenHarbor API key — server-side only. MUST come from the environment;
// it is never hardcoded in source. Set TOKENHARBOR_API_KEY in .env / Vercel.
const TOKENHARBOR_API_KEY = process.env.TOKENHARBOR_API_KEY || "";
const TOKENHARBOR_BASE_URL = process.env.TOKENHARBOR_BASE_URL || "https://tokenharbor.ai/v1";

const PROVIDER_INFO: Record<Provider, { envVar: string; url: string }> = {
  groq: { envVar: "GROQ_KEYS", url: "https://api.groq.com/openai/v1/chat/completions" },
  openrouter: { envVar: "OPENROUTER_KEYS", url: "https://openrouter.ai/api/v1/chat/completions" },
  mistral: { envVar: "MISTRAL_API_KEY", url: "https://api.mistral.ai/v1/chat/completions" },
  image: { envVar: "IMAGE_GENERATION_KEYS", url: "https://api.deepai.org/api/text2img" },
  freemodels: { envVar: "", url: "https://freemodels-chat.freemodels.workers.dev/v1/chat/completions" },
  tokenharbor: { envVar: "TOKENHARBOR_API_KEY", url: `${TOKENHARBOR_BASE_URL}/chat/completions` },
};

class KeyPool {
  private keys: Record<Provider, string[]>;
  private indices: Record<Provider, number>;
  private failedKeys: Set<string> = new Set();

  constructor() {
    this.keys = {
      openrouter: API_KEYS.openrouter || [],
      groq: API_KEYS.groq || [],
      mistral: API_KEYS.mistral || [],
      image: API_KEYS.image || [],
      freemodels: [], // no API key needed — direct fetch in route
      tokenharbor: [TOKENHARBOR_API_KEY].filter(Boolean), // TokenHarbor key
    };
    this.indices = {
      openrouter: 0,
      groq: 0,
      mistral: 0,
      image: 0,
      freemodels: 0,
      tokenharbor: 0,
    };
  }

  /** Count of valid keys for a provider */
  keyCount(provider: Provider): number {
    return this.keys[provider]?.length || 0;
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
  const info = PROVIDER_INFO[p];
  const count = keyPool.keyCount(p);
  return `${p}: ${count > 0 ? `✅ ${count} key(s)` : `❌ MISSING — set ${info.envVar}`}`;
});
console.log("[LikeWay API] Provider pool status:\n" + _providerStatus.join("\n"));

// ── Helper: Build fallback model for a provider ──────────────────────────
// Mistral direct API: "mistral-medium-latest" (no prefix)
// OpenRouter: "mistral/mistral-medium-latest" (with prefix)
function getFallbackModel(provider: Provider, originalModel: string): string {
  const base = FALLBACK_MODELS[provider] || "mistral-medium-latest";
  return base;
}

// ── Helper: log provider attempt details ─────────────────────────────────
function logAttempt(
  provider: Provider,
  model: string,
  status: number | string,
  message: string,
  isFallback: boolean
) {
  const tag = isFallback ? "[Fallback]" : "[Primary]";
  console.log(
    `${tag} ${provider} | model=${model} | status=${status} | ${message}`
  );
}

export async function fetchAI(provider: Provider, url: string, options: any) {
  // ── TokenHarbor handler (OpenAI-compatible, Bearer auth) ─────────────
  if (provider === "tokenharbor") {
    try {
      let bodyObj: any = {};
      try {
        bodyObj = typeof options.body === "string" ? JSON.parse(options.body) : (options.body || {});
      } catch {}

      const thRes = await fetch(`${TOKENHARBOR_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TOKENHARBOR_API_KEY}`,
        },
        body: JSON.stringify({
          model: bodyObj.model || "mimo-v2.6-flash:free",
          messages: bodyObj.messages || [],
          stream: !!bodyObj.stream,
          temperature: bodyObj.temperature ?? 0.7,
          max_tokens: bodyObj.max_tokens,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (thRes.ok) {
        if (!bodyObj.stream) {
          const rawJson = await thRes.json();
          const content = rawJson.choices?.[0]?.message?.content || rawJson.content || "";
          const normalized = {
            choices: [{ message: { content, role: "assistant" } }],
            content,
            usage: rawJson.usage || { total_tokens: Math.ceil(content.length / 4) },
          };
          return new Response(JSON.stringify(normalized), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return thRes;
      }
      console.warn("[fetchAI] TokenHarbor returned error status:", thRes.status, await thRes.text().catch(() => ""));
    } catch (err) {
      console.warn("[fetchAI] TokenHarbor request failed:", err);
    }
    // Fall back to freemodels proxy if TokenHarbor fails
    provider = "freemodels";
  }

  // freemodels proxy handler — no API key needed
  if (provider === "freemodels") {
    try {
      let bodyObj: any = {};
      try {
        bodyObj = typeof options.body === "string" ? JSON.parse(options.body) : (options.body || {});
      } catch {}

      const proxyRes = await fetch("https://freemodels-chat.freemodels.workers.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "https://freemodels.pro",
          "Referer": "https://freemodels.pro/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        },
        body: JSON.stringify({
          model: bodyObj.model || "gpt-6-astra",
          messages: bodyObj.messages || [],
          stream: !!bodyObj.stream,
          temperature: bodyObj.temperature ?? 0.7,
          max_tokens: bodyObj.max_tokens,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (proxyRes.ok) {
        if (!bodyObj.stream) {
          const rawJson = await proxyRes.json();
          const content = rawJson.content || rawJson.choices?.[0]?.message?.content || "";
          const normalized = {
            choices: [{ message: { content, role: "assistant" } }],
            content,
            usage: rawJson.usage || { total_tokens: Math.ceil(content.length / 4) },
          };
          return new Response(JSON.stringify(normalized), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return proxyRes;
      }
      console.warn("[fetchAI] freemodels proxy returned error status:", proxyRes.status);
    } catch (err) {
      console.warn("[fetchAI] freemodels proxy request failed:", err);
    }
    // Fall back to openrouter if proxy fails
    provider = "openrouter";
  }

  // Build fallback order: primary provider first, then fallbacks
  const providerOrder: Provider[] = [];
  const allProviders: Provider[] = ["openrouter", "groq", "mistral"];
  
  // Put the requested provider first
  if (allProviders.includes(provider)) {
    providerOrder.push(provider);
    // Add remaining providers as fallbacks (preserving order while removing duplicates)
    for (const p of allProviders) {
      if (p !== provider) providerOrder.push(p);
    }
  } else {
    // Unknown provider, try all
    providerOrder.push(...allProviders);
  }

  // Extract the original model from request body
  let originalModel = "";
  try {
    if (options.body) {
      const bodyObj = JSON.parse(options.body);
      originalModel = bodyObj.model || "";
    }
  } catch {}

  // Track which providers we've tried for detailed error reporting
  const triedProviders: string[] = [];
  
  for (const currentProvider of providerOrder) {
    const info = PROVIDER_INFO[currentProvider];
    const currentUrl = info.url;
    const fallbackModel = getFallbackModel(currentProvider, originalModel);

    // Check if provider has any keys configured
    if (keyPool.keyCount(currentProvider) === 0) {
      // Skip providers with no keys configured
      if (currentProvider !== provider) {
        logAttempt(currentProvider, fallbackModel, "SKIP", "No keys configured", currentProvider !== provider);
        continue;
      }
      // If the primary provider has no keys, we'll let it fail gracefully and fall through
    }

    // Build request options with correct model for this provider
    let requestOptions = options;
    if (options.body && currentProvider !== provider) {
      try {
        const bodyObj = JSON.parse(options.body);
        bodyObj.model = fallbackModel;
        requestOptions = {
          ...options,
          body: JSON.stringify(bodyObj),
        };
        logAttempt(currentProvider, fallbackModel, "→", "Model mapped for fallback", true);
      } catch (e) {
        logAttempt(currentProvider, fallbackModel, "WARN", `Body translation failed: ${e}`, true);
      }
    }

    // Try all keys for current provider
    let providerAttempts = 0;
    const maxProviderAttempts = 6; // Enough to try all keys + one self-healing reset cycle
    
    while (true) {
      const key = keyPool.getNextKey(currentProvider);
      if (key === null) break;
      providerAttempts++;
      if (providerAttempts > maxProviderAttempts) break;

      triedProviders.push(`${currentProvider}#${providerAttempts}`);

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

        // Extract error text for logging
        let errText = "";
        if (!response.ok) {
          errText = await response.clone().text().catch(() => "");
        }

    // Determine failure type
        if (!response.ok) {
          const isRateLimit = response.status === 429 || 
                              response.status === 413 || 
                              errText.includes("rate_limit") || 
                              errText.includes("rate_limit_exceeded") ||
                              errText.includes("tokens per minute") ||
                              errText.includes("Limit") ||
                              errText.includes("too large") ||
                              errText.includes("TPM");
          
          const isAuthError = response.status === 401 || response.status === 403;
          const isServerError = response.status >= 500;
          const isTimeout = response.status === 408 || errText.includes("timeout");
          const isInvalidModel = response.status === 400 && 
            (errText.includes("model") || errText.includes("not found") || errText.includes("does not exist"));
          const isQuotaExceeded = response.status === 402 || errText.includes("quota") || errText.includes("insufficient_quota");

          let failureType = "unknown";
          if (isRateLimit) failureType = "rate_limit";
          else if (isAuthError) failureType = "auth_error";
          else if (isQuotaExceeded) failureType = "quota_exceeded";
          else if (isTimeout) failureType = "timeout";
          else if (isInvalidModel) failureType = "invalid_model";
          else if (isServerError) failureType = "server_error";

          logAttempt(
            currentProvider, fallbackModel, response.status,
            `[${failureType}] ${errText.slice(0, 80)}`,
            currentProvider !== provider
          );

          if (isRateLimit || isAuthError || isServerError || isQuotaExceeded) {
            keyPool.markKeyFailed(key);
            continue; // Try next key
          }

          if (isInvalidModel) {
            // Don't mark key as failed - model issue is not key-related
            // But don't retry this provider with same model - break to next provider
            break;
          }

          // Other errors: try next key
          keyPool.markKeyFailed(key);
          continue;
        }

        // SUCCESS!
        logAttempt(
          currentProvider, fallbackModel, response.status,
          "OK",
          currentProvider !== provider
        );
        return response;
      } catch (error: any) {
        const errMsg = error.message?.slice(0, 100) || "Unknown error";
        const isTimeout = error.name === "AbortError";
        const isDNS = errMsg.includes("ENOTFOUND") || errMsg.includes("ECONNREFUSED") || errMsg.includes("ECONNRESET");
        const isNetwork = errMsg.includes("network") || errMsg.includes("socket") || errMsg.includes("fetch failed");

        let failureType = "network_error";
        if (isTimeout) failureType = "timeout";
        else if (isDNS) failureType = "connection_error";
        else if (isNetwork) failureType = "network_error";

        logAttempt(
          currentProvider, fallbackModel, "NET_ERROR",
          `[${failureType}] ${errMsg}${isTimeout ? " (timeout 30s)" : ""}`,
          currentProvider !== provider
        );
        keyPool.markKeyFailed(key);
      }
    }

    // This provider is exhausted, try the next one
    logAttempt(
      currentProvider, FALLBACK_MODELS[currentProvider] || "?", "EXHAUSTED",
      "All keys tried, moving to next provider",
      currentProvider !== provider
    );
  }

  // ── ALL PROVIDERS EXHAUSTED ────────────────────────────────────────────
  // Determine the reason for detailed error message
  const configuredProviders = allProviders.filter(p => keyPool.keyCount(p) > 0);
  const triedSet = new Set(triedProviders.map(t => t.split("#")[0]));

  if (configuredProviders.length === 0) {
    throw new Error(
      "No API keys configured. Set MISTRAL_API_KEY, GROQ_KEYS, and OPENROUTER_KEYS in your environment variables."
    );
  }

  const failedProviders = configuredProviders
    .map(p => `${p} (${keyPool.keyCount(p)} key(s))`)
    .join(", ");

  throw new Error(
    `All AI providers and keys are currently unavailable. Tried: ${failedProviders}. Check provider status and try again in a moment.`
  );
}
