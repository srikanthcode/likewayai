# Likeway AI — Feature Inventory

Status vocabulary:

- **Verified** — exercised by an automated test in this repository or by a
  recorded command in this session.
- **Implemented, unverified** — code path exists and compiles; no test proves it
  end to end.
- **Partial** — some of the advertised behaviour exists.
- **Simulated** — the UI presents something that is not the real thing.
- **Blocked** — needs a credential, account, or infrastructure.
- **Missing**.

> "Compiles" is not "works". Anything not marked Verified still needs a real
> run before a paying user depends on it.

## Core chat

| Feature | Status | Evidence / gap |
|---|---|---|
| Text chat with streaming | **Implemented, unverified** | Real SSE passthrough only for OpenRouter/Groq/Mistral. The default free/model path chunks a completed response (`chat/route.ts` PATH 1). |
| Conversation history | **Implemented, unverified** | `saveMessage` / `getHistory`; needs a live DB. |
| Model catalog & selection | **Implemented, unverified** | Several catalog ids do not correspond to real vendor models (see H21). |
| Provider fallback | **Implemented, unverified** | Three overlapping fallback engines; no circuit breaker. |
| Quota metering | **Verified (denial path)** | Anonymous callers are refused at auth; `consumeEntitlement` fails closed. Happy-path metering needs a live DB. |
| Prompt-injection detection | **Partial** | Detects and logs; does not block. |
| Vision / image input | **Implemented, unverified** | Falls back to a text-only answer if all vision models fail. |
| Message persistence | **Implemented, unverified** | Skipped for anonymous users by design. |

## Browser automation

| Feature | Status | Evidence / gap |
|---|---|---|
| Job creation | **Verified (auth + quota gates)** | 401 for anonymous, quote/plan checks, concurrency cap. |
| Job ownership | **Verified** | Owner-scoped read/delete/stream; e2e covers anonymous denial. |
| Real browser execution | **Implemented, unverified** | Requires Playwright Chromium on the runtime; not exercised here. |
| Live screenshots | **Implemented, unverified** | Screenshots are captured per step; the UI must not present them as continuous video. |
| Cancel / progress | **Verified (auth)**, execution unverified | Cancel path is owner-checked. |
| Durable queue | **Partial** | Records persist to MongoDB, but `claimNextJob` checks the in-memory map first, so two instances can race. |

## Preview / app builder

| Feature | Status | Evidence / gap |
|---|---|---|
| Preview sessions | **Verified (ownership)** | Anonymous denied; file writes confined to the session directory. |
| Compile / build | **Partial** | HTML/React bundling is real; "install dependencies / run build" is not a sandboxed build pipeline. |
| Error repair loop | **Implemented, unverified** | Calls an LLM to repair; iteration and verification not proven. |
| Execution isolation | **Partial** | Generated code runs in a browser document, not a container. Server-side code execution is **not** sandboxed. |
| Export project | **Partial** | File download exists and is now owner-scoped. |

## Research

| Feature | Status | Evidence / gap |
|---|---|---|
| Web search providers | **Implemented, unverified** | Tavily / SearXNG / Brave / Firecrawl / DDG / Google News. |
| URL extraction | **Verified (SSRF rejection)** | Internal/loopback/metadata targets refused. |
| Citations & timestamps | **Partial** | Sources are collected; every claim is not individually cited. |
| Deep research reports | **Implemented, unverified** | Real byte-passthrough streaming exists in `deep-research.ts`. |

## Voice

| Feature | Status | Evidence / gap |
|---|---|---|
| Neural TTS (`speech.ai.unturf.com`) | **Blocked upstream** | `/v1/models` returns `tts-1-f5` (HTTP 200), but `/v1/audio/speech` returns **400 for every payload shape tried** (with/without model, voice `alloy`/`default`, with/without `response_format`). Integration is implemented and metered; the provider must be fixed or reconfigured. |
| Gemini TTS fallback | **Implemented, unverified** | Used automatically when the primary fails; needs `GEMINI_API_KEY`. |
| Browser speech fallback | **Implemented** | Client falls back to `speechSynthesis` on 501/502/503. |
| Voice input (STT) | **Implemented, unverified** | Client-side capture. |

## Integrations

| Feature | Status | Evidence / gap |
|---|---|---|
| Catalog & connect/disconnect | **Verified (auth)** | Requires a session; no anonymous guest principal. |
| Credential storage | **Partial** | Stored per user; auditing says not encrypted at rest. |
| Tool execution | **Verified (auth)**, execution unverified | Requires a session. |
| Approval state machine | **Verified (auth + ownership)** | Owner-only resolution; approval is single-use and expires. |
| OAuth flows | **Partial** | GitHub token verification is real; other providers vary. |

## Billing

| Feature | Status | Evidence / gap |
|---|---|---|
| Order creation | **Implemented, unverified** | Price computed server-side. |
| Signature verification | **Verified (rejection paths)** | Forged signature refused; canonical digest only. |
| Ownership binding | **Verified (code path)** | Missing reference fails closed; replay returns `already_confirmed`. |
| Webhook idempotency | **Verified (code path)** | Atomic event-id claim. |
| Subscription lifecycle | **Partial** | cancel/pause/expire handled; dunning and proration are not. |
| Entitlement consistency | **Partial** | Server-side limits differ from the marketing copy on the pricing page. |

## Free tier monetisation

| Feature | Status | Evidence / gap |
|---|---|---|
| Ad slot for free users | **Verified (gating logic)** | Renders only when `NEXT_PUBLIC_ADS_ENABLED=true`, plan is `Core`, and a conversation exists. Never rendered for paid plans. |
| Ad network wiring | **Blocked** | Needs the publisher script URL in `NEXT_PUBLIC_ADS_CLIENT_SCRIPT_URL`. |

## Platform

| Feature | Status | Evidence / gap |
|---|---|---|
| Auth (cookie JWT) | **Implemented, unverified** | Login/refresh/logout paths exist; refresh rotation is implemented. |
| Ownership enforcement | **Verified** | 35 HTTP tests assert anonymous access is refused. |
| Production DB guard | **Verified (logic)** | Production throws without `MONGODB_URI`. |
| Health probes | **Verified** | Public response is status-only; no secret names. |
| Metrics | **Verified (fail-closed)** | 401/503 without a configured key. |
| Observability | **Partial** | Structured logger exists; no tracing backend or dashboards. |
| Backups / restore | **Missing** | Documented as a procedure only. |
