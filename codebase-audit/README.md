# Likeway AI — Codebase Audit

**Audit date:** 2026-10-21  
**Target:** `C:\Users\Lenovo\my first app`  
**Method:** read-only source inspection, configuration review, type checking, and linting  
**Runtime status:** not executed

## Interactive dashboard

Open `codebase-audit/index.html` directly in a browser. It has no build step, no server requirement, and no external dependencies.

The dashboard contains eight sections:

1. Overview and headline verdicts
2. Feature integrity matrix (35 capabilities)
3. Security findings (15)
4. Real-time transport review (9 mechanisms)
5. Architecture map (25 nodes)
6. Data model and critical flows (payment and automation)
7. Verification ledger and runtime plan
8. Prioritized roadmap

The "Print / PDF" button produces a printable version of every section. Feature rows and findings expand for evidence; filters and search work without reloading the page.

## Executive summary

This is a broad, substantial application, not a thin prototype. It contains real implementations for chat orchestration, deep research, Playwright automation, project persistence, image and voice features, integrations, payments, and custom JWT sessions. Several of these are genuinely functional by static inspection. The deep-research pipeline and the local-only guard on autonomous project generation are particularly credible.

The central problem is not a lack of code. It is that **trust boundaries and user-facing claims are not aligned with the implementation.**

- A provider key is committed in `.env.example` and duplicated as a hardcoded fallback.
- Several expensive or stateful endpoints require no authentication.
- The visible browser viewport is a scripted animation, not live Playwright frames.
- The model catalog advertises non-existent model names, and responses rewrite model identity.
- One chat provider receives a complete answer and replays it as a simulated token stream.
- Razorpay confirmation can trust a client-supplied plan when the payment reference is missing.
- Preview HTML is served on the application origin and runs with `allow-same-origin` plus `allow-scripts`.

**Verdict:** feature breadth is high; production readiness is low. The deployment should not be treated as production-safe until the P0 items below are resolved.

## Scope and method

Reviewed:

- Repository layout, Git state, `package.json`, Next.js configuration, `vercel.json`, and environment surface.
- All route handlers under `src/app/api` and the custom auth proxy.
- Chat, research, image editing, TTS, voice, automation, preview, integrations, projects, RAG, and payment paths.
- MongoDB collections and process-local stores.
- User-visible claims in `TODO.md` and product surfaces versus actual code paths.
- Static checks with TypeScript and ESLint.

Not performed:

- No live requests, credentials, database connections, payment sandbox, Render worker, or browser automation session.
- No production build.
- No penetration test, CVE/advisory audit, load test, or accessibility certification.
- No application files were modified. Output is confined to `codebase-audit/`.

Severity means design-level exposure observed in source, not confirmed exploitability. A critical finding means "fix before relying on this deployment", not "a breach occurred."

## Static verification

| Check | Result | Detail |
|---|---|---|
| `npx tsc --noEmit` | Pass | No TypeScript diagnostics |
| `npx eslint src` | Fail | 693 problems: 14 errors, 679 warnings |
| `npx eslint .` | Fail | 1,978 problems: 20 errors, 1,958 warnings |
| Production build | Blocked | Not run; requires environment and network-dependent setup |
| Runtime tests | Blocked | No test credentials or deployed services |
| Dashboard render | Pass | Headless Chromium loaded all 8 panels with no console or page errors; filters, search, expand/collapse, tabs, and architecture selection were exercised |

Notable lint issues include conditional React hooks (`react-hooks/rules-of-hooks`), `prefer-const`, and widespread `no-explicit-any`. The repository-wide count is inflated by duplicated project trees under `.kilo/worktrees/` and `likewayai-production-fixed/`.

## Architecture

The application is a two-host design with a third local-only surface:

- **Vercel / Next.js:** App Router pages and 83 HTTP handlers. Uses a custom JWT proxy, MongoDB Atlas, and provider SDKs.
- **Render / Playwright:** Browser pool, job worker, and WebSocket frame server on port 10001. Vercel automation calls are proxied here with service credentials and an execution mode.
- **Local companion:** Desktop actions and local project generation. Cloud hosts refuse these operations with an explicit warning.

The client is dominated by a single 4,744-line chat page that hosts chat, tools, previews, voice, and automation. Domain logic lives in `src/lib`, with an AI orchestrator selecting providers and tools. State is split between MongoDB and several global in-memory maps.

Key architectural risks:

- Integration credentials, connected apps, approvals, and preview sessions live in process memory; restarts and multi-instance deployment lose or split state.
- The MongoDB layer falls back to a global in-memory store when the database is unreachable.
- The WebSocket browser stream only starts on Render, and the UI component intended to consume it is unused.
- The deployment combines real backends with simulated front ends, so a feature can look wired when it is not.

## Feature integrity

35 capabilities were assessed: **5 implemented, 21 partial, 5 mocked, 2 missing, 2 blocked.** "Implemented" means the code path exists and was read, not that it was executed.

### Implemented (5)

Deep research, learning/question generation, Playwright browser engine, projects/files/memory, and admin diagnostics.

### Partial (21)

Native chat streaming, entitlements, vision/file attachments, image generation, image editing, search grounding, voice chat, TTS, automation jobs, computer control, autonomous builder, live preview, integrations, agent catalog, RAG, Razorpay, Stripe, subscription lifecycle, authentication, usage metering, and health/configuration reporting.

### Mocked or simulated (5)

- Free-worker chat "streaming" is a full answer replayed on a timer.
- The frontier model catalog includes non-existent product names.
- Assistant output rewrites model identity.
- The news route falls back to mock articles without clearly labeling them.
- The visible browser viewport is a scripted animation with an iframe, not Playwright frames.

### Missing (2)

Support/contact workflow and cross-device real-time sync.

### Blocked (2)

Live browser WebSocket transport (no active UI consumer or confirmed proxy) and the local companion process (not launched).

### Notable strengths

- **Deep research** is a real multi-phase SSE pipeline: plan subqueries, search, read, synthesize.
- **Playwright engine** is substantial code with a browser pool, task execution, screenshots, and worker health reporting.
- **Payments** derive prices server-side, and Razorpay signature verification is implemented.
- **Project persistence** uses dedicated MongoDB collections.
- **Cloud refusal for local-only actions** is an honest guard rather than a fake success path.
- **TTS degradation** returns 501 and falls back to browser speech instead of silently failing.

### Notable gaps

- The browser viewport claims to show a live agent while animating fabricated steps.
- The model catalog and identity sanitizer create a misleading product surface.
- The UI cannot distinguish native token streaming from a replay.
- Automation job reads and streams are not ownership-checked.
- Integration connection state is not durable.

## Security findings

**Counts:** 1 critical, 5 high, 5 medium, 3 low, 1 informational.

| ID | Severity | Area | Finding | Key evidence | Required direction |
|---|---|---|---|---|---|
| SEC-01 | Critical | Secrets | Provider key committed in `.env.example` and hardcoded fallback | `.env.example` near line 63; `src/config/keys.ts:27` | Revoke/rotate, remove history, delete fallback, add secret scanning |
| SEC-02 | High | Authorization | Unauthenticated AI gateway trusts caller identity | `src/app/api/gateway/route.ts:9,11,24` | Require verified session or signed service credential; restrict CORS |
| SEC-03 | High | Authorization | Unauthenticated RAG ingestion | `src/app/api/ingest/route.ts` | Authenticate, scope to owner, enforce size/rate limits |
| SEC-04 | High | Authorization | Automation jobs, results, stream, and cancel exposed | `src/app/api/automation/route.ts:12,177,311`; job routes | Authenticate every route; enforce ownership; remove wildcard CORS |
| SEC-05 | High | Isolation | Executable preview runs on the app origin | `src/app/api/preview/render/[id]/route.ts`; `LivePreviewWorkspace.tsx:607`; `vercel.json` | Separate origin or remove `allow-same-origin`; authenticate; tighten CSP |
| SEC-06 | High | Payments | Plan upgrade not bound to paid order when reference is missing | `src/app/api/subscription/confirm/route.ts:147-162` | Require stored reference; derive plan/amount server-side |
| SEC-07 | Medium | Payments | Webhook refuses all events without its secret | `src/app/api/webhook/razorpay/route.ts:23-27,76-98` | Configure and verify secret; reconcile; alert on 503 |
| SEC-08 | Medium | Authentication | Predictable JWT fallback secret | `src/lib/auth.ts:22-28` | Fail startup or auth when `JWT_SECRET` is missing |
| SEC-09 | Medium | Authorization | Entitlements fail open on storage errors | `src/lib/entitlements.ts` around 265-269 | Fail closed for costly features; cache known entitlements |
| SEC-10 | Medium | Authorization | Client-supplied `x-user-id` trusted in multiple routes | `integrations/route.ts:20`; `automation/route.ts:177`; `gateway/route.ts:24` | Remove header trust; use verified tokens or signed service auth |
| SEC-11 | Medium | Data handling | Integration credentials and connections are process-local | `credentials-store.ts`; `integration-registry.ts` | Persist encrypted credentials and connection state with TTL and rotation |
| SEC-12 | Low | Disclosure | Public health endpoint reports configuration presence | `src/app/api/health/route.ts` | Return minimal liveness publicly; move detail behind admin auth |
| SEC-13 | Low | Authorization | Metrics auth is optional | `src/app/api/metrics/route.ts` | Require auth unconditionally or disable the route |
| SEC-14 | Low | Browser security | Wildcard CORS on AI and browser-related endpoints | `gateway/route.ts:9`; `automation/route.ts:12`; `browser-agent/route.ts:15` | Use an origin allowlist and explicit preflight handling |
| SEC-15 | Info | Hygiene | Duplicate project copies inflate static analysis | `.kilo/worktrees/...`; `likewayai-production-fixed/` | Remove/ignore stale trees; re-baseline scans |

The committed provider key's value was not reproduced anywhere in this audit. Its validity was not tested.

## Payments

The happy path is server-priced:

1. The pricing page requests an order; the server maps the plan to an amount.
2. A payment reference is intended to link the order to a user and plan.
3. Razorpay Checkout returns a payment ID and signature.
4. `verify-payment` recomputes the HMAC and reports success, but does not grant a plan.
5. `subscription/confirm` verifies both the order/payment and payment/order signatures, conditionally checks the stored reference, persists the plan, and rotates cookies.
6. The Razorpay webhook updates captured, cancelled, and expired subscriptions when its secret is configured.
7. The success page polls the session every 1.5 seconds; the pricing page polls payment status with a timeout.

The material risk is step 5: when `getPaymentRef(orderId)` returns nothing, the ownership and plan comparison is skipped and the client-supplied `planId` is persisted. A cheaper valid payment can therefore confirm a more expensive plan. The webhook's 503 behavior also means failed client confirmation can leave a paid user on Core.

## Real-time behavior

| Mechanism | Transport | Assessment |
|---|---|---|
| Chat | SSE | Native providers stream; one worker path replays a complete answer |
| Deep research | SSE | Genuine phased pipeline |
| Automation progress | SSE plus in-process events | Transport exists; stream lacks authentication |
| Browser frames | WebSocket on port 10001 | Starts only on Render; no active UI consumer confirmed |
| Live preview | iframe and postMessage | Rendered, but isolation is weak and no verified console stream |
| Voice input | Browser speech APIs plus REST | Turn-based, not full-duplex |
| Speech output | Chunked HTTP audio | Gemini TTS with browser fallback |
| Payment updates | Webhook plus polling | Works only when webhook secret is configured |
| Cross-device sync | None found | No pub/sub or presence layer |

The most important distinction is between native SSE and timed replay. Both look identical in the transcript.

## Data and external dependencies

Observed MongoDB collections: `users`, `usage`, `daily_usage`, `rate_limits`, `session_blacklist`, `payment_refs`, `automation_jobs`, `projects`, `project_files`, `project_tasks`, `project_conversations`, `project_memory`, `chatmemories`, `personas`, and `rag_documents`.

Configured external groups include OpenRouter, Groq, Mistral, the free worker proxy, TokenHarbor, LLM7, Pollinations, Gemini, Tavily, Brave, Firecrawl, Jina, DuckDuckGo, SearXNG, Razorpay, Stripe, Google OAuth, MongoDB Atlas, Vercel, Render, Playwright Chromium, and the local companion.

Presence in configuration does not prove availability, validity, or correct quota behavior.

## Claim versus reality

| Claim | Reality |
|---|---|
| "23 frontier AI models" | The catalog contains non-existent names and is routed largely through a free worker proxy; identity is rewritten |
| "Real live browser viewport" | The visible workspace is a scripted animation over an iframe |
| "Zero simulated mocks" | Integration state is in-memory; the viewport is simulated; one chat path is a fake stream |
| "Production-ready payments" | Server pricing and HMACs exist, but plan binding is conditional and webhooks fail without a secret |
| "Neural voice conversation" | Turn-based REST plus TTS, not full-duplex audio |
| "Autonomous app building" | Real local-only engine; cloud hosts explicitly refuse |
| "Real-time deep research" | Genuine SSE pipeline; still unverified at runtime |

The local-only guard and deep-research implementation are honest exceptions. They should be preserved.

## Roadmap

### P0 — Contain exposure

1. Revoke and rotate the committed provider key; remove it from history and delete the code fallback; add CI secret scanning.
2. Authenticate the AI gateway, RAG ingestion, automation reads/stream/cancel, and preview sessions; enforce per-user ownership.
3. Isolate executable previews: separate origin or remove `allow-same-origin`, tighten `frame-ancestors`, add strict CSP.
4. Bind upgrades to stored payment references; derive plan and amount server-side; reject mismatches.
5. Remove the JWT fallback and fail closed when required auth secrets are absent.

### P1 — Restore integrity

1. Wire the browser viewport to authenticated Playwright frames, or label it clearly as a simulation.
2. Replace fictional model branding with real upstream identifiers or transparent aliases; stop rewriting identity.
3. Either stream natively everywhere or label replayed answers as progressive delivery.
4. Persist integration credentials and connection state in an encrypted durable store.
5. Configure and verify payment webhooks; add reconciliation and entitlement-drift alerts.

### P2 — Harden operations

1. Remove duplicate project copies; re-baseline lint and secret scans.
2. Fix conditional hooks and lint errors before adding features.
3. Add runtime and E2E coverage for chat, payments, automation, preview isolation, and plan limits.
4. Add database-backed or Redis-backed queue/presence state for multi-instance deployment.
5. Minimize public health output and require metrics authentication unconditionally.

## Runtime verification plan

To convert static claims into runtime evidence:

1. Provision a dedicated test environment with non-production keys and a test MongoDB database.
2. Run the production build and capture startup, provider-routing, and database-fallback logs.
3. Use Razorpay test mode with a tunneled webhook secret; test order creation, plan binding, cancellation, and expiry.
4. Deploy or emulate the Render browser host; run one job and verify queue, SSE progress, screenshots, and WebSocket frames.
5. Test chat streaming on a native provider and the worker path, including abort behavior and entitlement checks.
6. Attempt cross-session preview access and same-origin script behavior from a second account in an isolated browser profile.
7. Run authenticated Playwright E2E tests for login, plan limits, image generation, voice fallback, and the payment success path.

Until these steps are completed, every runtime status remains unverified.

## Audit artifacts

- `codebase-audit/index.html` — dashboard shell and eight sections
- `codebase-audit/styles.css` — dark technical theme, responsive and print styles
- `codebase-audit/data.js` — audit dataset
- `codebase-audit/app.js` — rendering, filtering, tabs, and interactions
- `codebase-audit/README.md` — this report

No application file was changed. The dashboard is self-contained and can be opened directly from the filesystem.

## Limitations

- Source inspection cannot prove that any endpoint works in production.
- No secret values were validated, and the committed key's status is unknown.
- No runtime behavior, database failure mode, payment reconciliation, provider quota, or WebSocket delivery was observed.
- Line numbers can drift with uncommitted changes.
- The repository contains duplicate trees that affect repository-wide lint counts.
- Accessibility and performance were not certified; the dashboard was smoke-tested at desktop and mobile widths only.
