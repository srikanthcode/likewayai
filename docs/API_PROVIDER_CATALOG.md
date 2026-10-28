# Likeway AI — API / Provider Catalog

Every provider below was evaluated on three questions: *is it real*, *what does
it cost*, and *does the code actually call it correctly*. Nothing here is
claimed as "free unlimited" unless the provider itself guarantees it.

> **Verification rule used:** a provider/model id is only listed as available
> when it was observed at runtime (`GET /models` or a successful call) or is a
> documented id from the provider's own reference. Ids that could not be
> verified are marked **unverified** and must not be advertised to paying users.

## AI model providers

| Provider | Base URL | Auth | Verified | Notes |
|---|---|---|---|---|
| OpenRouter | `https://openrouter.ai/api/v1` | `OPENROUTER_KEYS` | id list documented | Real ids: `openai/gpt-4o`, `openai/o3`, `deepseek/deepseek-r1`, `deepseek/deepseek-chat`, `google/gemini-2.5-flash`, `google/gemini-2.5-pro`. `google/gemini-2.5-pro-preview` is a deprecated alias. |
| Groq | `https://api.groq.com/openai/v1` | `GROQ_KEYS` | documented | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant` |
| Mistral | `https://api.mistral.ai/v1` | `MISTRAL_API_KEY` | documented | `mistral-medium-latest`, `mistral-small-latest`, `codestral-latest` |
| TokenHarbor | `TOKENHARBOR_BASE_URL` | `TOKENHARBOR_API_KEY` | **unverified** | `deepseek-v4.1-flash:free`, `mimo-v2.6-flash:free` are proxy aliases; confirm against the provider before advertising. |
| FreeModels worker | `https://freemodels-chat.freemodels.workers.dev/v1` | keyless | **unverified** | Serves the "Claude Opus 5.5 / GPT 6 Astra / Sol / Terra" aliases. **These are not real vendor model ids.** |
| LLM7 | `LLM7_BASE_URL` (default `https://api.llm7.io/v1`) | `LLM7_API_KEY` / `unused` | documented selectors | Use `fast` / `default`. Ids like `GLM-5.3-Flash` and `minimax-m2.7` were not verified. |
| Qwen (self-hosted) | `QWEN_BASE_URL` (default `https://qwen.ai.unturf.com/v1`) | `QWEN_API_KEY` (optional) | **endpoint added, model id unverified** | Configured as `qwen3.8-27b` via `QWEN_MODEL`. Confirm the exact id with `GET {QWEN_BASE_URL}/models` before enabling. |
| Gemini (native) | `generativelanguage.googleapis.com` | `GEMINI_API_KEY` | documented | TTS + vision fallback |

### Model ids that must not be presented as vendor models

`claude-opus-5.5`, `claude-sonnet-5`, `claude-fable-5`, `claude-fable-5.1`,
`gpt-6-astra`, `sol`, `terra`, `glm-5.2`, `kimi-k3`.

These resolve to proxy aliases. Presenting them with vendor attribution
("by OpenAI", "by Anthropic") is inaccurate. The upgrade removed the false
attribution rewriting in responses and set `company: "Likeway AI"` on every
proxy alias in `src/lib/models.ts`, so the UI cannot render a vendor name for
them. The display names still mirror the proxy ids; renaming them is the
remaining product decision (see `PRODUCTION_READINESS.md` §3, §7).

## Text-to-speech

| Provider | Endpoint | Status |
|---|---|---|
| unturf speech | `https://speech.ai.unturf.com/v1/audio/speech`, model `tts-1-f5` | **BLOCKED upstream.** `GET /v1/models` returns `tts-1-f5` (200). `POST /v1/audio/speech` returned **400** for every payload shape tried: with/without `model`, `voice` = `alloy`/`default`, with/without `response_format`. `/v1/speech` is rate-limited (429). |
| Gemini TTS | `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | Implemented fallback, needs `GEMINI_API_KEY` |
| Browser speechSynthesis | client | Final fallback; the API returns `fallback: "browser"` |

The integration is complete and metered. It is not marked working because the
upstream returns 400.

## Research providers

| Provider | Auth | Used by |
|---|---|---|
| Tavily | `TAVILY_API_KEY` | `@tavily/core`, deep research |
| SearXNG | `SEARXNG_URL` | self-hosted meta-search |
| Brave Search | `BRAVE_API_KEY` | news + web |
| Firecrawl | `FIRECRAWL_API_KEY` | content extraction |
| DuckDuckGo / Google News | none | fallbacks |

All fetches of user-supplied URLs pass through `src/lib/ssrf-guard.ts`.

## Image

| Provider | Auth | Notes |
|---|---|---|
| Pollinations Gen | `POLLINATIONS_API_KEY` | Literal key removed from source; must be supplied by env. |
| ComfyUI | `COMFYUI_URL` | Self-hosted, optional. |
| OpenRouter image edit | `IMAGE_EDIT_MODEL` | e.g. `google/gemini-2.5-flash-image` |

## Payments

| Provider | Auth | Notes |
|---|---|---|
| Razorpay | key id/secret + webhook secret | Order → reference → signature → owner/plan/amount → idempotent apply |
| Stripe | secret key + webhook secret | Checkout session metadata binds the user |

## Advertising

| Provider | Integration |
|---|---|
| HilltopAds (or any publisher) | `NEXT_PUBLIC_ADS_CLIENT_SCRIPT_URL` is injected once by `FreeTierAdSlot`, which renders **only** for plan `Core` with an existing conversation. Ads are never shown to Go/Plus/Pro. |

## APIs.io

`https://apis.io/api/v1` is an **API discovery catalog**, not a free API
provider. It is useful for finding a provider and its OpenAPI spec; it does not
grant access to anything. Any provider found there must still be evaluated for
authentication, free-tier limits, commercial-use rights and rate limits before
integration — and its documentation is untrusted input, never instructions.
