# Likeway AI — Full Codebase Audit Report

**Repository:** `C:\Users\Lenovo\my first app`  
**Audit date:** 2026-10-21  
**Audit type:** Static code, configuration, documentation, and attack-surface review  
**Scope:** `src/`, API routes, authentication, plans/entitlements, payments, integrations, automation, preview, data model, deployment configuration, and existing audit dashboard  
**Out of scope:** Live exploitation, production payment execution, load testing, and destructive testing. No production credentials were used and no secret values are reproduced in this report.

---

## 1. Executive Summary

Likeway AI is a broad, substantial AI platform rather than a thin demo. It contains a real Next.js application, a large chat surface, provider fallback logic, subscription flows, image generation, deep research, browser automation, local computer control, document tools, project workspaces, integrations, and an existing static audit dashboard.

The central problem is not lack of features. It is that **trust boundaries, billing state, identity, and user-facing claims are not consistently enforced**. Several capabilities are real, several are partial, and several are presented more strongly than the implementation supports. The highest-risk issues are concentrated in committed payment credentials, unauthenticated or spoofable APIs, executable preview isolation, incomplete ownership checks, and payment activation logic.

### Headline verdict

| Area | Rating | Verdict |
|---|---:|---|
| Architecture and breadth | 6/10 | Ambitious and functional, but concentrated in very large modules. |
| Security and trust boundaries | 3/10 | Multiple critical issues; not production-safe as-is. |
| Payment integrity | 4/10 | Server-side pricing is generally correct, but activation paths accept incomplete evidence. |
| Reliability and scalability | 4/10 | Important state is held in process memory; database fallback is ephemeral. |
| Feature integrity | 5/10 | Many real features; several are partial, simulated, or misleadingly branded. |
| Code quality and maintainability | 5/10 | Understandable in places, but monolithic files and dead security paths. |
| Documentation accuracy | 4/10 | Prior reports contain false or outdated claims; dashboard is partly stale. |
| Operational readiness | 4/10 | Deployable, but not safely operable without immediate remediation. |

**Overall production-readiness assessment: 4/10.** The application can run and demonstrate substantial functionality, but it should not be treated as a secure or financially trustworthy production system until the P0 findings are resolved.

### The five issues that matter most

1. **Committed live payment credentials.** `PRODUCTION_ENV.txt` was tracked in git commit `56623a1` with live Razorpay key/secret material. Rotation and history purge are mandatory.
2. **Unauthenticated local command execution surface.** `system/control` passes a user-controlled app name into a PowerShell `-like` expression. On a local/companion host this is a command-injection path.
3. **Executable preview runs on the application origin.** Generated HTML is served without sandboxing and rendered in an iframe with `allow-same-origin` and `allow-scripts`, creating a stored-XSS/session-theft path.
4. **Ownership is not enforced on generated files and automation jobs.** Generated files can be fetched with only an object ID, and automation job records/streams are unauthenticated.
5. **Payment activation trusts incomplete evidence.** Stripe confirmation accepts `status === "complete"` even when unpaid, and the webhook activates checkout sessions without checking `payment_status`. Razorpay confirmation falls back to client-supplied plan data when a payment reference is absent.

---

## 2. Method and Evidence Standard

### What was reviewed

- All 61 `route.ts` files under `src/app/api`.
- Core libraries: authentication, JWT/session handling, plans, entitlements, rate limits, MongoDB access, model routing, provider fallback, browser automation, preview, integrations, payments, and user data.
- Main pages and components, especially the chat page, pricing, account, login, and preview workspace.
- Deployment files: `Dockerfile`, `render.yaml`, `vercel.json`, `next.config.ts`, environment validation, and `.env.example`.
- Documentation: `README.md`, `SETUP.md`, `DEPLOYMENT.md`, `TODO.md`, `PRODUCTION_READINESS_REPORT.md`, and the existing `codebase-audit/` dashboard.

### What was not done

- No production or staging account was used.
- No payment was initiated or confirmed.
- No exploit was executed against a live system.
- No full browser DAST, load test, or dependency CVE scan was run.
- `npm run build`, `npm run lint`, and the E2E suite were not run as part of this static review.

### Evidence standard

Findings are marked **Verified** when the code path and enforcement were directly read. Findings are marked **Unverified** where behavior could not be confirmed without runtime execution or environment-specific configuration. Existing dashboard claims were treated as hypotheses, not evidence.

---

## 3. System Overview

### 3.1 Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6, App Router |
| UI | React 19.2.4, TypeScript, Tailwind CSS, Framer Motion, Radix, Lucide |
| Runtime | Node.js, Docker, Render and/or Vercel |
| Database | MongoDB driver; optional in-memory mock fallback |
| AI providers | OpenRouter, Groq, Mistral, FreeModels worker, TokenHarbor, LLM7 |
| Payments | Razorpay (orders/subscriptions), Stripe Checkout |
| Automation | Playwright Chromium, local companion on port 4141 |
| Documents | `docx`, `exceljs`, `pdf-lib`, `pdfkit`, `pptxgenjs` |
| Research/search | Tavily, SearXNG, Brave, Firecrawl, DuckDuckGo, Google News |
| Media | ComfyUI, Pollinations, Gemini TTS |

### 3.2 Scale

| Metric | Current value |
|---|---:|
| TypeScript/TSX files | 210 |
| Lines in TypeScript/TSX | 49,467 |
| Bytes in TypeScript/TSX | 2,079,873 |
| API route files | 61 |
| Exported HTTP methods | 88 |
| Business handlers (excluding OPTIONS) | 83 |
| Static dashboard files | 5 |
| Largest source file | `src/app/page.tsx` — 4,744 lines |

The existing dashboard reports 211 source files and 46,132 lines. That is stale: the current tree contains 210 `.ts/.tsx` files and 49,467 lines; the 211 figure likely includes one CSS file. Route and handler counts still reconcile: 83 business handlers plus 5 OPTIONS exports.

### 3.3 Architecture in one view

```text
Browser
  |
  |-- Next.js App Router pages
  |     |-- monolithic chat UI (page.tsx)
  |     |-- pricing, auth, account, learn, legal
  |     |-- preview workspace / visible browser
  |
  |-- /api/* route handlers
        |-- Auth: JWT access/refresh cookies, Google, guest
        |-- Chat: model allowlist, rate limit, plan limits, SSE
        |     |-- primary provider via api-manager
        |     |-- free-worker fallback
        |     |-- LLM7 fallback
        |-- Feature routes: image, voice, TTS, research, browser
        |-- Automation: local Playwright or Render proxy
        |-- Integrations: registry + in-memory credentials
        |-- Payments: Razorpay / Stripe
        |-- Data: MongoDB + in-memory fallback
        |-- Preview: generated HTML served from app origin
```

### 3.4 Request and data flows

**Chat flow**

1. `POST /api/chat` reads cookies and resolves a user ID. Missing authentication becomes `"anonymous"`.
2. The effective plan is resolved from the JWT, with a database lookup that only overrides when the DB plan is active and not Core.
3. The requested model is checked against the plan allowlist.
4. Prompt validation, injection detection, and sanitization run.
5. Per-minute rate limiting runs in memory.
6. A daily message limit runs, but paid plans and four named Core models bypass it.
7. The request is routed to autonomous build, deep research, browser mode, image generation, image editing, or normal chat.
8. Primary providers are attempted; failures fall back to a free worker and then LLM7.
9. Responses are streamed as SSE. Fallback worker replies are often emitted as simulated stream chunks.

**Payment flow**

1. Client calls `create-order` or `subscription/create`; both require JWT and derive the amount from the server-side plan definition.
2. A payment reference is recorded in `payment_refs`.
3. Razorpay checkout returns payment/order IDs and a signature.
4. `subscription/confirm` verifies the HMAC, checks the stored reference when present, updates the user plan, marks the reference paid, and rotates cookies.
5. Stripe uses Checkout Sessions and a webhook. The Stripe branch of confirm retrieves the session and checks status, but not amount or payment status strictly.

**Preview flow**

1. Preview sessions are created without authentication.
2. Generated HTML is stored and served by `/api/preview/render/[id]`.
3. `LivePreviewWorkspace` renders it via `srcDoc` with `sandbox="allow-scripts allow-forms allow-same-origin allow-modals"`.
4. Because `allow-same-origin` and `allow-scripts` coexist, preview JavaScript is not isolated from the application origin.

---

## 4. Repository Map

| Path | Purpose | Notes |
|---|---|---|
| `src/app/page.tsx` | Main chat experience | 4,744 lines; `ChatPage` starts around line 609. |
| `src/app/api/chat/route.ts` | Chat API, routing, fallbacks, streaming | 1,992 lines; highest-risk business logic. |
| `src/app/api/*` | 61 route files | Auth, AI, automation, payments, user, system. |
| `src/components/` | UI components | Preview, browser, voice, account, auth, artifacts. |
| `src/lib/` | Core business logic | Auth, plans, entitlements, models, Mongo, tools, integrations. |
| `src/lib/automation/` | Playwright planner/executor | Local and Render execution. |
| `src/lib/autonomous/` | App/game generation engine | Workspace generation. |
| `src/lib/integrations/` | Integration registry and credential store | In-memory credentials. |
| `src/lib/learn/` | Learn subject content | Large content file; some question stubs. |
| `companion/` | Local desktop companion | Port 4141. |
| `e2e/`, `tests/` | Browser and evaluation tests | Coverage not established in this review. |
| `codebase-audit/` | Existing static audit dashboard | Partly stale; useful as a prior assessment. |
| `workspaces/` | Generated project output | Runtime user content. |

### Largest files

| File | Lines / size | Risk |
|---|---:|---|
| `src/app/page.tsx` | 4,744 / 232 KB | Client complexity, state coupling, hard to test. |
| `src/lib/learn/subjects.ts` | 957 lines / 167 KB | Content-heavy; stub questions. |
| `src/lib/automation/browser-engine.ts` | 98 KB | Automation complexity and long-running work. |
| `src/app/api/chat/route.ts` | 1,992 lines / 90 KB | Security, entitlements, provider fallback, streaming. |
| `src/app/account/page.tsx` | 39 KB | Account data surface. |
| `src/lib/agent-registry.ts` | 38 KB | 50+ agent definitions. |
| `src/lib/autonomous/engine.ts` | 34 KB | Code-generation execution. |
| `src/app/pricing/page.tsx` | 32 KB | Payment client flow. |

---

## 5. Feature Inventory

Status definitions: **Implemented** means a real server/client path exists; **Partial** means the feature works only under conditions or lacks a complete production path; **Mocked/Simulated** means the UI or response represents something that is not actually happening; **Missing** means absent; **Blocked** means gated, disabled, or impossible without external setup.

| Capability | Status | Evidence and caveat |
|---|---|---|
| Email/password authentication | Partial | Register/login and rate limiting exist; no email verification observed. |
| Google OAuth | Partial | Verified ID token and state cookie; no PKCE/nonce, no rate limit observed. |
| Guest mode | Implemented (ephemeral) | In-memory fake user and JWT; data disappears on restart. |
| JWT access/refresh sessions | Implemented | Cookies, refresh rotation, session revocation routes. |
| CSRF protection | Missing in practice | Helpers exist but no route/middleware call sites. |
| Chat UI and SSE | Implemented | Primary streaming is real; fallback replies can be simulated. |
| Multi-model catalog | Partial | 23 entries; several are fictional or remapped. |
| Honest model identity | Mocked | Prompts identify the assistant as LikeWay; identity sanitization rewrites model statements. |
| Model fallback | Implemented | Primary → free worker → LLM7; transparency is limited. |
| Per-minute rate limiting | Implemented in memory | Resets on restart; not shared across instances. |
| Daily message limits | Partial | Paid plans bypass; four Core models bypass. |
| Frontier-model metering | Missing | `frontier_models` is defined but never consumed. |
| Image generation | Implemented | ComfyUI/Pollinations; JWT + entitlement on API. |
| Image editing | Partial | Gated in chat; depends on provider availability. |
| Deep research | Implemented | Multi-query pipeline with Tavily/SearXNG/Brave and synthesis. |
| Browser automation | Implemented | Playwright local/Render; direct automation endpoint is unauthenticated. |
| Browser viewport realism | Simulated | `VisibleBrowserWorkspace` is a scripted simulation, not live frames. |
| Computer control | Implemented local-only | Disabled on cloud hosts; PowerShell app detection has injection risk. |
| Voice input | Implemented | Browser/voice UI and premium input components. |
| Voice chat | Partial | JWT + entitlement; realtime provider behavior needs runtime verification. |
| TTS | Partial | Gemini TTS, JWT required, browser fallback; not metered. |
| Autonomous app/game builder | Implemented | Generates projects and writes workspaces; metered in chat only. |
| Projects and workspace files | Implemented | Auth-scoped; deletion clears child collections and directory. |
| Generated file downloads | Implemented but unsafe | Optional auth; object ID is sufficient. |
| File preview | Implemented but unsafe | Same-origin executable HTML; weak CSP. |
| Chat history | Implemented | Auth-scoped delete/list. |
| Persistent memory | Partial | Mongo-backed, but fallback is in-memory. |
| Integrations catalog | Partial | Real handlers for some apps; others are configuration shells. |
| Integration credentials | Partial | In-memory plaintext map; lost on restart. |
| Integration approval | Missing in practice | Approval records exist, but no catalog entry requires approval and execution is not gated afterward. |
| Gmail/Drive/MCP | Partial | Registry handlers exist; OAuth and real credential flow not complete. |
| Learn mode | Partial | Subject content exists; many question arrays are empty stubs. |
| News/search | Implemented | Cached public routes and multiple providers. |
| Support AI | Implemented but unsafe | Public endpoint; accepts arbitrary user identity. |
| Account preferences | Implemented | Auth-scoped. |
| Data export | Partial and unsafe | Includes full sessions with refresh tokens; incomplete collection coverage. |
| Account deletion | Partial | Misses several collections and workspace files. |
| Admin system panel | Partial | Plan override and system controls; not fully audited. |
| Razorpay orders | Implemented | Server-derived INR amount; reference tracking. |
| Razorpay subscriptions | Partial | Auto-provisioning and webhook mapping exist. |
| Stripe checkout | Partial | Session creation is real; confirmation validation is weak. |
| Payment webhooks | Partial | Signature checks exist; Stripe activation lacks payment-status check. |
| Entitlement enforcement | Partial | Fail-open on DB errors; not all metered features enforced. |
| Observability | Partial | Request logs and metrics route; no durable tracing/alerting. |
| Automated tests | Partial | E2E tests exist; no evidence of broad coverage or CI gates. |
| Desktop companion | Partial | Local service and automation integration; not production-hardened. |

---

## 6. Plans and Entitlements

### 6.1 Defined plans

| Plan | Displayed price | Chat messages/day (plan config) | Server entitlement chat/day | Models |
|---|---:|---:|---:|---:|
| Core | Free | 200 | 200 | 4 |
| Go | ₹299 | 99,999 | 10,000 | 18 |
| Plus | ₹799 | 99,999 | 50,000 | 23 |
| Pro | ₹1,999 | 99,999 | Unlimited | All |

Prices in `src/lib/plans.ts` are ₹299 / ₹799 / ₹1,999 and match `PLAN_PRICES_INR` in `pricing/page.tsx`. The console log in `subscription/create` prepends an extra `₹1` when printing, producing a misleading log line such as `₹1299`, but the actual Razorpay amount is calculated from the parsed plan price and is correct.

### 6.2 Exact entitlement matrix

| Feature | Core | Go | Plus | Pro |
|---|---:|---:|---:|---:|
| `chat_messages` | 200 | 10,000 | 50,000 | Unlimited |
| `frontier_models` | 5 | 300 | 1,500 | Unlimited |
| `image_generation` | 3 | 50 | 200 | Unlimited |
| `image_editing` | 0 | 25 | 100 | Unlimited |
| `deep_research` | 2 | 25 | 100 | Unlimited |
| `browser_automation` | 2 | 50 | 500 | Unlimited |
| `computer_control` | 3 | 25 | 500 | Unlimited |
| `realtime_voice` | 5 | 30 | 120 | Unlimited |
| `autonomous_app_builder` | 1 | 10 | 50 | Unlimited |

### 6.3 Plan contradictions

1. **“Unlimited” versus hard limits.** Core feature copy says free unlimited chat, but the plan config says 200 messages/day and the entitlement engine says 200/day. Four named Core models bypass the daily check, which makes the claim true only for those model IDs.
2. **Paid-plan limits are bypassed at the chat layer.** `checkDailyLimit` is called with `isAdmin || plan !== "Core"` as the bypass flag, so Go/Plus never hit the daily message check.
3. **Plan and entitlement message counts disagree.** Go/Plus/Pro have `messagesDay: 99999`, while entitlements model 10,000/50,000/unlimited.
4. **`frontier_models` is dead enforcement.** The feature is defined in `MeteredFeature` but no route calls `consumeEntitlement(..., "frontier_models")`.
5. **Core browser access is inconsistent.** `plans.ts` says 0 browser automation with a 2-day trial; entitlements grant 2 browser actions/day. The trial logic is client-side (`localStorage`) and can be reset by the user.
6. **Core image generation is inconsistent.** `plans.ts` says `imageGen: false`; entitlements grant 3 image generations/day. The server enforces the entitlement, not the plan flag.
7. **Pricing currency is presentation only.** The pricing page converts INR for 11 currencies, but Razorpay charges INR and Stripe uses configured price IDs. The displayed local-currency amount is not charged in that currency.
8. **Native purchase event trusts the client.** `nativePurchaseSuccess` updates local plan state from a browser event; server plan remains authoritative only after a real API refresh.

### 6.4 Stale JWT plan problem

`resolveEffectivePlan` only overrides the token plan when the database returns an active, non-Core plan. If a user downgrades to Core or is deleted, an old 7-day access token still carries the paid plan and is trusted. A database outage similarly falls back to the token. This is a correctness and revenue issue, not merely a UI bug.

---

## 7. API Catalog and Authentication

Auth labels:

- **Public:** no authentication.
- **Optional JWT:** user identity used when present; anonymous fallback otherwise.
- **JWT:** valid access token required.
- **JWT + entitlement:** token plus metered feature check.
- **Signature:** webhook/signature verification.
- **Spoofable:** identity can be supplied by header/body fallback.

### 7.1 Authentication routes

| Route | Methods | Lines | Auth | Notes |
|---|---|---:|---|---|
| `/api/auth/google` | POST | 168 | Public | Google ID-token login. |
| `/api/auth/google/callback` | GET | 176 | Public | Browser OAuth callback; state cookie validation. |
| `/api/auth/google/redirect` | GET | 64 | Public | Starts browser OAuth flow. |
| `/api/auth/guest` | POST, GET | 45 | Public | Creates ephemeral guest identity. |
| `/api/auth/login` | POST | 80 | Public | 10/min per IP; generic error. |
| `/api/auth/logout` | POST | 60 | Public | Clears cookies/session. |
| `/api/auth/me` | GET, PUT | 81 | JWT | Profile read/update. |
| `/api/auth/recovery` | POST, PUT | 87 | Public | OTP-style recovery; rate limited. |
| `/api/auth/refresh` | POST | 107 | Refresh cookie | Rotates access/refresh tokens. |
| `/api/auth/register` | POST | 85 | Public | Account creation. |
| `/api/auth/session` | GET, DELETE | 61 | Optional/refresh | Session recovery/logout helper. |
| `/api/auth/sessions/[id]` | DELETE | 41 | JWT | Owner-scoped session revocation. |

### 7.2 Chat, AI, and research routes

| Route | Methods | Lines | Auth | Notes |
|---|---|---:|---|---|
| `/api/chat` | GET, POST | 1992 | Optional JWT | Anonymous chat allowed; identity fallback `"anonymous"`. |
| `/api/chat/history/[id]` | DELETE | 28 | JWT | Auth-scoped history delete. |
| `/api/chat/history/list` | GET | 56 | JWT | Auth-scoped history list. |
| `/api/voice-chat` | POST | 490 | JWT + `realtime_voice` | Voice model loop. |
| `/api/tts` | POST | 85 | JWT | No entitlement check observed. |
| `/api/generate-image` | POST, GET | 113 | POST JWT + entitlement; GET public | Public GET exposes provider/catalog configuration. |
| `/api/browser-agent` | OPTIONS, POST, GET | 190 | POST JWT/shared secret + entitlement | Server-to-server path uses shared secret. |
| `/api/agent-reach/doctor` | GET | 23 | Public | External connectivity probes. |
| `/api/agent-reach/extract` | POST | 30 | Public | Fetches arbitrary URLs after Jina extraction fallback. |
| `/api/gateway` | OPTIONS, POST | 62 | Public | Direct orchestrator access; spoofable `x-user-id`. |
| `/api/diagnose` | GET | 79 | Optional JWT | Diagnostic information. |
| `/api/learn/generate-questions` | POST | 61 | Public | OpenRouter call; no rate limit. |
| `/api/news` | GET | 223 | Public | Cached news aggregation. |
| `/api/news/search` | POST | 110 | Public | Search proxy. |
| `/api/support` | POST, GET | 225 | Public | AI support; accepts arbitrary user identity. |

### 7.3 Automation, files, and preview routes

| Route | Methods | Lines | Auth | Notes |
|---|---|---:|---|---|
| `/api/automation` | OPTIONS, POST, GET, DELETE | 321 | Public | CORS `*`; spoofable identity; Playwright/browser control. |
| `/api/automation/jobs` | OPTIONS, POST, GET | 145 | Public | Render proxy; identity fallback. |
| `/api/automation/jobs/[id]` | OPTIONS, GET, DELETE | 130 | Public | No ownership check. |
| `/api/automation/jobs/[id]/stream` | GET | 129 | Public | SSE leaks full job data. |
| `/api/files/[id]` | GET | 40 | Optional JWT | User ID may be `undefined`; object-ID download. |
| `/api/preview/render/[id]` | GET | 45 | Public by design | Executable HTML; weak CSP; no sandbox. |
| `/api/preview/repair` | POST | 78 | Public | Unauthenticated AI call. |
| `/api/preview/session` | POST, GET, DELETE | 82 | Public | Session creation/read/delete without auth. |

### 7.4 Payment routes

| Route | Methods | Lines | Auth | Notes |
|---|---|---:|---|---|
| `/api/create-order` | POST | 100 | JWT | Server-derived Razorpay amount; records reference. |
| `/api/checkout` | POST | 68 | JWT | Stripe subscription checkout. |
| `/api/subscription/create` | POST | 105 | JWT | Razorpay recurring subscription. |
| `/api/subscription/confirm` | POST | 210 | JWT | Razorpay HMAC; Stripe session retrieval. |
| `/api/verify-payment` | POST | 58 | Public HMAC | Dual signature check; no user binding. |
| `/api/webhook/razorpay` | POST | 108 | Signature | Raw-body HMAC; tier mapping. |
| `/api/webhook/stripe` | POST | 98 | Signature | Activates checkout without payment-status check. |

### 7.5 User, project, integration, and system routes

| Route | Methods | Lines | Auth | Notes |
|---|---|---:|---|---|
| `/api/user/account` | DELETE | 53 | JWT | Incomplete deletion coverage. |
| `/api/user/api-keys` | GET, POST, DELETE | 99 | JWT | Plaintext keys; dotted-path writes. |
| `/api/user/data` | GET | 62 | JWT | Exports sessions and refresh tokens. |
| `/api/user/plan` | GET, POST | 28 | JWT | POST rejects direct upgrades. |
| `/api/user/preferences` | GET, PUT | 89 | JWT | User preferences. |
| `/api/projects` | GET, POST | 51 | JWT | Owner-scoped. |
| `/api/projects/[id]` | GET, DELETE | 53 | JWT | Owner-scoped. |
| `/api/integrations` | GET, POST | 99 | Spoofable | Cookie JWT → `x-user-id` → `guest-user`. |
| `/api/integrations/approval` | POST | 37 | Public | Resolves approvals without auth. |
| `/api/integrations/execute` | POST | 42 | Spoofable | Executes integration tools with supplied user. |
| `/api/integrations/verify` | POST | 290 | Spoofable | Saves credentials; GitHub/MCP verification; SSRF. |
| `/api/audit` | GET | 41 | JWT | Audit log read. |
| `/api/csrf` | GET | 27 | Public | Issues token; no endpoint enforces it. |
| `/api/health` | GET | 145 | Public | Environment/provider/DB status. |
| `/api/ingest` | POST | 18 | Public | RAG ingestion without auth. |
| `/api/metrics` | GET | 45 | Optional key | Open when `METRICS_API_KEY` is unset. |
| `/api/session` | GET | 65 | Optional/refresh | Session recovery. |
| `/api/system/control` | GET, POST | 68 | GET public; POST JWT + local-host + entitlement | PowerShell app discovery. |
| `/api/system/health` | GET | 57 | Public | Browser sessions, env, heap, provider status. |

---

## 8. Data Model

| Collection / store | Purpose | Deletion coverage | Notes |
|---|---|---|---|
| `users` | Accounts, subscription, API keys | Deleted | Contains subscription and plaintext provider keys. |
| `sessions` | Refresh sessions, device/IP metadata | Deleted | Exported wholesale by `/api/user/data`. |
| `login_history` | Login events | Deleted | PII. |
| `chatmemories` | Chat memory | Deleted | Conversation content. |
| `usage` | Legacy usage records | Deleted | Data export reads this, not `daily_usage`. |
| `daily_usage` | Metered entitlements | **Not deleted** | Leaves per-user usage after account deletion. |
| `payment_refs` | Payment reference/ownership | **Not deleted** | Financial records may need retention; define policy. |
| `audit_logs` | Audit events | **Not deleted** | May contain user identifiers/actions. |
| `generated_files` | Generated files, TTL 7 days | **Not deleted** | 15 MB limit; object-ID access. |
| `projects` | Project metadata | Deleted | Owner-scoped. |
| `project_files` | Project file records | Deleted with project | Child collection. |
| `project_memory` | Project memory | Deleted with project | Child collection. |
| `project_tasks` | Project tasks | Deleted with project | Child collection. |
| `project_conversations` | Project conversations | Deleted with project | Child collection. |
| `personas` | User personas | Deleted | User content. |
| `rate_limits` | Legacy rate-limit state | Deleted | Also in-memory elsewhere. |
| `workspaces/` | Generated project files on disk | **Not deleted** | Orphaned after account deletion. |
| In-memory job queue | Automation jobs | N/A | Lost on restart; max 200. |
| In-memory approvals | Integration approvals | N/A | Lost on restart. |
| In-memory credentials | Integration credentials | N/A | Plaintext; lost on restart. |
| In-memory preview sessions | Preview content | N/A | Lost on restart. |

### Data-handling concerns

- `/api/user/data` returns full session documents, including `refreshToken`. A data export is not a credential export; this turns any read of the export into session-theft material.
- `/api/user/api-keys` returns keys in plaintext and writes them to dotted paths in the user document. A malicious provider name can target nested fields.
- Generated files are stored with `userId`, but retrieval accepts an undefined user ID and does not require a match.
- Account deletion is incomplete and does not remove all user content or derived data.
- The Mongo fallback store is process-local. On a multi-instance deployment, accounts, sessions, and usage can diverge or disappear.

---

## 9. Security Findings

### P0 — Critical: remediate before any production use

#### P0-01: Live payment credentials committed to git

**Evidence:** `PRODUCTION_ENV.txt` tracked in commit `56623a1` (`Razorpay live payment integration - complete setup`) contains live Razorpay key and secret material. `SETUP.md` also warns that live API keys were shared.

**Impact:** Anyone with repository or history access can authenticate to the payment provider, inspect or manipulate payment objects depending on key permissions, and cause financial or reputational damage.

**Remediation:**

1. Rotate the Razorpay key pair immediately; revoke the exposed key.
2. Review provider logs for unauthorized use.
3. Remove the file from the working tree.
4. Purge it from git history with `git filter-repo` or BFG, then force-push and notify collaborators.
5. Add secret scanning to CI and pre-commit hooks.
6. Audit other committed environment files and shell history.

**Do not** merely delete the file in a new commit; history remains exposed.

#### P0-02: PowerShell command injection in local system control

**Evidence:** `src/lib/system/computer-control.ts` builds a PowerShell command with a user-controlled app name:

- `searchPattern` comes from the request or a known app name.
- `Get-StartApps | Where-Object { $_.Name -like "*${searchPattern}*" }` is executed through `execAsync`.
- An unknown app value containing quotes or `$()` can break out of the string context.

`/api/system/control` exposes `GET` without authentication and `POST` after JWT/local-host checks. On a developer or companion host, the route is reachable locally.

**Impact:** Local command execution with the privileges of the Next.js process. A malicious webpage can potentially trigger localhost requests; a logged-in user or local attacker can execute commands.

**Remediation:**

1. Remove string interpolation. Use a fixed script with arguments passed via `-ArgumentList` or environment variables.
2. Validate app identifiers against a strict allowlist before lookup.
3. Require authentication and a CSRF token for all system-control operations.
4. Bind the service to loopback only and require an explicit local consent flow.
5. Do not expose app discovery through GET.

#### P0-03: Executable preview shares the application origin

**Evidence:**

- `/api/preview/render/[id]` serves generated HTML with `Content-Type: text/html` and no sandbox.
- CSP is `frame-ancestors 'self' *`; `X-Frame-Options: SAMEORIGIN`; no `sandbox` directive.
- `LivePreviewWorkspace.tsx` renders preview HTML in `srcDoc` with `sandbox="allow-scripts allow-forms allow-same-origin allow-modals"`.

`allow-scripts` plus `allow-same-origin` lets preview code run with the app origin, access cookies/localStorage, and call authenticated APIs.

**Impact:** Stored XSS, session theft, account takeover, and CSRF against the application. Any user who can influence generated content can attack viewers.

**Remediation:**

1. Serve previews from a separate origin or a dedicated sandbox domain.
2. Remove `allow-same-origin`; if same-origin is unavoidable, remove `allow-scripts`.
3. Add a strict preview CSP with `sandbox`, no `unsafe-inline`, and no `same-origin`.
4. Set `frame-ancestors 'self'` only, not `*`.
5. Add short-lived, scoped preview tokens and per-user ownership.
6. Consider server-side static rendering or a non-executable preview mode.

#### P0-04: Generated file and automation-job IDOR

**Evidence:**

- `/api/files/[id]` extracts a user ID optionally (`payload?.sub`) and calls `getGeneratedFile(id, userId)`. With no cookie, the user ID is `undefined`; the file record is fetched by object ID.
- `/api/automation/jobs/[id]` has no auth and no ownership check.
- `/api/automation/jobs/[id]/stream` has no auth, CORS `*`, and emits the full job record, including screenshots/results.
- `/api/automation` supports unauthenticated POST/GET/DELETE and identity fallback.

**Impact:** Any holder of an object ID can read generated files or automation results. Automated jobs can be created, enumerated, cancelled, or closed by unauthenticated users. This is both a confidentiality and availability issue.

**Remediation:**

1. Require a valid session for file and job reads.
2. Enforce `record.userId === session.userId` at the data layer.
3. Use unguessable, expiring file tokens rather than raw object IDs.
4. Require auth and ownership on job list/read/delete/stream.
5. Rate-limit job creation and cap concurrent sessions per user.

#### P0-05: Payment activation trusts incomplete evidence

**Evidence:**

- `subscription/confirm` Stripe branch accepts `session.status === "complete"` even when `payment_status !== "paid"`.
- It derives the plan from `session.metadata?.planId || rawPlanId`, so a missing metadata plan can be supplied by the client.
- It does not validate the session amount against the plan price.
- `webhook/stripe` activates `metadata.planId` on `checkout.session.completed` without checking `payment_status`.
- Razorpay confirmation checks the stored payment reference only if a reference exists; otherwise it accepts the client plan after HMAC verification.
- `verify-payment` verifies an HMAC but does not bind the payment to a user or a recorded plan.

**Impact:** A user may activate or upgrade a plan without paid, matching evidence, especially when metadata is missing, a reference is absent, or an asynchronous payment method leaves the session complete but unpaid. This is a direct revenue and entitlement-integrity risk.

**Remediation:**

1. In the Stripe branch, require `payment_status === "paid"` and a successful subscription status.
2. Validate `amount_total`, currency, price ID, and plan metadata against the server-side plan.
3. Never fall back to a client-supplied plan. If metadata is missing, reject.
4. In the webhook, require paid status before activation and implement idempotency.
5. For Razorpay, require a payment reference and validate amount, plan, user, and status; reject if the reference is missing.
6. Bind `verify-payment` to the authenticated user and a stored reference.
7. Reconcile entitlements against provider state on a schedule.

#### P0-06: Unauthenticated AI, ingestion, and integration surfaces

**Evidence:**

- `/api/gateway` accepts a prompt and calls the AI orchestrator with no auth or rate limit.
- `/api/ingest` accepts content/title/projectId and writes to RAG with no auth.
- `/api/integrations/execute` and `/api/integrations/verify` accept `x-user-id` or `guest-user` fallbacks and can invoke tools.
- `/api/integrations/approval` resolves approvals without authentication.
- `/api/learn/generate-questions`, `/api/preview/repair`, and `/api/support` make AI calls with no auth.
- `/api/agent-reach/extract` fetches arbitrary URLs; `/doctor` probes external services.

**Impact:** Free AI/tool usage, cost exhaustion, RAG poisoning, cross-user tool execution, SSRF, and abuse of server IP reputation.

**Remediation:**

1. Require authentication and per-user rate limits on every AI and fetch endpoint.
2. Remove all `x-user-id` and `guest-user` fallbacks for privileged operations.
3. Bind integration tools to the verified session user and server-side credentials.
4. Add URL allowlists, DNS/IP filtering, redirect limits, and response-size limits for fetch tools.
5. Require approval and re-authentication for high-risk tools.
6. Make ingestion admin-only or scoped to an authenticated project owner.

#### P0-07: Integration identity spoofing, dead approval gate, and in-memory credentials

**Evidence:**

- `/api/integrations`, `/execute`, and `/verify` resolve the user from cookie JWT, then `x-user-id`, then `"guest-user"`.
- The approval endpoint is public and only resolves an in-memory record.
- No catalog entry sets `requiresApproval: true`.
- `executeIntegrationTool` returns `APPROVAL_REQUIRED` if a tool requires approval, but there is no post-approval execution path.
- Credentials are stored in `global._userCredentialsStore`, a plaintext in-process `Map`.

**Impact:** User impersonation, unauthorized tool execution, lost credentials on restart, secret exposure in process memory, and a false sense of approval enforcement.

**Remediation:**

1. Derive user identity exclusively from a verified session.
2. Persist credentials encrypted with a KMS-backed key; never keep plaintext secrets in a global map.
3. Implement an approval state machine with signed, expiring approval records and actual execution gating.
4. Mark high-risk tools `requiresApproval: true` and test the denial path.
5. Add audit logs for connection, credential, approval, and execution events.

### P1 — High: fix before scaling or marketing as production-ready

#### P1-01: Predictable JWT fallback secret

`getJwtSecret()` returns a hardcoded fallback when `JWT_SECRET` is missing. Production only logs a critical warning. If the variable is absent, tokens are signed with a known value and can be forged. **Fix:** fail closed at startup, require a strong secret, and rotate.

#### P1-02: Stale paid entitlements after downgrade or cancellation

`resolveEffectivePlan` keeps the JWT plan when the DB returns Core, the user is missing, or the DB errors. A paid access token remains valid for up to 7 days after downgrade. **Fix:** always resolve from server state for privileged actions; shorten access-token lifetime; add revocation/version checks.

#### P1-03: Entitlement fail-open and incomplete metering

`consumeEntitlement` catches database errors and returns `allowed: true`. `frontier_models` is never consumed. TTS has no entitlement check. Paid plans bypass the chat daily limit. **Fix:** fail closed or use a bounded grace policy; add tests for each metered feature; meter every costly operation at the route boundary.

#### P1-04: Shared anonymous rate-limit identity

Anonymous chat uses the literal user ID `"anonymous"`, so all unauthenticated users share one per-minute and daily bucket. This is both a denial-of-service and abuse vector. **Fix:** use IP plus a signed anonymous session ID, with stricter limits and challenge escalation.

#### P1-05: Account deletion is incomplete

Deletion removes eight collections but leaves `daily_usage`, `payment_refs`, `audit_logs`, `generated_files`, project child collections, and `workspaces/`. **Fix:** implement a documented retention policy, delete or pseudonymize user data transactionally, remove files, and provide a deletion audit record. Financial records may be retained under a separate legal basis, but must be disclosed.

#### P1-06: Data export leaks refresh tokens

`/api/user/data` exports full session documents, including `refreshToken`, and misses several collections. **Fix:** redact all credential fields, include a complete manifest of exported data, require re-authentication for export, and log the export.

#### P1-07: API keys stored and returned in plaintext

`/api/user/api-keys` stores provider keys unencrypted and returns them in GET responses. Dotted-path writes allow nested field injection. **Fix:** encrypt at rest, return masked values only, validate provider names against an allowlist, and require re-auth for changes.

#### P1-08: In-memory MongoDB fallback in production

`src/lib/mongodb.ts` can substitute an in-memory mock client when `MONGODB_URI` is missing or connection fails. In production this silently creates ephemeral accounts, sessions, and usage, and diverges across instances. **Fix:** fail closed in production; use the fallback only in tests/local development with an explicit flag.

#### P1-09: CORS wildcards on sensitive routes

`automation`, `automation/jobs`, `gateway`, `browser-agent`, `integrations`, and others set `Access-Control-Allow-Origin: *`. Combined with weak auth, this widens the abuse surface. **Fix:** use an explicit origin allowlist and never combine wildcard origins with credentialed requests.

#### P1-10: Payment reference ownership is conditional

Razorpay confirmation only checks `payment_refs` when a reference exists. Older orders, deleted references, or fallback-store resets bypass the check. **Fix:** require a reference for every activation and treat a missing reference as an error.

#### P1-11: Diagnosis, health, and metrics expose operational details

`/api/health` and `/api/system/health` disclose provider-key presence, DB status, environment, heap usage, and browser session details. `/api/metrics` is open when `METRICS_API_KEY` is unset. **Fix:** require admin or metrics auth, return only minimal liveness data publicly, and remove key/session details.

#### P1-12: Model branding and response identity are misleading

The catalog advertises fictional IDs such as `claude-opus-5.5`, `claude-fable-5.1`, `gpt-6-astra`, `glm-5.2`, and `kimi-k3`. The chat route rewrites model self-identification and falls back to free workers. **Impact:** consumer deception, provider terms risk, and untrustworthy model provenance. **Fix:** publish real upstream model identifiers or clearly label aliases/routing; disclose fallback and simulated streaming.

#### P1-13: Free-worker fallback spoofs provider origin

`api-manager.ts` calls a free worker with no API key and sets `Origin`/`Referer` to `https://freemodels.pro`. This may violate provider terms and is fragile. **Fix:** use a documented API or remove the fallback; disclose any free-tier routing.

#### P1-14: Google OAuth lacks rate limiting and PKCE

The Google token exchange validates the ID token and state, but no rate limiting or PKCE/nonce was observed. **Fix:** add rate limits, nonce/PKCE, and stricter redirect URI validation.

#### P1-15: CSRF helpers are dead code

CSRF token generation and validation helpers exist, and `/api/csrf` issues tokens, but no route or middleware enforces them. SameSite Lax cookies reduce but do not eliminate risk. **Fix:** enforce CSRF on state-changing requests or document a deliberate same-site architecture and remove dead helpers.

### P2 — Medium/Low: quality, resilience, and trust improvements

- **P2-01:** `page.tsx` is 4,744 lines and `chat/route.ts` is 1,992 lines. Split by feature and add focused tests.
- **P2-02:** Duplicate/legacy copies (`likewayai-production-fixed`, `.next`, zips, logs, worktree copies) increase review and secret-leak risk.
- **P2-03:** In-memory rate limits, daily usage counters, job queues, approvals, preview sessions, and credentials are not durable or multi-instance safe.
- **P2-04:** No verified CI gate for lint, type-check, tests, dependency audit, or secret scanning.
- **P2-05:** Error responses sometimes return raw provider error text (`integrations/verify`, `subscription` routes).
- **P2-06:** Logging includes user IDs, prompt metadata, and provider errors; define retention and redaction.
- **P2-07:** `README.md` is create-next-app boilerplate; setup and operational documentation are fragmented.
- **P2-08:** `PRODUCTION_READINESS_REPORT.md` contains false claims (intact fallback loops described as truncated, missing rate limiting that exists, a dev bypass that is absent). Re-baseline or remove it.
- **P2-09:** SEO metadata includes an `aggregateRating` of 4.8/150 without visible review provenance; verify or remove.
- **P2-10:** A third-party sponsored script is loaded in the root layout; document the supply-chain and privacy impact.
- **P2-11:** Preview session/repair endpoints need ownership and rate limits even after the XSS fix.
- **P2-12:** `system/health` returns browser session details; minimize.

---

## 10. Reliability, Scalability, and Observability

### Strengths

- Provider fallback increases chat availability.
- SSE streaming works for primary providers.
- Mongo indexes are created for daily usage.
- Docker/Render deployment is defined.
- Health endpoints and request logging exist.
- Projects and chat history are owner-scoped.
- Payment HMAC verification is implemented for Razorpay.
- Preview and file TTLs limit some storage growth.

### Weaknesses

| Area | Risk | Recommendation |
|---|---|---|
| Database fallback | Accounts/sessions vanish or diverge | Fail closed in production. |
| Rate limits | Per-instance only | Redis/durable store with atomic counters. |
| Daily usage | Per-instance Mongo fallback, fail-open | Durable, transactional counters. |
| Job queue | In-memory max 200 | Durable queue with retries/dead letters. |
| Approvals/credentials | In-memory | Encrypted durable store. |
| Preview sessions | In-memory | Durable store with ownership/TTL. |
| Long-running routes | Chat 120s, browser 180s | Queue heavy work; add timeouts/cancellation. |
| Playwright | Cold starts and resource use | Dedicated worker pool and concurrency caps. |
| SSE | No resume/replay semantics | Event IDs, resumable streams, backpressure. |
| Observability | Logs only | Metrics, traces, alerting, SLOs. |
| Idempotency | Partial | Idempotency keys for payments/jobs. |

### Operational recommendations

1. Define SLOs for chat latency, stream success, payment success, and automation completion.
2. Add structured logs with request IDs and redaction.
3. Add metrics for provider fallback rate, 402/429 rates, entitlement denials, DB fallback activation, and job failures.
4. Alert on payment/webhook mismatches, secret-scan hits, and unusual AI spend.
5. Run a staging environment with non-production keys and test Mongo.
6. Load-test chat and automation separately; they have different bottlenecks.
7. Add graceful degradation when providers or Playwright are unavailable.

---

## 11. Code Quality and Maintainability

### Observed strengths

- TypeScript is used throughout.
- Core concerns are separated into libraries.
- Auth, plans, entitlements, and providers are centralized.
- Many routes use explicit error responses.
- Comments document several prior security fixes.
- The project has tests and a companion app.

### Observed problems

- **Monolithic files:** the main page and chat route are very large and mix UI, orchestration, provider logic, and policy.
- **Dead security code:** CSRF helpers and approval gates exist but are not enforced.
- **Inconsistent policy:** plan limits exist in `plans.ts`, `entitlements.ts`, route-level checks, and client localStorage.
- **Duplicated fallback logic:** multiple worker/LLM7 paths increase unpredictable behavior.
- **String-built commands:** PowerShell interpolation is a code-quality and security defect.
- **In-memory globals:** credentials, approvals, jobs, and preview sessions rely on process state.
- **Encoding/formatting noise:** source contains mojibake and decorative separators that make review harder.
- **Incomplete stubs:** Learn question arrays and some integrations are placeholders.
- **No verified static gate:** lint/type/test status was not established in this review.

### Refactoring priorities

1. Extract chat routing, entitlement checks, and provider selection into testable services.
2. Split `page.tsx` into chat shell, composer, message list, artifact panel, and mode controllers.
3. Create a single entitlement policy module used by every route.
4. Replace in-memory stores with interfaces and durable adapters.
5. Remove dead CSRF/approval code or enforce it.
6. Add contract tests for payment state transitions.
7. Add lint/type/test/secret-scan CI gates.

---

## 12. Deployment and Environment

### Deployment shape

- Docker image based on Playwright Noble; port 10000.
- Render blueprint with a starter Docker service and `/api/health` check.
- Vercel-compatible Next.js build and proxy routes.
- Chromium install in `postinstall` for Render.
- Mongo/Atlas connection expected.

### Environment risks

| Risk | Detail | Fix |
|---|---|---|
| Missing refresh secret | `JWT_REFRESH_SECRET` is not in `render.yaml`; derived from JWT secret | Add and rotate independently. |
| Missing provider envs | LLM7 and Pollinations are not declared consistently | Declare all required variables. |
| Weak validation | `env-validate.ts` only requires Mongo and JWT | Validate all critical vars and fail closed. |
| Secret file | `PRODUCTION_ENV.txt` tracked | Rotate and purge history. |
| Committed example key | `.env.example` has a real Pollinations key | Replace with placeholder and rotate. |
| Wildcard DB access | Deployment docs mention Atlas `0.0.0.0/0` | Restrict network access. |
| Health disclosure | Public health routes reveal configuration | Require auth/minimize. |
| CORS wildcard | Sensitive routes allow any origin | Explicit allowlist. |
| Third-party script | Sponsored script in root layout | Review privacy/supply-chain impact. |

### Build and release recommendations

1. Build in CI, not only on the deploy host.
2. Run type-check, lint, tests, dependency audit, and secret scan on every PR.
3. Use separate staging and production keys/databases.
4. Add migration and rollback procedures.
5. Verify Playwright and Chromium on the target host.
6. Add a post-deploy smoke test for auth, chat, payments, and preview.
7. Do not deploy with the Mongo mock fallback enabled.

---

## 13. Documentation Accuracy and Dashboard Cross-Check

### Existing dashboard

The `codebase-audit/` dashboard is useful and largely aligned with the verified findings. Its structure and roadmap are sound. However:

- It reports 211 files / 46,132 lines; current source is 210 TS/TSX files / 49,467 lines.
- It references routes that are not present in the current tree (`research`, `edit-image`, `learning`).
- It does not include the newer exact entitlement matrix or the refined Stripe condition.
- Some claims should be marked verified with current line references.

### Prior readiness report

`PRODUCTION_READINESS_REPORT.md` contains claims contradicted by the current source:

- It says `api-manager.ts`/`fetchAI` is truncated; the provider fallback function is intact.
- It says `runBrowserEngine` is truncated; the function is intact.
- It says a development auth bypass exists in `src/lib/user.ts`; the file has no such bypass.
- It says chat has no rate limiting; chat has per-minute and daily checks.

Treat that report as historical, not authoritative.

### Marketing and product claims

The following claims are stronger than the implementation:

- “23 frontier models” includes fictional names and aliases.
- “Unlimited” chat conflicts with daily and entitlement limits.
- “Live browser view” is a scripted simulation in the visible workspace.
- “All frontier models unlocked” depends on provider availability and fallback routing.
- “Production-ready payments” is not supported while activation can accept incomplete evidence.

---

## 14. Prioritized Remediation Roadmap

### Phase 0 — Immediate (0–7 days)

1. Rotate/revoke the exposed Razorpay credentials; purge git history; add secret scanning.
2. Remove the Pollinations key from `.env.example` and source; rotate it.
3. Fix PowerShell command construction and require auth/CSRF for system control.
4. Require auth and ownership for generated files, automation jobs, and job streams.
5. Fix preview isolation: separate origin or remove `allow-same-origin`; tighten CSP and frame policy.
6. Require `payment_status === "paid"` and server-side amount/plan validation for Stripe and Razorpay.
7. Disable unauthenticated gateway, ingestion, integration execution/approval, support AI, learn generation, preview repair, and agent-reach fetch, or put them behind auth and strict rate limits.
8. Fail closed when JWT secret or Mongo is missing in production.

### Phase 1 — High priority (1–3 weeks)

1. Make entitlement checks fail closed; meter every costly feature; enforce `frontier_models`.
2. Replace stale JWT plan trust with server-authoritative plans.
3. Fix account deletion and data export; redact refresh tokens; encrypt API keys.
4. Replace in-memory jobs, approvals, credentials, preview sessions, and rate limits with durable stores.
5. Add CORS allowlists and rate limits to all sensitive routes.
6. Minimize health/metrics exposure.
7. Remove or clearly label fictional model names; disclose fallbacks and simulated streaming.
8. Add payment reconciliation and idempotency.

### Phase 2 — Medium priority (3–8 weeks)

1. Split the chat page and chat route into modules.
2. Add unit, integration, contract, and E2E tests for auth, entitlements, payments, preview, and automation.
3. Add CI gates for lint, type-check, tests, dependency audit, and secrets.
4. Add observability: metrics, traces, alerts, SLOs, and redacted logging.
5. Harden Google OAuth and session management.
6. Complete integrations with encrypted credentials and real approval enforcement.
7. Rebuild documentation and remove stale reports.
8. Clean repository bloat and duplicate worktrees.

---

## 15. Verification Ledger

| Check | Status | Evidence |
|---|---|---|
| Route inventory | Complete | 61 route files, 88 exports, 83 business handlers. |
| Auth classification | Complete (static) | Route-by-route review. |
| Secret exposure | Verified | `PRODUCTION_ENV.txt`, `.env.example`, hardcoded key. |
| Payment logic | Partial static | Razorpay/Stripe code read; no live payment executed. |
| Preview isolation | Verified static | Headers, CSP, iframe sandbox. |
| File/job ownership | Verified static | Optional/absent user checks. |
| PowerShell injection | Verified static | Interpolated command string. |
| Mongo fallback | Verified static | Mock client and fallback store. |
| Entitlements | Verified static | Exact limits and fail-open path. |
| Model catalog | Verified static | 23 entries, fictional IDs. |
| Build/lint/tests | Not run | Static review only. |
| Runtime DAST | Not run | No live environment used. |
| Dependency CVEs | Not run | No audit command executed. |

---

## 16. Appendix A — High-Value Files for Remediation

| File | Why it matters |
|---|---|
| `src/lib/auth.ts` | JWT fallback, token creation, cookies, session helpers. |
| `src/lib/entitlements.ts` | Exact limits, fail-open, stale-plan resolution. |
| `src/lib/plans.ts` | Plan definitions, model lists, pricing. |
| `src/app/api/chat/route.ts` | Anonymous chat, limits, routing, fallback, identity. |
| `src/app/api/subscription/confirm/route.ts` | Payment activation and token rotation. |
| `src/app/api/webhook/stripe/route.ts` | Stripe activation trust. |
| `src/app/api/create-order/route.ts` | Razorpay amount and reference. |
| `src/app/api/files/[id]/route.ts` | File ownership. |
| `src/app/api/automation/route.ts` | Unauthenticated automation control. |
| `src/app/api/automation/jobs/[id]/stream/route.ts` | Job data leak. |
| `src/lib/system/computer-control.ts` | PowerShell injection. |
| `src/app/api/preview/render/[id]/route.ts` | Executable HTML. |
| `src/components/LivePreviewWorkspace.tsx` | Same-origin iframe. |
| `src/lib/integrations/credentials-store.ts` | Plaintext in-memory credentials. |
| `src/lib/integrations/integration-registry.ts` | Approval/SSRF/tool behavior. |
| `src/app/api/user/data/route.ts` | Refresh-token export. |
| `src/app/api/user/account/route.ts` | Deletion gaps. |
| `src/app/api/user/api-keys/route.ts` | Plaintext keys and dotted-path writes. |
| `src/lib/mongodb.ts` | Production fallback. |
| `src/proxy.ts` | Public/protected route policy. |

---

## 17. Appendix B — Verification Commands

Route inventory:

```powershell
$routes = Get-ChildItem -Path 'src\app\api' -Recurse -Filter route.ts -File | Sort-Object FullName
foreach ($r in $routes) {
  $rel = $r.FullName.Replace((Get-Location).Path + '\','')
  $lines = (Get-Content -LiteralPath $r.FullName).Count
  $content = Get-Content -LiteralPath $r.FullName -Raw
  $ms = ([regex]::Matches($content, 'export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)') | ForEach-Object { $_.Groups[1].Value }) -join ','
  "$rel`t$lines`t$ms"
}
```

Call-site search for entitlement enforcement:

```powershell
Get-ChildItem -Path 'src\app\api' -Recurse -Filter route.ts |
  Select-String -Pattern 'consumeEntitlement|checkModelAccess|getEntitlementUsage' |
  ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
```

Secret-oriented checks:

```powershell
git log --all -- PRODUCTION_ENV.txt
git grep -n -I -E 'rzp_live|sk_live|api[_-]?key|secret' -- ':!package-lock.json'
```

Do not print matched secret values into shared logs.

Build and test commands (when a controlled environment is available):

```powershell
npm ci
npm run lint
npm run build
npm run test:e2e
```

---

## 18. Appendix C — Status Definitions

| Status | Meaning |
|---|---|
| Implemented | A real code path exists and is wired. |
| Partial | Works under constraints or lacks a complete production path. |
| Mocked/Simulated | UI or response represents behavior that is not actually occurring. |
| Missing | No meaningful implementation found. |
| Blocked | Requires external configuration or is intentionally disabled. |
| Verified | Directly confirmed by reading current code. |
| Unverified | Plausible but requires runtime or environment-specific confirmation. |

---

## 19. Closing Assessment

Likeway AI has enough real functionality to justify continued development. The correct next step is not a rewrite. It is to make the existing system honest and safe:

- Secure the secrets and the local execution boundary.
- Make identity and ownership mandatory at every data boundary.
- Make payment activation depend on paid, server-validated evidence.
- Isolate executable content from the application origin.
- Make plans, entitlements, and model claims consistent.
- Replace ephemeral security and operational state with durable infrastructure.
- Add evidence-producing tests and CI gates before making production claims.

Until those are complete, the platform should be treated as a capable prototype with production-grade UI, not as a production-ready AI service.
