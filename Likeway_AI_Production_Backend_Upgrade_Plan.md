# Likeway AI — Production Backend Upgrade Plan

**Scope:** Backend, orchestration, data, streaming, search/research, model routing, browser/computer automation, security, operations, and tests.

**Non-negotiable constraint:** Do not edit the existing UI. Do not modify `src/app/page.tsx`, `src/components/**`, styling, page layouts, or visual assets. Preserve existing API contracts. New backend capabilities must be exposed through documented, versioned API/event contracts and use an existing UI rendering pathway where one already exists. A backend cannot make a feature visible in the UI if the UI does not subscribe to or render the necessary payload; report this as an integration blocker rather than silently changing the UI.

**Baseline source:** The user's uploaded Likeway AI project analysis. File-derived observations below should be re-verified against the actual repository before implementation.

---

## 1. Mission and definition of success

Build Likeway AI into a production-grade assistant that combines:

1. Reliable conversational chat with low-latency streaming and robust follow-ups.
2. Fresh web search and deep research with clickable, real source-domain links and claim-level evidence.
3. Bounded multi-step planning and specialist tools, with visible progress and recoverable jobs.
4. Browser automation with an observable live session, explicit approvals for sensitive actions, and verification of outcomes.
5. Permission-gated local computer control through the Likeway Companion, not unrestricted remote shell access.
6. Document/file understanding, durable project tasks, retrieval-grounded memory, and scheduled jobs.
7. Accurate model/provider identities, measurable quality, cost controls, strong tenant isolation, and production observability.

Do not promise “better than ChatGPT/Perplexity/Gemini/Copilot” based on architecture alone. Establish an evaluation set, define comparable tasks, measure quality and cost, and improve against those results.

### Product SLO targets to validate, not assume

These are initial engineering targets. Tune them using production baselines and provider capabilities:

- Acknowledgement/task ID: p95 under 500 ms when the API is healthy.
- First user-visible chat token: target p95 under 3 seconds for ordinary prompts; report provider latency separately.
- First meaningful research progress event: target p95 under 1 second after acceptance.
- Event replay: no loss of persisted events within the retention window; duplicate delivery must be safe.
- Worker restart: accepted tasks remain recoverable and resume or fail explicitly; never disappear silently.
- Citation integrity: every displayed citation must map to a real fetched/search result; no fabricated URLs or source titles.
- Tenant isolation: zero successful cross-user reads, writes, events, files, memories, or device commands in security tests.
- Sensitive computer actions: zero execution without a valid policy decision and the required approval.
- Cost/billing: every billable operation uses an idempotent usage ledger; retries cannot double-charge.

---

## 2. Existing architecture baseline and findings to verify

The uploaded report describes:

- Next.js 16 App Router application with 50+ API routes, particularly `/api/chat`, `/api/voice-chat`, browser-agent, automation, auth, payments, projects, files, health, and admin endpoints.
- MongoDB database `likeway_ai`, with users, sessions, memories, preferences, usage, audit, projects, files, and automation/task collections.
- Vercel for the Next.js app/API and Render/Docker for Playwright browser execution, worker processes, and browser WebSocket/screencast.
- Multiple model providers and a fallback router; several search sources/providers.
- A `/api/chat` pipeline that branches by intent for computer control, autonomous builds, research, browser automation, orchestration, images, real-time data, and ordinary chat.
- In-memory plus MongoDB automation-job state, a worker polling queue, a local companion daemon on `127.0.0.1:4141`, SSE chat/job streams, and a WebSocket browser stream.
- An evaluation framework and Playwright tests.

The report also identifies high-priority gaps that should be verified in source before implementation:

1. Account recovery reportedly contains test OTPs, exposes a development OTP, and may auto-create privileged plans/accounts.
2. Google authentication reportedly trusts client-provided JSON in one path; a VIP email backdoor is mentioned.
3. CORS reportedly permits `*` with credentials.
4. BYO model API keys reportedly may be stored as plaintext; example/test files reportedly contain secrets.
5. Rate limiting reportedly uses in-memory state and will be inconsistent across instances.
6. MongoDB unavailability reportedly falls back to an in-memory mock, which is unsafe for production writes/auth/billing/jobs.
7. RAG ingestion exists but retrieval is not wired; memory embeddings exist but are not used for vector retrieval.
8. More than one orchestration path appears to exist for chat and voice.
9. Scheduled-job processing exists but no reliable scheduler caller was found.
10. `BrowserOverlay` / `LiveBrowserView` are reportedly defined but not mounted in the main UI. This directly affects the “live view visible to users” requirement and cannot be fixed under a strict backend-only scope.
11. Long-running research and browser work may rely on request lifetimes and in-memory events rather than a fully durable job/event system.
12. Model names, “free unlimited” claims, and provider labels need verification against actual authorized provider model IDs and provider terms. Never misrepresent which model answered.

**Gate 0:** Do not assume a report finding is still present. Create a source-backed inventory: path, function, caller, auth boundary, database writes, external calls, side effects, timeout, and tests. Fix real vulnerabilities, not just the report's descriptions.

---

## 3. Target architecture

```text
Existing UI (unchanged)
  |  Existing chat API / compatible payloads
  |  Existing SSE, job stream, browser WebSocket (where already wired)
  v
Next.js API / BFF on Vercel
  - Authentication + authorization
  - Request validation and rate limits
  - Conversation/task creation
  - Compatibility adapters for existing clients
  - Stream proxy / task event authorization
  |
  +------ MongoDB: durable system of record -----------------------------+
  |        users/sessions, conversations, tasks, events, sources,        |
  |        citations, approvals, usage ledger, artifacts, audit, devices |
  |                                                                      |
  +------ Redis + durable queue (BullMQ or approved managed queue) ------+
           - Job scheduling, retry/backoff, concurrency, cancellation
           - Outbox/reconciliation between DB task state and queued jobs
                         |
                         v
             Worker/control plane on Render or equivalent
             - Shared task state machine and DAG runner
             - Research workers
             - Model/tool router
             - RAG/indexing worker
             - Scheduled-job worker
             - Artifact processing workers
                         |
              +----------+-----------+
              |                      |
              v                      v
       Browser worker pool      Model/search providers
       - Isolated Playwright    - Verified model registry
       - Session isolation      - Search/provider adapters
       - Screenshot stream     - Circuit breakers/budgets
       - Egress restrictions   - Source normalization
              |
              v
       Authenticated device/session broker
              |
              v
       Local Likeway Companion (user's machine)
       - Device pairing/revocation
       - Typed allowlisted operations
       - Approval and policy checks
       - Sandboxed file/process execution
       - Outbound authenticated connection only

Observability: traces + structured logs + metrics + alerts across all components
```

### Design choices

- **Vercel is the request/control entry point, not the execution engine for unlimited work.** Create durable tasks quickly, then execute long research/browser/build jobs in dedicated workers. Vercel function duration is bounded and configuration-dependent; do not rely on a long HTTP request being a durable job. See official limits: https://vercel.com/docs/functions/limitations and https://vercel.com/docs/functions/configuring-functions/duration.
- **MongoDB is the durable source of truth.** Redis/queue handles scheduling and dispatch; queue state is not the only copy of task state. Do not silently downgrade to an in-memory mock in production.
- **One canonical task engine.** Chat, voice, deep research, browser automation, project building, and scheduled jobs use shared task/context/policy/event contracts. They can have different planners and executors, but not contradictory implementations of identity, state transitions, billing, and cancellation.
- **Persist events before or transactionally with publishing.** Use an outbox/reconciliation pattern to avoid a task being stored but never enqueued, or an event being emitted but lost to reconnecting clients.
- **SSE for text/task events; WebSocket for low-latency browser frames and interactive control.** Protect both with short-lived, task-scoped authorization. Use the transport that fits; do not force screenshot frames through the chat text stream.
- **Typed tools and policy enforcement.** The model proposes tool calls; deterministic server policy decides whether they are permitted. The model must not grant itself permissions.

---

## 4. Recommended backend modules

Incrementally add or consolidate these modules under the existing structure. Do not perform a massive folder rewrite before tests exist.

```text
src/lib/
  auth/                 identity, session checks, device/session revocation
  policy/               tool policy, approval rules, data access policy
  runtime/              shared request/task context and execution limits
  tasks/                task state machine, DAGs, lifecycle, cancellation
  events/               durable event schema, append, replay, publish adapters
  queue/                queue abstraction, outbox dispatcher, reconciliation
  providers/
    models/             verified model registry and provider adapters
    search/             search adapters and provider health
  research/             query planning, fetch, normalization, evidence map
  citations/            citation validation, URL/source integrity
  tools/                typed registry, schemas, permission metadata, executor
  automation/           existing browser engine behind policy and task APIs
  system/               companion broker/client, typed computer operations
  memory/               profile, episodic memory, retrieval, consent/retention
  rag/                  ingestion, chunking, indexing, hybrid retrieval, rerank
  billing/               idempotent usage ledger and plan enforcement
  storage/               Mongo repository interfaces, versioned migrations
  observability/         trace context, metric names, redaction helpers
  config/                validated environment configuration

worker/ or existing Render worker entry points:
  task-worker
  research-worker
  browser-worker
  indexing-worker
  scheduler-worker
  outbox-reconciler
```

Existing files can be reused where sound. Make an interface first, migrate one flow at a time, and delete redundant implementations only after parity tests pass.

---

## 5. Canonical task lifecycle and orchestration

Use a single explicit state machine. Suggested states:

`accepted -> queued -> planning -> running -> verifying -> completed`

Additional terminal or waiting states:

`waiting_for_approval`, `waiting_for_user`, `retrying`, `cancel_requested`, `cancelled`, `failed`, `expired`.

Rules:

- Every state transition is validated and persisted with version/compare-and-set semantics.
- Every task has a server-generated ID, authenticated owner, conversation ID (if applicable), creation time, deadline, idempotency key, mode, budgets, and correlation ID.
- The client may request a mode, but the server computes authorized tools and enforces plan quotas.
- Each step declares inputs/outputs, timeout, retry classification, resource budget, sensitivity level, and whether it is idempotent.
- Independent read-only search/fetch steps can execute in parallel; state-changing tools are serialized unless proven safe.
- Cancellation propagates to queue jobs, running provider calls where supported, browser loops, and the local companion. Cancellation is a request that must be acknowledged; no “cancelled” status while a dangerous child process remains active.
- Every meaningful result must be verified before being marked complete. Verification can be a schema/result check, test execution, source check, or user-visible confirmation depending on task type.
- Add max steps, wall-clock deadline, model/token/cost budget, browser-action budget, per-tool timeout, and bounded retry/backoff. Never permit infinite agent loops.
- Use idempotency for task creation and each side-effecting tool call.
- Store a compact plan summary and progress messages; do not expose private chain-of-thought. User-facing progress should say what is being done and the evidence/results found, not dump hidden reasoning.

### Shared task context

Create a typed context containing: `taskId`, `userId`, `conversationId`, `traceId`, `mode`, authorization/policy snapshot, approved tools, remaining budget, deadline, cancellation token, source/evidence registry, and event writer. Pass it explicitly to every tool/provider rather than reading mutable global state.

### Reconcile duplicate orchestrators

Review chat and voice orchestrators. Consolidate routing, tool permissions, model fallback, usage accounting, and event semantics into shared services. Voice may retain a specialized input/output adapter but must call the same intent/task engine.

---

## 6. Real-time streaming contracts

Do not break existing clients. Preserve the current OpenAI-compatible `/api/chat` SSE format until contract tests prove all UI paths handle a migration. Add structured task events alongside it rather than silently replacing content deltas.

### Durable event record

```ts
type LikewayTaskEventV1 = {
  schemaVersion: 1;
  eventId: string;          // globally unique ID
  taskId: string;
  seq: number;              // strictly increasing within task
  createdAt: string;        // ISO-8601 UTC
  type: string;
  stage?: string;
  status?: string;
  progress?: { current?: number; total?: number; percent?: number };
  message?: string;         // safe, user-visible update
  payload?: Record<string, unknown>;
  visibility: "user" | "internal";
  traceId: string;
};
```

Never send secrets, raw provider responses containing private information, stack traces, session cookies, access tokens, hidden reasoning, or unredacted command output in user-visible events.

### Initial event types

- `task.accepted`, `task.queued`, `task.started`, `task.progress`
- `plan.summary`, `stage.started`, `stage.completed`
- `search.query_started`, `search.results_found`, `source.added`
- `research.synthesis_started`, `citation.checked`, `research.completed`
- `tool.started`, `tool.completed`, `tool.failed`
- `approval.required`, `approval.resolved`
- `browser.session_started`, `browser.action_started`, `browser.action_completed`, `browser.screenshot_available`
- `artifact.created`, `task.completed`, `task.failed`, `task.cancelled`

Use an allowlisted event-type registry and validate payload schemas at write time.

### API shape (additive)

```text
POST   /api/tasks
GET    /api/tasks/:taskId
GET    /api/tasks/:taskId/events      SSE, with Last-Event-ID replay
POST   /api/tasks/:taskId/cancel
GET    /api/tasks/:taskId/artifacts
GET    /api/tasks/:taskId/sources
GET    /api/tasks/:taskId/approvals
POST   /api/tasks/:taskId/approvals/:approvalId   approve/deny
GET    /api/devices                    paired companion metadata
POST   /api/devices/pair/start
POST   /api/devices/pair/complete
POST   /api/devices/:deviceId/revoke
```

All endpoints require authentication and owner/role checks. An ID is not authorization. Apply schema validation, size limits, rate limits, audit logging, and anti-CSRF protection to mutating cookie-authenticated requests.

### Task create request

```json
{
  "kind": "chat | research | browser | computer | file | project",
  "input": { "text": "..." },
  "mode": "quick | think | deep_research",
  "conversationId": "optional-existing-id",
  "idempotencyKey": "client-generated-unique-key"
}
```

`mode` is a request, not permission. The server validates subscription, provider capacity, tool access, and available budget. Return `202 Accepted` with `taskId`, current state, and authorized event URL for long-running work. For normal short chat, retain the existing streaming endpoint and behavior.

### SSE framing and reconnect

For structured task events use standard SSE frames, e.g.:

```text
id: 42
event: task.event
data: {"schemaVersion":1,"eventId":"...","taskId":"...","seq":42,"type":"source.added","visibility":"user","traceId":"..."}

```

Support `Last-Event-ID`, replay from persisted sequence, heartbeat comments, a reconnect-safe terminal event, and bounded retention. Make duplicate deliveries safe; clients should deduplicate by `eventId`/`seq`. A WebSocket reconnect should reauthorize the same task/device and resume from a known sequence where supported.

### UI untouched: visibility contract

Before any feature work, map each event/response type to the UI parser/component that already renders it. Reuse existing citations, artifacts, task timeline, job stream, and browser view pathways where present. Add contract tests against the actual front-end parser without editing its files.

Important: the supplied report says `BrowserOverlay` and `LiveBrowserView` may not be mounted in the main page. If confirmed, backend work alone cannot make screenshots visible in that UI. Keep all UI files untouched, expose a stable browser-stream contract, and produce an explicit acceptance note: “backend supports live view; UI subscription/mount is a separate blocked item.” Do not claim it is end-to-end visible until proven in the browser.

---

## 7. Production web search and deep research

The objective is not simply “call a search API.” The system must preserve provenance from query to source to supported claim to displayed citation.

### Research pipeline

1. **Classify freshness and evidence needs.** Detect when the question needs current web information, authoritative sources, multi-source corroboration, or no external search. Do not force a search on every creative/conversational prompt.
2. **Create a bounded query plan.** Generate diverse subqueries for the user's question, known unknowns, and counter-evidence. Enforce maximum query count, wall-clock time, provider spend, and domain limits.
3. **Search in parallel.** Use configured, authorized provider adapters (e.g. Brave, Tavily, a self-hosted search service, news feeds, and safe fallback sources). Race fast providers for early results; continue collecting until evidence/budget/timeout criteria are met. Respect each provider's terms and rate limits.
4. **Normalize results.** Store canonical URL, title, domain, snippet, retrieved time, published/updated time when available, provider, query, language, and page type. Do not invent publication dates or titles.
5. **Deduplicate.** Canonicalize URLs and near-duplicate stories; preserve multiple genuinely independent sources.
6. **Fetch safely.** Fetch only allowed HTTP/HTTPS URLs. Block loopback, private IP ranges, link-local/cloud metadata addresses, non-http schemes, disallowed ports, redirects into private networks, and DNS rebinding cases. Limit redirects, bytes, MIME types, response time, and decompressed body size. Strip scripts/navigation and treat all page text as untrusted data.
7. **Extract evidence.** Parse text, metadata, headings, and relevant paragraphs. Preserve source offsets or chunks to provide traceable supporting evidence.
8. **Build a source/evidence map.** Each candidate claim should point to one or more source spans. Record contradiction, recency, source diversity, and confidence. Do not interpret an LLM's confidence number as a calibrated probability unless validated.
9. **Synthesize with citation IDs.** Generate answer content using only source IDs in the evidence registry for sourced claims. Attach citations to the relevant paragraph/claim, not just a source list at the end.
10. **Validate citations.** Every citation must resolve to a source actually retrieved for this run, use a valid URL, have a matching title/domain, and support the nearby claim. Validate links deterministically; use a second model/verifier or entailment evaluation for semantic support, and abstain or soften claims when unsupported.
11. **Stream progressively.** Emit “searching,” result/source count, newly added sources, synthesis, citation checking, and final result as structured events. Do not label a result “verified” until it passes checks.
12. **Persist the research trace.** Save queries, provider results, fetched sources, source metadata, evidence spans, answer version, validation status, provider costs, and retrieval timestamps. Give users an inspectable source record without leaking internal prompts.

### Citation data model

```ts
type ResearchSource = {
  sourceId: string;
  taskId: string;
  url: string;
  canonicalUrl: string;
  title: string;
  domain: string;
  snippet?: string;
  publishedAt?: string;
  retrievedAt: string;
  provider: string;
  contentHash?: string;
  fetchStatus: "search_only" | "fetched" | "blocked" | "failed";
};

type Citation = {
  citationId: string;
  sourceId: string;
  evidenceChunkIds: string[];
  claimText: string;
  validation: "pending" | "supported" | "partial" | "unsupported";
  validatorVersion: string;
};
```

### Research modes

- **Quick:** one or two fast query waves, short synthesized answer, linked sources.
- **Think:** plan the approach internally, retrieve relevant facts/tools, check important assertions, then answer with concise explanation of approach/results. Do not reveal hidden chain-of-thought.
- **Deep research:** multi-query search, primary/secondary source analysis, conflict resolution, evidence-backed sections, validated citations, limitations, and saved final report.

These modes must be tied to budget and policy. Do not use “deep research” as a UI label if the run only did one search query.

---

## 8. Model routing and answer quality

Create a **verified provider/model registry** rather than scattering model identifiers across prompt handlers.

Each model record should declare:

- Exact provider and provider model ID, verified through an authorized source.
- Supported capabilities: text, vision, structured output, tools, long context, streaming.
- Context/output limits, timeout, supported regions, price/cost formula, data retention/training terms where known, and health state.
- Routing tags: low-latency, reasoning, coding, vision, extraction, synthesis, fallback.
- Reliability statistics: latency percentiles, failure codes, rate limits, quality scores, cost per successful task.

### Routing policy

1. Route by capability and task requirements, not a hard-coded universal “best” model.
2. Have a budget/latency/quality-aware primary selection and a tested fallback set.
3. Classify errors: transient timeout/5xx/rate-limit versus invalid model/auth/bad request/context overflow. Retry only retryable errors; do not endlessly retry a permanent failure.
4. Use exponential backoff with jitter, bounded attempts, circuit breakers, concurrency controls, and provider-specific rate limits.
5. Track per-key quota if key pools are legitimately authorized; rotate only to keys with valid permissions and never circumvent quotas or provider controls.
6. Make cancellation propagate to model streams. Set timeouts for connection, first token, total response, and each tool step.
7. Account prompt caching, token usage, image/audio units, retries, provider bills, and user plan limits. Use an idempotent ledger to prevent double charging.
8. Provide graceful fallbacks: simpler answer, ask a clarifying question, or disclose provider unavailability. Never invent a successful answer after a model failure.
9. Never relabel one vendor's model as another vendor's model. Do not advertise “GPT-6 Astra,” “unlimited,” or free access unless the backing provider/entitlement has been verified and the user-facing claims are accurate.
10. Treat “reasoning” as an observable quality/latency mode, not a promise to expose private chain-of-thought. Expose concise plans, progress, assumptions, evidence, and verification results.

### Quality improvement loop

Build a benchmark dataset for ordinary chat, current-fact questions, multi-source synthesis, follow-up continuity, coding, file tasks, tool use, browser automation, refusal/safety, and Tamil/English/Tanglish voice/chat. Each case should have expected outcomes, grader rubric, source requirements, latency and cost ceilings. Use deterministic tests first and model judges only with calibration and human spot checks.

---

## 9. Secure browser automation

Keep the current Playwright engine if it is useful, but place it behind the task engine, policy layer, worker isolation, and verified action protocol.

### Browser execution model

- Allocate one isolated Playwright `BrowserContext` per task/user session as the default. Do not share cookies, local storage, session storage, downloads, or browser profiles across users. Playwright documents isolated contexts: https://playwright.dev/docs/api/class-browsercontext.
- Reuse authenticated storage only for an explicitly paired, user-owned session, encrypted at rest, access controlled, expiring, revocable, and never made available to the language model as raw cookie values.
- Maintain a session state machine: `created -> attached -> running -> paused_for_approval -> completed/failed/cancelled`.
- Each browser action must have a typed action, a validated target, policy decision, timeout, precondition, and observable outcome. After actions, verify via DOM/state/URL/screenshot as appropriate.
- Prefer accessible DOM locators and robust semantics; use vision/screenshot coordinates only as a fallback and verify coordinate actions.
- Keep screenshots/frames permission-scoped, access-token protected, and short-lived. Don't store every frame permanently by default. Redact secrets and sensitive page regions where possible.
- Apply egress controls and safe-navigation policy. A page must not be able to convince the agent to access internal networks, upload secrets, or invoke privileged tools.
- Treat website content, emails, documents, and tool output as **untrusted data**, not policy/instructions. Prompt injection detection is not sufficient by itself; enforce actual permissions outside the model.
- Stop for CAPTCHA, MFA/OTP, OAuth approvals, payment, purchase, send/post/publish, deleting data, changing account security, or other irreversible/sensitive actions unless a specifically approved workflow allows the operation. The agent must not attempt to bypass access controls.
- Set maximum actions/iterations, time, navigation count, download size, file count, and per-task resource consumption. Detect loops and repeated failures.
- Capture an audit record for each action: task, user, domain, action class, approval ID if any, result code, timestamp, and redacted evidence reference.

### Browser event stream

Text/status events flow through task SSE. Browser frames and interactive-control messages use an authenticated `wss://` endpoint with a short-lived task-scoped ticket, strict Origin validation, bounded frame rate/size, reconnect behavior, and revocation checks. Never use a long-lived permanent browser-stream secret in the page.

---

## 10. Secure local computer control and Companion

The local companion is a security boundary. Treat it as a local privileged agent, not just an HTTP server.

### Pairing and authentication

- Bind the companion to loopback only; do not expose port 4141 publicly.
- Add explicit user-initiated pairing. Use a one-time short-lived pairing code/challenge and device public/private identity or equivalent strong device credentials. The server must never pair merely because a web page can contact localhost.
- Authenticate every command using a short-lived signed token bound to user, device, task, operation, expiry, and nonce. Enforce replay protection and revoke device keys/sessions.
- Validate the `Origin` header and expected host/port; implement CSRF/rebinding defenses. CORS alone is not a security boundary.
- Establish an outbound authenticated connection from the companion to the broker for remote reachability; do not expose an unauthenticated inbound command port.
- Allow users to disconnect and revoke the companion at any time. Show device state through existing API paths if available; UI changes are out of scope.

### Typed capabilities, not arbitrary shell by default

Define a tool registry with categories such as:

- Low risk: list approved project files, read file under approved workspace, open an approved URL, inspect process/port status.
- Medium risk: create/edit files inside a user-selected workspace, run a known development command inside the sandbox, launch a specifically named app.
- High risk: arbitrary shell, deleting/moving files outside workspace, installing software globally, changing settings, accessing password stores, sending messages, purchases, or account/security changes. Require explicit per-action approval, and deny prohibited operations.

Never turn natural language directly into unrestricted PowerShell. Prefer structured operations, executable allowlists, arguments as arrays (not shell-concatenated strings), normalized path checks, workspace allowlists, environment scrubbing, timeouts, process-tree termination, output-size limits, and low-privilege OS accounts. Where shell is necessary, run it in a disposable/isolated sandbox with restricted filesystem/network access.

### Approval protocol

A tool request for an approval-required operation creates `approval.required` with a human-readable summary, target application/domain/path, exact action, impact, expiry, and request hash. The server validates approval against the exact action and expires it after a short window. Approval for one operation must not authorize a later changed command. Denial, expiry, and cancellation are audited.

### Prompt injection and secrets

- Keep provider keys, companion secrets, cookies, and unrelated local files out of model context.
- Browser/document content may request dangerous actions; treat it as data and apply user/task policy.
- Prevent a task from reading arbitrary files and then exfiltrating them through browser/network tools.
- Never ask the model to handle passwords, OTPs, private keys, or raw session cookies.

---

## 11. Critical security remediation (first priority)

Fix and prove these before growing automation capabilities. The uploaded report says some may be present; verify each in source.

1. Remove hard-coded/test OTP acceptance and dev OTP responses from production builds. Use cryptographically random, short-lived, single-use OTPs; hash them at rest; rate-limit issuance/verification; invalidate after success; never echo the secret back.
2. Remove any recovery flow that grants Pro/admin status or creates privileged identities as a side effect. Plan entitlements come from verified billing/subscription records only.
3. Verify Google/OAuth tokens server-side against the identity provider; validate issuer, audience, signature, expiry, nonce/state, and account linking. Never trust posted client JSON as proof of identity.
4. Remove VIP/backdoor email rules. Admin status comes from explicit trusted role provisioning with audit.
5. Replace wildcard CORS with exact environment-specific origins. Do not combine `Access-Control-Allow-Origin: *` with credentials.
6. Rotate any real secrets that were ever committed. Use host secret stores; sanitize `.env*` policy; add secret scanning in CI and pre-commit where feasible. Example files contain names only, never live secrets.
7. Encrypt BYO API keys using envelope encryption/KMS or an equivalent managed key system. Restrict decryption to the provider adapter, mask logs, support rotation/revocation, and never return stored secrets from APIs.
8. Replace in-memory production rate limits and usage caps with shared atomic storage. Enforce per-IP, per-account, per-provider key, per-tool, and per-device limits.
9. Fail closed for auth, billing, task creation, usage accounting, and privileged actions when MongoDB/Redis policy dependencies are unavailable. No production mock-database writes or misleading success response.
10. Validate object ownership on every conversation, project, memory, file, task, event stream, automation job, approval, and device endpoint.
11. Harden SSRF in URL fetching and browser navigation; block local/private network targets and re-check every redirect/DNS resolution.
12. Replace command blocklists as the primary shell defense with capability allowlists, path confinement, OS-level sandboxing, least privilege, and approval policies.
13. Verify Razorpay/Stripe webhook signatures, replay protection, idempotent invoice/ledger updates, and server-side entitlement calculation.
14. Add request size limits, zod/schema validation, output escaping, secure cookie attributes, CSRF for mutating cookie-auth requests, session rotation/revocation, and safe error messages.
15. Add an incident switch to disable computer-control commands, browser writes, affected providers, or all long-running tasks without redeploying.

**Security acceptance gate:** Security tests demonstrate the above boundaries; the application must not silently bypass security checks to improve availability.

---

## 12. Durable queue, storage, and recovery

### Queue

Use a durable queue such as BullMQ on managed Redis, or another managed queue with equivalent durability guarantees. BullMQ supports configured retries/backoff and rate limits; see https://docs.bullmq.io/guide/retrying-failing-jobs and https://docs.bullmq.io/guide/rate-limiting.

Configure:

- Separate queues or queue classes for interactive chat-adjacent tasks, deep research, browser automation, indexing, and scheduled jobs.
- Priority/fairness by plan only within published product rules; ensure one user cannot occupy every worker.
- Exponential backoff with jitter for transient failures, with bounded attempts. Permanent errors should not retry.
- Job leases/heartbeats, stalled-job recovery, dead-letter records, manual replay tooling, and worker graceful shutdown.
- Per-user/provider concurrency limits, global queue depth caps, provider budgets, and back-pressure when overloaded.
- Task cancellation and deadline propagation.
- A durable task record as source of truth; queue jobs point at task IDs instead of holding the only task data.

### Atomicity and reconciliation

Use a transactional outbox where supported: write task state and outbox item together, publish outbox items asynchronously, then mark delivered. Run periodic reconciliation for queued tasks with no queue entry, stuck active jobs, unprocessed outbox items, and stale leases. Make all processors idempotent.

### Suggested collections (reuse/extend existing where appropriate)

- `tasks`: canonical lifecycle, owner, mode, state/version, budgets, deadlines, idempotency key, result references.
- `task_events`: ordered durable events with unique `(taskId, seq)` and indexes for replay/TTL.
- `task_steps`: DAG step state, dependencies, attempt count, tool/provider, outputs/errors.
- `outbox`: durable publish/queue dispatch items.
- `research_runs`, `research_sources`, `research_evidence`, `citations`: traceable source provenance.
- `approvals`: exact action summary/hash, requester, approver, expiry, outcome.
- `companion_devices`, `device_sessions`: device identities, status, revocation; never store private keys in plaintext.
- `provider_health`: recent provider status, latency/failures, circuit state.
- `usage_ledger`: immutable/idempotent debit/credit entries and correlation IDs.
- `memory_items`, `rag_documents`, `rag_chunks`: provenance, ACL, version, retention, embedding/index metadata.

Apply indexes deliberately: owner + created time, task state + updated time, unique idempotency key per owner/scope, unique `(taskId, seq)`, TTL only for data whose retention rules permit deletion. Version schema changes through migrations. Do not add TTL to billing/audit records without a deliberate retention and compliance decision.

### MongoDB outage policy

- Read-only non-sensitive cached responses may be served explicitly as stale, if the product supports that.
- Authenticated task creation, billing, approval, device control, and state changes should fail clearly if persistence cannot be guaranteed.
- Health endpoints must distinguish liveness from readiness. A live process with unavailable critical dependencies is not ready to receive critical traffic.
- Remove or disable mock fallback in production; allow fakes only in tests/local development.

---

## 13. RAG and memory that actually retrieve

### RAG pipeline

`upload/ingest -> validation -> extraction -> chunking -> embedding -> index -> retrieval -> reranking -> context assembly -> answer with source citations`.

Requirements:

- Track ingestion status and errors per file/version. Deduplicate using content hashes.
- Keep document owner/workspace/ACL on every chunk and enforce filters before ranking, not after content has entered the model prompt.
- Use hybrid keyword + vector retrieval with optional reranking. MongoDB Atlas Vector Search can be used if the deployment tier supports it; keep an adapter so the index implementation can change without changing chat APIs.
- Retrieve only the relevant chunks for the current question; use context budgets, diversity, and deduplication.
- Cite user documents using stable file/page/chunk references where available. Web citations and uploaded-file citations must be distinguishable.
- Reindex after document changes and delete index chunks when a file is deleted, permission changes, or the user requests erasure.
- Evaluate retrieval recall, ranking quality, answer faithfulness, and cross-tenant access.

### Memory types

Separate:

- Conversation history: user-visible transcript.
- Episodic summaries: compact summaries of past conversations/tasks.
- User profile/preferences: facts/preferences explicitly saved or inferred with controls.
- Project memory: project-scoped decisions, files, tool results, and progress.
- Procedural memory: approved reusable workflows, never automatic privilege grants.

Memory must have provenance, owner/workspace scope, confidence/verification status, creation/last-used timestamps, and retention/delete semantics. Give users controls through existing account/data export/delete APIs where possible. A memory from one user or project must never be retrieved in another context. Avoid injecting the last three conversation summaries indiscriminately into every request; retrieve based on relevance, recency, scope, and token budget.

---

## 14. Scheduled tasks, files, voice, and projects

- Wire a reliable scheduler to the durable queue; verify timezone, daylight-saving behavior, missed-run policy, retries, pause/resume, and duplicate prevention. A scheduled task uses the same authorization and event/task records as interactive work.
- Voice should normalize speech input into the shared task API and use the same policy and billing. Keep speech-specific streaming/TTS adapter separate from task execution. Interruption should cancel the active generation/tool where possible.
- Document generation and file conversion run in isolated workers with MIME validation, size limits, malware scanning where appropriate, output validation, and owner-scoped download links. Store artifacts durably; expiry should be explicit and compatible with user expectations.
- Project-building tasks need workspace isolation, path allowlists, checkpoints, patch previews, test execution, rollback, and artifact manifests. Do not let arbitrary projects execute on the web/API process.
- News/weather/stock/current facts need source timestamps and explicit freshness. Never make a currentness claim based only on model memory.

---

## 15. Observability and operations

Instrument the Next.js API, workers, provider calls, queue, MongoDB, browser worker, and companion broker with request/task correlation. OpenTelemetry supports JS traces and metrics; Next.js has an instrumentation convention and OpenTelemetry guidance: https://nextjs.org/docs/app/guides/instrumentation and https://opentelemetry.io/docs/languages/js/.

### Structured logs

Every log includes timestamps, environment, service, version, request ID, trace ID, task ID (if applicable), safe user/account identifier hash, provider, operation, duration, status, and retry count. Never log access tokens, raw API keys, OTPs, cookies, full private prompts by default, or unredacted sensitive file/command output.

### Metrics to add

- API: request count, error rate, p50/p95/p99 latency, response size, throttles.
- Chat: time to first token, completion time, abort/cancel rate, output tokens.
- Queue: wait time, depth, oldest age, retries, stalls, dead-letter count, per-queue concurrency.
- Research: query count, fetched sources, unique domains, citation integrity pass rate, time to first source, time to final report.
- Providers: latency, timeout, error class, quota errors, fallback rate, cost per success, breaker state.
- Browser: session start time, action success rate, verification failures, approval waits, loop detector triggers, worker saturation.
- Companion: connected devices, expired tokens, rejected actions, action duration, crashes/version mismatch.
- Data/security: auth failures, OTP abuse, cross-tenant denial, SSRF blocks, secret access, policy denials.
- Finance: usage ledger drift, webhook replay/duplicate count, orphaned payments, entitlement reconciliation.

Alert on degraded user-visible outcomes, queue backlog, provider outages, citations failing validation, repeated security probes, budget anomalies, and billing inconsistency. Add dashboards for service health and task traces.

### Deployment operations

- Pin dependencies and container/browser versions; produce reproducible builds.
- Run lint/typecheck/unit/integration/security/contract tests in CI.
- Use migrations with expand/contract compatibility so old/new workers can coexist during rollout.
- Use staging with production-like queue, Mongo indexes, and provider sandbox credentials.
- Canary by a small percentage or internal users, monitor, and roll back automatically on key SLO regressions.
- Feature flags and kill switches for deep research, individual providers, shell execution, browser writes, computer control, and scheduled tasks.
- Keep backups, restore drills, incident runbooks, and tested secret rotation.

---

## 16. Testing and evaluation gates

### A. Static/unit tests

- Task state transition rules, retry classifier, idempotency, policy engine, URL/SSRF validator, path confinement, tool schemas, citation registry, memory filters, usage ledger, entitlement checks.

### B. Contract tests

- Existing `/api/chat` SSE parser remains compatible.
- Existing voice/automation/job endpoints remain compatible.
- Every event type is schema-valid and has a consumer/visibility mapping.
- Every API has auth, schema, rate-limit, and ownership tests.
- WebSocket task tickets expire and cannot be used for another task/user.

### C. Integration tests

- Mongo/Redis/provider outage and recovery.
- Worker crash mid-task, retry, queue duplicate, event replay, cancellation, and shutdown.
- Outbox failure/reconciliation.
- Web research from search through source fetch to citation verification.
- RAG upload through answer with source references.
- Billing webhook duplicates and failed payments.
- Device pairing, revocation, command approval, and replay prevention.

### D. Security tests

- OTP brute force/replay; account enumeration; OAuth forgery; CORS/CSRF; session fixation; insecure direct object references; cross-tenant data/event access.
- SSRF and redirects to local/private IPs; DNS rebinding cases; oversized responses and decompression bombs.
- Prompt injection in web pages, documents, and tool outputs; attempts to exfiltrate environment secrets; tool permission escalation.
- Localhost browser attacks against companion, invalid Origin, forged/replayed task tickets, path traversal, shell metacharacters, symlink escapes, process/resource exhaustion.
- Secrets in logs/build artifacts/repository and BYOK decryption authorization.

### E. Research quality evaluations

Create gold cases for recent facts, scientific claims, prices/regulations, conflicting reporting, local/domestic questions, obscure topics, misinformation, and no-search prompts. Grade:

- URL/title/domain correctness and link resolution.
- Claim-to-citation support, citation coverage, freshness accuracy, diversity/independence of sources.
- Unsupported-claim rate, hallucinated sources, contradiction handling, completeness, and abstention behavior.
- Search latency, report latency, provider spend, and final answer usefulness.

### F. Agent/coding/browser evaluations

- Goal completion, steps per success, verified action success, recovery success, false success rate, approvals correctly requested, unauthorized action count, time and cost per successful task.
- Browser tasks should verify postconditions rather than treating a click as success.
- Human review a sample of model-graded tasks to detect grader drift.

No phase is complete because the code compiles. A phase is complete only when its acceptance tests pass and the unchanged UI is contract-tested against the capability that is claimed to be visible.

---

## 17. Phased implementation order

### Phase 0 — Inventory and baseline lock

- Map every route, model provider, search provider, queue, worker, collection, task scheduler, tool, and local companion command.
- Identify which process owns each side effect and where long-running tasks execute.
- Capture current behavior with API contract tests and existing Playwright/evaluation suites.
- Make a protected branch and establish baseline latency, failure rates, provider costs, citation quality, and browser success.
- Record all UI files and enforce a CI check that the backend branch does not alter them.

**Exit gate:** source-backed architecture inventory, reproducible tests, baseline metrics, no undocumented critical routes.

### Phase 1 — P0 security and production truthfulness

- Fix recovery/OAuth/backdoor/CORS/plaintext-key/secrets issues if verified.
- Remove production mock DB fallback and replace in-memory rate limits with shared storage.
- Harden owner/tenant checks, SSRF, shell access, payment idempotency, and approval policy.
- Verify all model IDs, provider permissions, subscription claims, and “free/unlimited” copy.

**Exit gate:** security tests pass, secrets rotated, deployment fails safely without critical dependencies.

### Phase 2 — Shared task and event foundation

- Introduce typed `TaskContext`, canonical task state machine, storage repositories, event schema, event persistence, and contract/version policy.
- Add task/event indexes and migrations.
- Implement idempotency keys and outbox/reconciliation.
- Preserve `/api/chat` output and legacy endpoint adapters.

**Exit gate:** tasks and events survive restarts; no lost accepted tasks in fault-injection tests; old chat clients still parse streams.

### Phase 3 — Durable workers and real-time progress

- Add durable queue, worker classes, retry classifier, per-user concurrency, backoff, cancellation, dead-letter handling, and stale-job recovery.
- Add task SSE replay with `Last-Event-ID`; authenticate streams and enforce owner scoping.
- Route long research/browser/file work into workers instead of relying on one HTTP request to stay alive.
- Add queue/latency dashboards and alerts.

**Exit gate:** restart, timeout, retry, reconnect, duplicate-delivery, and cancel tests pass.

### Phase 4 — Research engine and trusted citations

- Consolidate search provider adapters and normalized source model.
- Add safe page fetch, canonicalization, deduplication, evidence registry, citation schemas, citation validation, and progressive source events.
- Implement Quick/Think/Deep Research budgets and quality gates.
- Test existing UI parser/rendering without UI modifications. Explicitly report unsupported citation/source rendering if the current UI cannot display it.

**Exit gate:** source URLs are real and traced; fabricated citation rate is measured; multi-source evaluation passes thresholds.

### Phase 5 — Model router and shared orchestrator

- Consolidate model registry, capability-based route selection, timeouts, retries, circuit breakers, fallbacks, budgets, and usage accounting.
- Migrate chat and voice to shared policy/task/tool infrastructure while keeping modality adapters.
- Add safe plan summaries and visible progress—not hidden chain-of-thought dumps.
- Add model quality/latency/cost benchmarks.

**Exit gate:** provider failures degrade gracefully, no false identity labels, usage is idempotent, benchmark quality improves against baseline.

### Phase 6 — Browser agent and Companion security

- Put Playwright behind task workers and isolated contexts; add session lifecycle and robust action verification.
- Add screenshot stream tickets, frame limits, reconnect support, redaction, and audit records.
- Implement secure device pairing, signed expiring commands, revocation, typed capabilities, workspace confinement, approvals, and OS-level sandboxing.
- Test prompt injection, localhost attacks, path traversal, replay, and unauthorized actions.
- Audit whether the existing UI mounts the live view. Do not edit UI under this plan; document end-to-end visibility blockers.

**Exit gate:** no cross-user browser storage, no privileged action without exact approval, browser actions are verified, stream authorization is tested.

### Phase 7 — RAG, memory, and scheduled tasks

- Implement retrieval for existing ingested documents; hybrid retrieval and reranking; citations for uploaded documents.
- Separate memory types and enforce owner/project/retention scopes.
- Connect the scheduler to the durable queue; test timezone, retries, duplicate prevention, and pause/resume.

**Exit gate:** retrieval quality measured, source provenance displayed through supported UI pathways, no cross-tenant retrieval, schedule runs persist across restarts.

### Phase 8 — Observability, evaluation, and cost governance

- Add OpenTelemetry, structured redacted logs, metrics, alerts, dashboards, usage ledger audits, and provider quality reports.
- Expand eval suites for research citations, conversation follow-up, safety, coding/browser workflows, Tamil/English/Tanglish, and resilience.
- Enforce CI quality gates and provider/cost budgets.

**Exit gate:** core SLO dashboards/alerts function in staging; release quality gates are mandatory.

### Phase 9 — Controlled production rollout

- Migrate data using backward-compatible schema changes.
- Enable backend capabilities behind feature flags; run shadow tests where safe.
- Canary, compare against baseline, and roll back on regression.
- Run backup restore and incident drills; document operator controls and kill switches.

**Exit gate:** signed-off operational readiness review and evidence of recovery under injected failure.

---

## 18. Definition of production-ready

Do not call the platform production-ready until all are true:

- Security blockers have been verified and resolved; secrets rotated; no backdoor/test OTP path in production.
- Critical APIs validate identity, ownership, scope, and input; auth/payment/task operations fail safely on dependency outage.
- Long tasks are durable, idempotent, cancellable, retryable, observable, and replayable after reconnect.
- The chat API remains backward compatible or has a tested versioned migration.
- All displayed research citations correspond to actual retrieved sources and have measurable claim support.
- Browser and computer tools enforce policies independent of model instructions, with exact-action approvals for sensitive operations.
- No user/project/file/memory/browser session can cross tenant boundaries.
- RAG retrieval and scheduled tasks are end-to-end tested, not merely defined.
- Traces/metrics/alerts, dashboards, kill switches, rollback, backups, and runbooks exist.
- Benchmarks show measured results for answer quality, citation integrity, task success, latency, availability, and cost.
- UI remains unchanged; any capability that needs a missing UI subscription/component is explicitly called backend-ready but not end-to-end user-visible.

---

## 19. Master prompt for the AI coding agent

Paste the following into your coding agent after opening the Likeway AI repository.

> You are the senior staff/principal engineer responsible for upgrading the existing Likeway AI repository to production-grade quality. Use the repository itself as the source of truth; the architecture report is a hypothesis to verify, not proof of current code behavior.
>
> **Hard constraint: backend only. Do not edit `src/app/page.tsx`, any `src/components/**` UI file, CSS, styles, visual assets, layout files, or other frontend presentation code. Do not redesign the UI.** Create API/event contracts that are backward compatible and document any capability that cannot appear in the current UI because the UI has no subscriber/renderer. Never modify UI as a workaround.
>
> **Do not rewrite the whole application at once.** First inventory routes, services, data collections, provider adapters, tool execution paths, queue/worker entry points, the Companion, secrets/config, and tests. Find the real callers and side effects. Write a source-backed migration plan and add tests before refactoring.
>
> Follow the phased implementation order in `Likeway_AI_Production_Backend_Upgrade_Plan.md` if that file is in the repository; otherwise create/consult the equivalent approved plan. Prioritize verified P0 security vulnerabilities over new features. In particular, verify and remove any test OTP bypasses, dev OTP exposure, unauthorized plan escalation, client-trusted OAuth identity, hidden admin backdoors, unsafe CORS, plaintext provider keys, committed secrets, in-memory production rate limiting, mock-database production fallback, SSRF weaknesses, unrestricted shell execution, and non-idempotent billing. Rotate any exposed secrets and use host secret management.
>
> Build one canonical task lifecycle shared by chat, voice, deep research, browser, desktop, file generation, project work, and scheduled jobs. Use typed task state transitions, explicit budgets/deadlines, cancellation, idempotency, durable persistence, a durable queue, bounded retries, backoff, dead-letter handling, and reconciliation. MongoDB is the durable source of truth; do not silently claim a task succeeded if durable persistence failed. Add an outbox or equivalent reliable dispatch mechanism.
>
> Add a versioned `LikewayTaskEventV1` contract, durable ordered events, replay with `Last-Event-ID`, safe reconnect semantics, authenticated SSE, and a short-lived task-scoped WebSocket ticket for browser frames. Preserve current `/api/chat` stream shape and existing endpoints until contract tests prove compatibility. Do not leak secrets, raw cookies, stack traces, sensitive command output, or private chain-of-thought into user-visible events.
>
> Build real web research provenance: query plan, parallel provider adapters, canonical URLs, safe HTTP fetching with SSRF/redirect/DNS defenses, deduplication, source metadata, evidence spans, citations tied to fetched/search-result IDs, and deterministic plus semantic citation validation. A citation must refer to an actual source for this run and support the nearby claim. Do not fabricate sources, titles, dates, model identities, or freshness. Respect provider terms and limits.
>
> Build a verified model registry with exact provider model IDs, capability routing, per-provider timeouts, error classification, bounded retry/backoff, circuit breakers, rate controls, usage accounting, and truthful fallback behavior. Never relabel models or make unverified “free/unlimited” claims. Optimize task success and measured quality/cost, not just model count.
>
> Harden Playwright and Companion. Isolate browser contexts by task/user, protect persistent sessions, limit egress, treat web/document content as untrusted, verify postconditions after actions, enforce action budgets, and audit every meaningful action. Companion commands must require secure device pairing and short-lived signed authorization. Use typed allowlisted operations, workspace/path confinement, process limits, least privilege, and exact-action approvals for high-impact actions. Never translate user/model text directly into unrestricted shell execution. Do not bypass CAPTCHA, MFA, access controls, or approval requirements.
>
> Implement actual retrieval for the existing RAG ingestion path with owner/project filtering before content enters the prompt; use hybrid keyword/vector retrieval where supported, provenance, reranking, indexing/deletion lifecycle, and measurable retrieval evaluations. Scope memory by user/project, make retention/deletion explicit, and do not inject irrelevant memory into every request. Wire scheduled jobs to the durable queue.
>
> Add OpenTelemetry/structured redacted logs/metrics/alerts, provider/queue/task dashboards, SLO evaluations, security tests, resilience tests, research citation evaluations, cross-tenant tests, and cost/billing audits. Make changes via small migration steps with rollback paths. Do not delete existing functionality without parity tests.
>
> **For every implementation step:** state the files inspected and changed, the security/compatibility risks, the tests added, the exact commands run, and their actual output. Never claim tests passed if they were not run. Do not leave fake implementations, TODOs, placeholder success responses, or swallowed exceptions. If a dependency is unavailable, state that and provide a safe fallback or a clear blocked status. Keep the UI untouched and verify this with `git diff --name-only` before completion.
>
> **Required final deliverable:** architecture change summary; old-to-new flow diagram; per-file change list; migration and rollback plan; API/event schemas; threat model; environment-variable list with descriptions but no secret values; unit/integration/contract/security/evaluation test results; deployment checklist; remaining risks; and a clear table showing which features are backend-ready versus proven visible in the unchanged UI.

---

## 20. Official technical references

Use official documentation for final configuration choices and pin versions compatible with this repository:

- Vercel Functions limits: https://vercel.com/docs/functions/limitations
- Vercel function duration configuration: https://vercel.com/docs/functions/configuring-functions/duration
- BullMQ retry handling: https://docs.bullmq.io/guide/retrying-failing-jobs
- BullMQ rate limiting: https://docs.bullmq.io/guide/rate-limiting
- Playwright BrowserContext isolation: https://playwright.dev/docs/api/class-browsercontext
- Next.js instrumentation: https://nextjs.org/docs/app/guides/instrumentation
- OpenTelemetry JavaScript: https://opentelemetry.io/docs/languages/js/

These references support implementation choices; they do not establish that any capability is already implemented in Likeway AI. Verify the deployed Vercel plan, queue deployment, MongoDB tier, provider contracts, and exact code before making operational claims.
