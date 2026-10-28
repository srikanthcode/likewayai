window.AUDIT_DATA = {
  generated: "2026-10-21",
  kpis: [
    { value: "211", label: "source files", hint: "157 TS · 53 TSX · 1 CSS" },
    { value: "46,132", label: "lines of source", hint: "src/ only" },
    { value: "83", label: "HTTP handlers", hint: "GET/POST/PUT/DELETE exports" },
    { value: "23", label: "model entries", hint: "catalog is partly fictional" },
    { value: "60", label: "agent definitions", hint: "static registry" },
    { value: "5", label: "integration manifests", hint: "state held in memory" }
  ],

  statuses: {
    implemented: { label: "Implemented", note: "Code path exists and was read; runtime not proven." },
    partial: { label: "Partial", note: "Core exists, but a dependency, guard, or wiring is missing." },
    mocked: { label: "Mocked / simulated", note: "User-facing behavior is simulated or rebranded." },
    missing: { label: "Missing", note: "No implementation was found." },
    blocked: { label: "Blocked", note: "Cannot be exercised in this static audit." }
  },

  verdicts: [
    { score: "Breadth", title: "Very broad surface area", text: "Chat, research, images, voice, automation, preview, integrations, payments, and project memory all have substantial implementation. This is not a thin prototype." },
    { score: "Depth", title: "Uneven wiring", text: "Several backends are real but detached from the UI, while some UI surfaces are convincing simulations. The browser viewport is the clearest example." },
    { score: "Security", title: "Trust boundaries are weak", text: "Unauthenticated AI, RAG, and automation endpoints coexist with client-supplied identity headers and a committed provider key. Preview HTML runs on the app origin." },
    { score: "Honesty", title: "Claims outrun evidence", text: "Fictional frontier model names, simulated streaming, and a “zero mocks” claim conflict with the implementation. Some notable features, such as deep research and the local-only builder guard, are genuinely implemented." },
    { score: "Ops", title: "State is process-local", text: "Integration credentials, connected apps, previews, and some stores live in global in-memory maps. Restarts and multi-instance deployment will lose or split state." }
  ],

  claims: [
    { state: "misleading", q: "“23 frontier AI models” including Claude, GPT, Gemini, and Grok variants.", a: "The catalog contains names that do not correspond to public products, routed largely through a free worker proxy. Model identity is rewritten before display." },
    { state: "misleading", q: "“Real live browser viewport” while agents navigate the web.", a: "VisibleBrowserWorkspace is a scripted animation over an iframe. The Playwright backend and WebSocket stream exist but are not consumed by that viewport." },
    { state: "misleading", q: "“Zero simulated mocks” in the integrations experience.", a: "Integration credentials and connection state are in-memory globals; the browser viewport is simulated; one chat provider is replayed as a fake stream." },
    { state: "mixed", q: "Production-ready payments and plan upgrades.", a: "Razorpay order creation and HMAC checks are real, but plan confirmation trusts a client plan ID when the stored payment reference is absent, and webhooks return 503 without a secret." },
    { state: "mixed", q: "Neural voice conversation.", a: "Gemini TTS and a voice-chat endpoint exist. Conversation is request/response, not full-duplex, and TTS falls back to the browser when unconfigured." },
    { state: "mixed", q: "Autonomous app building.", a: "The engine is real but only writes projects on a local host; cloud deployments explicitly refuse. This is a sensible guard, not a cloud feature." },
    { state: "honest", q: "Local-only computer control and project generation.", a: "Cloud hosts are refused by design. The code returns a clear warning instead of pretending the action succeeded." },
    { state: "honest", q: "Real-time deep research.", a: "A multi-phase SSE pipeline performs subquery generation, source search, and synthesis. Runtime still needs credentials and verification." }
  ],

  features: [
    {
      id: "chat-native-stream",
      name: "Chat streaming — native providers",
      category: "Chat & AI",
      status: "partial",
      runtime: "Not executed",
      risk: "medium",
      summary: "SSE endpoint and client reader exist for providers that stream tokens. The UI also has a progressive fallback path.",
      details: "The chat route builds a ReadableStream for native streaming providers and emits data-only SSE frames. The client hook parses them and updates the transcript. Runtime behavior, abort handling, and provider-specific frames were not exercised.",
      evidence: [
        { file: "src/app/api/chat/route.ts", note: "Streaming response construction and protocol branching." },
        { file: "src/hooks/useSSEChatStream.ts", note: "Client SSE reader and message assembly." },
        { file: "src/app/page.tsx", note: "Monolithic chat UI, 4,744 lines." }
      ]
    },
    {
      id: "chat-worker-stream",
      name: "Chat streaming — free worker proxy",
      category: "Chat & AI",
      status: "mocked",
      runtime: "Not executed",
      risk: "medium",
      summary: "One provider returns a complete JSON answer, which is then replayed with timed chunks to look like token streaming.",
      details: "progressiveStream splits an already-received answer and emits it on a timer. This is simulated latency, not upstream token streaming. It also appends a completion marker and sanitizes identity before emission.",
      evidence: [
        { file: "src/app/api/chat/route.ts:1801", note: "progressiveStream implementation." },
        { file: "src/app/api/chat/route.ts:1922", note: "Final content sanitization and completion." }
      ]
    },
    {
      id: "model-catalog",
      name: "Frontier model catalog",
      category: "Chat & AI",
      status: "mocked",
      runtime: "Not executed",
      risk: "high",
      summary: "23 entries include plausible but non-existent model names, mapped to proxy routes rather than first-party APIs.",
      details: "Names such as claude-opus-5.5, gpt-6-astra, and similar variants are presented as products. Routing resolves them to free or third-party proxies. This is a trust and support risk, not merely a naming issue.",
      evidence: [
        { file: "src/lib/models.ts", note: "Model catalog and routing metadata." },
        { file: "src/lib/api-manager.ts", note: "Provider selection and request routing." }
      ]
    },
    {
      id: "entitlements",
      name: "Plan entitlements and daily limits",
      category: "Commerce & Identity",
      status: "partial",
      runtime: "Not executed",
      risk: "high",
      summary: "Server-side plan limits exist for messages, frontier models, images, research, voice, and automation, but entitlement checks fail open on database errors.",
      details: "consumeEntitlement is called before expensive operations. On storage failure the code allows the operation, trading abuse resistance for availability. Client localStorage only controls UI visibility; the server remains authoritative when it can read state.",
      evidence: [
        { file: "src/lib/entitlements.ts", note: "Per-plan limits and fail-open behavior." },
        { file: "src/lib/plans.ts", note: "Plan definitions, model allowlists, client cache." },
        { file: "src/lib/user.ts", note: "Database plan resolution; admin maps to Pro." }
      ]
    },
    {
      id: "identity-sanitizer",
      name: "Model identity rewriting",
      category: "Chat & AI",
      status: "mocked",
      runtime: "Not executed",
      risk: "medium",
      summary: "Responses are post-processed to hide the upstream model identity and present a consistent brand persona.",
      details: "sanitizeSelfIdentity rewrites self-references in assistant output and is applied to streamed and final content. This is presentation logic, but it compounds the model-catalog integrity problem.",
      evidence: [
        { file: "src/app/api/chat/route.ts:1649", note: "sanitizeSelfIdentity." },
        { file: "src/app/api/chat/route.ts:1760", note: "Worker content sanitization." }
      ]
    },
    {
      id: "vision-files",
      name: "Vision and file attachments",
      category: "Chat & AI",
      status: "partial",
      runtime: "Not executed",
      risk: "low",
      summary: "Image and document attachments are parsed and routed into multimodal request shapes for supported providers.",
      details: "The chat route includes attachment handling and provider-specific message construction. File limits, unsupported-type behavior, and storage cleanup were not runtime tested.",
      evidence: [
        { file: "src/app/api/chat/route.ts", note: "Attachment parsing and multimodal message assembly." }
      ]
    },
    {
      id: "image-generation",
      name: "Image generation",
      category: "Research & Media",
      status: "partial",
      runtime: "Not executed",
      risk: "high",
      summary: "Image generation routes to configured providers with a Pollinations fallback, including a hardcoded fallback key.",
      details: "Provider selection and quota behavior exist. The fallback key is a security issue separate from functionality, and image outputs were not generated during this audit.",
      evidence: [
        { file: "src/app/api/generate-image/route.ts", note: "Generation handler." },
        { file: "src/config/keys.ts:27", note: "Hardcoded Pollinations fallback key (value not reproduced)." }
      ]
    },
    {
      id: "image-editing",
      name: "Image editing",
      category: "Research & Media",
      status: "partial",
      runtime: "Not executed",
      risk: "medium",
      summary: "Editing support depends on provider capabilities and is exposed through a dedicated route.",
      details: "The route and client affordances exist. No runtime verification of mask handling, output formats, or provider fallbacks was possible without keys.",
      evidence: [
        { file: "src/app/api/edit-image/route.ts", note: "Editing handler and provider dispatch." }
      ]
    },
    {
      id: "deep-research",
      name: "Deep research pipeline",
      category: "Research & Media",
      status: "implemented",
      runtime: "Not executed",
      risk: "low",
      summary: "A genuine multi-phase SSE pipeline: plan subqueries, search sources, read results, and synthesize a report.",
      details: "This is one of the stronger implementations. It uses fast models for planning and a larger model for synthesis, with phased SSE events for progress. Quality and provider keys remain unverified.",
      evidence: [
        { file: "src/lib/deep-research.ts:66", note: "executeDeepResearch pipeline." },
        { file: "src/app/api/research/route.ts", note: "SSE endpoint." }
      ]
    },
    {
      id: "search-grounding",
      name: "Web search grounding",
      category: "Research & Media",
      status: "partial",
      runtime: "Not executed",
      risk: "low",
      summary: "Multiple search and reader providers are integrated with fallbacks for chat grounding and research.",
      details: "Tavily, Brave, Firecrawl, Jina, and DuckDuckGo paths exist. Reliability depends on keys and per-provider rate limits; no live queries were made.",
      evidence: [
        { file: "src/lib/browsing.ts", note: "Search and reader integrations." },
        { file: "src/lib/tools.ts", note: "Tool exposure to the orchestrator." }
      ]
    },
    {
      id: "voice-chat",
      name: "Voice chat endpoint",
      category: "Research & Media",
      status: "partial",
      runtime: "Not executed",
      risk: "medium",
      summary: "A real REST endpoint handles voice turns with a branded identity and entitlement checks; transport is not full-duplex.",
      details: "The client captures speech, posts a turn, and plays returned audio. It is not a WebRTC or bidirectional streaming conversation. Duration is capped at 60 seconds per request.",
      evidence: [
        { file: "src/app/api/voice-chat/route.ts", note: "Turn handler, identity prompt, maxDuration." },
        { file: "src/components/VoiceAssistant.tsx", note: "Client capture and playback." }
      ]
    },
    {
      id: "tts",
      name: "Neural text-to-speech",
      category: "Research & Media",
      status: "partial",
      runtime: "Not executed",
      risk: "low",
      summary: "Gemini TTS is integrated with base64 audio responses; missing configuration returns 501 and the client falls back to browser speech.",
      details: "This is a graceful degradation path, not a guaranteed neural voice. Model and voice are environment-configurable.",
      evidence: [
        { file: "src/app/api/tts/route.ts", note: "Gemini TTS and fallback status." }
      ]
    },
    {
      id: "learning",
      name: "Learning and question generation",
      category: "Chat & AI",
      status: "implemented",
      runtime: "Not executed",
      risk: "low",
      summary: "Dedicated routes generate study questions and evaluate answers through the model orchestrator.",
      details: "The handlers and prompts exist. Output quality and persistence behavior were not tested live.",
      evidence: [
        { file: "src/app/api/learning/route.ts", note: "Learning endpoints." }
      ]
    },
    {
      id: "news",
      name: "News feed",
      category: "Research & Media",
      status: "mocked",
      runtime: "Not executed",
      risk: "low",
      summary: "When live retrieval fails, the news route returns mock articles rather than an error or empty state.",
      details: "Fallback content can be mistaken for current reporting. The UI does not clearly distinguish mock fallback from live news.",
      evidence: [
        { file: "src/app/api/news/route.ts", note: "Mock data fallback." }
      ]
    },
    {
      id: "support",
      name: "Support and contact workflow",
      category: "Data & Ops",
      status: "missing",
      runtime: "Not executed",
      risk: "low",
      summary: "User-facing support appears to be a placeholder; no durable ticketing or delivery path was found.",
      details: "TODO notes reference support follow-up. A marketing contact surface may exist, but there is no verified support pipeline in the audited routes.",
      evidence: [
        { file: "TODO.md", note: "Outstanding support-related items." }
      ]
    },
    {
      id: "browser-engine",
      name: "Playwright browser engine",
      category: "Automation",
      status: "implemented",
      runtime: "Not executed",
      risk: "high",
      summary: "A substantial Playwright engine with a browser pool, task execution, screenshots, and health checks exists for local and Render hosts.",
      details: "The worker and engine are real code, not a mock. Exposure comes from the surrounding job APIs, not from the engine itself. Cloud invocation is proxied from Vercel to Render.",
      evidence: [
        { file: "src/lib/automation/browser-engine.ts", note: "Large Playwright execution engine." },
        { file: "src/lib/automation/browser-worker.ts", note: "Worker and health reporting." },
        { file: "src/lib/automation/browser-ws-server.ts", note: "WebSocket frame server." }
      ]
    },
    {
      id: "automation-jobs",
      name: "Automation job API and stream",
      category: "Automation",
      status: "partial",
      runtime: "Not executed",
      risk: "high",
      summary: "Jobs are created, queued, executed, and streamed over SSE, but job reads, cancellation, and the stream lack authentication and ownership checks.",
      details: "The queue uses an in-process EventEmitter plus database polling, which is workable on one worker but weak across instances. DELETE on the collection route takes no request argument, so it cannot authorize the caller at all.",
      evidence: [
        { file: "src/app/api/automation/route.ts:311", note: "DELETE handler without a request argument." },
        { file: "src/app/api/automation/jobs/[id]/route.ts", note: "Job read routes without verified ownership." },
        { file: "src/app/api/automation/jobs/[id]/stream/route.ts", note: "Unauthenticated SSE stream." },
        { file: "src/lib/automation/job-queue.ts", note: "Queue lifecycle and polling." }
      ]
    },
    {
      id: "browser-ws",
      name: "Live browser WebSocket transport",
      category: "Automation",
      status: "blocked",
      runtime: "Not executed",
      risk: "medium",
      summary: "The frame server exists but only starts on Render, and no active UI consumer was found.",
      details: "The stream is served on port 10001 at /browser-stream. The client component that could consume it is unused. This needs deployment-level verification before it can be called a live viewport.",
      evidence: [
        { file: "src/lib/startup.ts", note: "Render-only WebSocket startup." },
        { file: "src/instrumentation.ts", note: "Startup hook." },
        { file: "src/components/LiveBrowserView.tsx", note: "Unused consumer." }
      ]
    },
    {
      id: "browser-viewport",
      name: "Live browser viewport UI",
      category: "Automation",
      status: "mocked",
      runtime: "Not executed",
      risk: "high",
      summary: "The visible automation viewport is a scripted animation with fake steps, cursor movement, and a plain iframe of the target URL.",
      details: "It does not receive Playwright frames. Presenting this as the agent's live browser is the most significant integrity gap in the product surface.",
      evidence: [
        { file: "src/components/VisibleBrowserWorkspace.tsx", note: "Simulated steps, cursor, latency, and iframe." },
        { file: "src/app/page.tsx:4728", note: "Workspace rendered in the main chat page." }
      ]
    },
    {
      id: "computer-control",
      name: "Computer control / desktop actions",
      category: "Automation",
      status: "partial",
      runtime: "Not executed",
      risk: "high",
      summary: "Desktop control is designed for a local companion and is refused on cloud hosts.",
      details: "This constraint is appropriate. The companion process itself was not executed, so privilege boundaries and command validation remain unverified.",
      evidence: [
        { file: "companion/likeway-companion.js", note: "Local companion process." },
        { file: "src/lib/automation/engine.ts", note: "Host gating and action dispatch." }
      ]
    },
    {
      id: "autonomous-builder",
      name: "Autonomous app builder",
      category: "Preview & Builder",
      status: "partial",
      runtime: "Not executed",
      risk: "medium",
      summary: "Generates project specs and writes files locally; cloud requests are refused with an explicit warning.",
      details: "The engine can scaffold a project under ~/LikewayProjects. It is not a cloud build-and-deploy product. The guard is honest; the feature remains local-only.",
      evidence: [
        { file: "src/lib/autonomous/engine.ts:923", note: "executeAutonomousProject." },
        { file: "src/lib/autonomous/engine.ts:52", note: "Intent detection." }
      ]
    },
    {
      id: "live-preview",
      name: "Live preview workspace",
      category: "Preview & Builder",
      status: "partial",
      runtime: "Not executed",
      risk: "high",
      summary: "Preview sessions compile executable HTML and render it in-app, but sessions are in-memory and the iframe weakens its own sandbox.",
      details: "Serving generated HTML on the app origin with allow-same-origin plus allow-scripts enables same-origin script behavior. Frame restrictions also allow broad embedding. Runtime behavior was not exercised.",
      evidence: [
        { file: "src/lib/preview/preview-manager.ts", note: "In-memory sessions and bundle build." },
        { file: "src/app/api/preview/session/route.ts", note: "Unauthenticated session creation." },
        { file: "src/app/api/preview/render/[id]/route.ts", note: "Executable HTML delivery and CSP." },
        { file: "src/components/LivePreviewWorkspace.tsx:607", note: "Iframe sandbox flags." }
      ]
    },
    {
      id: "integrations",
      name: "Connected apps and tool execution",
      category: "Data & Ops",
      status: "partial",
      runtime: "Not executed",
      risk: "high",
      summary: "A catalog of five manifests exposes tools and approval flows, but credentials and connection state are process-local.",
      details: "A 637-line registry dispatches integration tools. Credentials live in a global in-memory map, and the route falls back to a client-supplied x-user-id when no token is present. Restarts lose connections; multi-instance deployments diverge.",
      evidence: [
        { file: "src/lib/integrations/integration-registry.ts", note: "Catalog, approvals, tool dispatch." },
        { file: "src/lib/integrations/credentials-store.ts", note: "In-memory credential store." },
        { file: "src/app/api/integrations/route.ts:20", note: "x-user-id identity fallback." }
      ]
    },
    {
      id: "agents",
      name: "Agent catalog",
      category: "Chat & AI",
      status: "partial",
      runtime: "Not executed",
      risk: "low",
      summary: "Around 60 agent definitions supply prompts and metadata; execution depends on the shared orchestrator.",
      details: "The registry is substantial but is a catalog, not 60 independent runtimes. Tool permissions and per-agent isolation were not verified.",
      evidence: [
        { file: "src/lib/agent-registry.ts", note: "Agent definitions." },
        { file: "src/lib/ai-orchestrator.ts", note: "Shared execution path." }
      ]
    },
    {
      id: "projects-memory",
      name: "Projects, files, and memory",
      category: "Data & Ops",
      status: "implemented",
      runtime: "Not executed",
      risk: "low",
      summary: "Project containers, files, tasks, conversations, and memory are persisted through MongoDB collections.",
      details: "Dedicated collections exist for each concern. Multi-user isolation and retention behavior were not tested live.",
      evidence: [
        { file: "src/app/api/projects/route.ts", note: "Project CRUD." },
        { file: "src/lib/mongodb.ts", note: "Database access with fallback store." }
      ]
    },
    {
      id: "rag",
      name: "RAG ingestion",
      category: "Data & Ops",
      status: "partial",
      runtime: "Not executed",
      risk: "high",
      summary: "Documents can be chunked and ingested into rag_documents; the ingest endpoint is unauthenticated.",
      details: "The retrieval path is real, but open ingestion permits data poisoning, storage abuse, and cost consumption. No rate limit or caller identity was found on the route.",
      evidence: [
        { file: "src/app/api/ingest/route.ts", note: "Unauthenticated ingestion." },
        { file: "src/lib/rag.ts", note: "Chunking, embeddings, retrieval." }
      ]
    },
    {
      id: "razorpay",
      name: "Razorpay checkout",
      category: "Commerce & Identity",
      status: "partial",
      runtime: "Not executed",
      risk: "high",
      summary: "Order creation and HMAC verification are implemented; confirmation trusts the client plan ID when a payment reference is missing.",
      details: "The server prices the order, but the client later submits planId. If getPaymentRef returns nothing, the ownership and plan binding check is skipped and the plan is persisted after signature validation.",
      evidence: [
        { file: "src/app/api/create-order/route.ts", note: "Server-side order pricing." },
        { file: "src/app/api/verify-payment/route.ts", note: "Signature check; no plan grant." },
        { file: "src/app/api/subscription/confirm/route.ts:147", note: "Conditional payment-reference binding." },
        { file: "src/app/pricing/page.tsx", note: "Client checkout and confirm flow." }
      ]
    },
    {
      id: "stripe",
      name: "Stripe checkout (secondary)",
      category: "Commerce & Identity",
      status: "partial",
      runtime: "Not executed",
      risk: "medium",
      summary: "A Stripe checkout branch validates session metadata before granting a plan.",
      details: "The implementation differs from Razorpay and is conditionally configured. Webhook handling was not exercised.",
      evidence: [
        { file: "src/app/api/checkout/route.ts", note: "Stripe checkout creation." },
        { file: "src/app/api/subscription/confirm/route.ts", note: "Stripe session verification branch." }
      ]
    },
    {
      id: "subscriptions",
      name: "Subscription lifecycle and webhook",
      category: "Commerce & Identity",
      status: "partial",
      runtime: "Not executed",
      risk: "high",
      summary: "Captured, cancelled, and expired events update plans, but the webhook refuses all work when its secret is unset.",
      details: "Without RAZORPAY_WEBHOOK_SECRET the endpoint returns 503. The client-driven confirm path may still upgrade a plan, but failed confirmations leave paid users without entitlement until reconciliation.",
      evidence: [
        { file: "src/app/api/webhook/razorpay/route.ts:23", note: "Secret check and 503." },
        { file: "src/app/api/webhook/razorpay/route.ts:76", note: "Plan updates from events." },
        { file: "src/app/success/page.tsx", note: "Confirmation and polling." }
      ]
    },
    {
      id: "auth",
      name: "Authentication and sessions",
      category: "Commerce & Identity",
      status: "partial",
      runtime: "Not executed",
      risk: "high",
      summary: "Custom JWT access and refresh sessions, rotation, and revocation exist; a predictable fallback secret is used if JWT_SECRET is absent.",
      details: "Fallback secrets make token forgery possible in a misconfigured deployment. Session revocation and cookie flags were inspected statically but not tested.",
      evidence: [
        { file: "src/lib/auth.ts:22", note: "JWT secret resolution." },
        { file: "src/lib/auth.ts:28", note: "Fallback secret string." },
        { file: "src/proxy.ts", note: "Route protection and guest handling." }
      ]
    },
    {
      id: "usage",
      name: "Usage metering and limits",
      category: "Data & Ops",
      status: "partial",
      runtime: "Not executed",
      risk: "medium",
      summary: "Daily usage and rate-limit collections are written through dedicated helpers; lock contention and fail-open behavior remain.",
      details: "Usage counters feed plan enforcement but can allow work when the database is unavailable. No live concurrency test was performed.",
      evidence: [
        { file: "src/lib/entitlements.ts", note: "Daily counters and fail-open path." },
        { file: "src/app/api/chat/route.ts:363", note: "Daily limit check in chat." }
      ]
    },
    {
      id: "admin",
      name: "Admin diagnostics",
      category: "Data & Ops",
      status: "implemented",
      runtime: "Not executed",
      risk: "low",
      summary: "Diagnostic and metrics surfaces exist; diagnosis is gated to admins.",
      details: "The diagnose route returns 403 without an admin session. Metrics authentication depends on whether METRICS_API_KEY is configured.",
      evidence: [
        { file: "src/app/api/diagnose/route.ts", note: "Admin-gated diagnostics." },
        { file: "src/app/api/metrics/route.ts", note: "Optional key check." }
      ]
    },
    {
      id: "health",
      name: "Health and configuration exposure",
      category: "Data & Ops",
      status: "partial",
      runtime: "Not executed",
      risk: "low",
      summary: "A public health endpoint reports which providers and environment variables are configured.",
      details: "It does not return secret values, but it does reduce attacker uncertainty about the deployment. The metrics endpoint is open when its key is unset.",
      evidence: [
        { file: "src/app/api/health/route.ts", note: "Configuration presence report." },
        { file: "src/app/api/metrics/route.ts", note: "Conditional authentication." }
      ]
    },
    {
      id: "companion",
      name: "Local companion",
      category: "Automation",
      status: "blocked",
      runtime: "Not executed",
      risk: "medium",
      summary: "A Node companion process supports local actions and project generation. It was not launched during this audit.",
      details: "Port binding, authentication between app and companion, and command allowlisting remain unverified.",
      evidence: [
        { file: "companion/likeway-companion.js", note: "Companion entry point." },
        { file: "package.json", note: "companion npm script." }
      ]
    },
    {
      id: "cross-device",
      name: "Cross-device real-time sync",
      category: "Data & Ops",
      status: "missing",
      runtime: "Not executed",
      risk: "low",
      summary: "No shared real-time channel was found for synchronizing sessions or state across tabs or devices.",
      details: "Most interactivity is request/response or per-request SSE. Any “real-time sync” claim would require a new transport and state model.",
      evidence: [
        { file: "src", note: "No cross-instance pub/sub or presence layer found." }
      ]
    }
  ],

  findings: [
    {
      id: "SEC-01",
      sev: "critical",
      area: "Secrets",
      title: "Live-format provider key committed in the repository",
      impact: "Anyone with repository access can consume the key's quota or trigger revocation. The same provider also has a hardcoded fallback key, so removing only the env example is insufficient.",
      evidence: ".env.example near line 63 contains a Pollinations key (value withheld). src/config/keys.ts:27 contains a hardcoded Pollinations fallback.",
      recommendation: "Revoke and rotate the key immediately. Remove it from the example file and history, delete the code fallback, and require an environment variable. Add a secret scanner to CI.",
      confidence: "High that a key-shaped value is present; validity not tested.",
      tags: ["secret", "supply-chain", "P0"]
    },
    {
      id: "SEC-02",
      sev: "high",
      area: "Authorization",
      title: "Unauthenticated AI gateway with client-controlled identity",
      impact: "The endpoint can invoke the model orchestrator without a session, using an x-user-id header or body userId. This enables cost abuse and identity impersonation across downstream tools.",
      evidence: "src/app/api/gateway/route.ts:9 sets wildcard CORS; lines 11 and 24 read x-user-id/userId with an anonymous default; no session verification is performed.",
      recommendation: "Require an authenticated session or a signed internal secret. Never accept caller identity from headers or body. Restrict CORS to known origins.",
      confidence: "High.",
      tags: ["unauthenticated", "cost", "P0"]
    },
    {
      id: "SEC-03",
      sev: "high",
      area: "Authorization",
      title: "Unauthenticated RAG ingestion",
      impact: "Arbitrary callers can write documents into the retrieval store, poisoning answers, consuming embedding quota, and inflating storage.",
      evidence: "src/app/api/ingest/route.ts accepts document ingestion without a verified session, ownership check, or visible rate limit.",
      recommendation: "Authenticate, scope documents to a user or workspace, enforce size and rate limits, and validate content types.",
      confidence: "High.",
      tags: ["unauthenticated", "data-poisoning", "P0"]
    },
    {
      id: "SEC-04",
      sev: "high",
      area: "Authorization",
      title: "Automation job data and control exposed",
      impact: "Job listings, results, and the SSE stream can be read without authentication; a collection-level DELETE handler accepts no request and therefore cannot check ownership. Wildcard CORS widens browser access.",
      evidence: "src/app/api/automation/route.ts:311 DELETE() has no request parameter; jobs/[id] and jobs/[id]/stream perform no verified ownership check; route line 12 sets wildcard CORS. src/app/api/automation/route.ts:177 trusts x-user-id as a fallback.",
      recommendation: "Authenticate every job route, enforce per-user ownership on read and cancel, derive identity only from a verified token, and replace wildcard CORS with an allowlist.",
      confidence: "High.",
      tags: ["unauthenticated", "IDOR", "P0"]
    },
    {
      id: "SEC-05",
      sev: "high",
      area: "Isolation",
      title: "Executable preview runs on the application origin",
      impact: "Generated HTML is served same-origin and the iframe enables allow-same-origin plus allow-scripts. Script in a preview can act with the app's origin privileges, including authenticated fetches. Frame restrictions also permit broad embedding.",
      evidence: "src/app/api/preview/render/[id]/route.ts serves executable HTML and sets frame-ancestors 'self' *; src/components/LivePreviewWorkspace.tsx:607 uses sandbox allow-scripts allow-forms allow-same-origin allow-modals; vercel.json repeats the permissive frame policy.",
      recommendation: "Serve previews from a separate origin or sandbox without allow-same-origin, remove wildcard frame-ancestors, authenticate preview sessions, and add a strict CSP.",
      confidence: "High.",
      tags: ["sandbox", "XSS", "P0"]
    },
    {
      id: "SEC-06",
      sev: "high",
      area: "Payments",
      title: "Plan upgrade is not bound to the paid order when the reference is missing",
      impact: "After a valid Razorpay signature, the client supplies planId. If no payment reference is found, the ownership and plan comparison is skipped, allowing a cheaper order to confirm a more expensive plan.",
      evidence: "src/app/api/subscription/confirm/route.ts:147-162 only validates ref when getPaymentRef(orderId) returns a record; then it persists the client-provided planId.",
      recommendation: "Derive the plan and amount from the Razorpay order/notes or stored reference, require the reference to exist, and reject mismatches unconditionally.",
      confidence: "High from code path; exploitability depends on reference creation reliability.",
      tags: ["payments", "business-logic", "P0"]
    },
    {
      id: "SEC-07",
      sev: "medium",
      area: "Payments",
      title: "Webhook refuses all events when its secret is unset",
      impact: "Subscription cancellation and expiry cannot be applied, and a paid user may remain on Core if the client-side confirmation path fails. Revenue and entitlement state can drift.",
      evidence: "src/app/api/webhook/razorpay/route.ts:23 returns HTTP 503 when RAZORPAY_WEBHOOK_SECRET is absent; plan updates live at lines 76-98.",
      recommendation: "Configure and verify the webhook secret in every environment, add reconciliation for paid orders, and alert on 503s.",
      confidence: "High.",
      tags: ["payments", "reliability"]
    },
    {
      id: "SEC-08",
      sev: "medium",
      area: "Authentication",
      title: "Predictable JWT fallback secret",
      impact: "A deployment that forgets JWT_SECRET signs and verifies tokens with a known constant, enabling forged sessions.",
      evidence: "src/lib/auth.ts:22-28 falls back to the literal string 'missing-jwt-secret-set-it-in-env-vars'.",
      recommendation: "Fail startup or all auth operations when JWT_SECRET is missing. Never fall back to a static secret.",
      confidence: "High.",
      tags: ["auth", "misconfiguration"]
    },
    {
      id: "SEC-09",
      sev: "medium",
      area: "Authorization",
      title: "Entitlement checks fail open",
      impact: "During database errors, expensive actions can bypass plan limits, creating unbounded cost and undermining paid tiers.",
      evidence: "src/lib/entitlements.ts returns an allowed result on storage failure (fail-open path around lines 265-269).",
      recommendation: "Fail closed for costly features, use a short-lived cache for known entitlements, and emit an alert on storage failure.",
      confidence: "High.",
      tags: ["business-logic", "availability"]
    },
    {
      id: "SEC-10",
      sev: "medium",
      area: "Authorization",
      title: "Client-supplied user identity trusted in several routes",
      impact: "Callers can act as another user or a synthetic identity where x-user-id is accepted as a fallback. This affects integration state and automation attribution at minimum.",
      evidence: "src/app/api/integrations/route.ts:20; src/app/api/automation/route.ts:177; src/app/api/gateway/route.ts:24. browser-agent also references x-user-id but does verify a session or shared secret.",
      recommendation: "Remove all x-user-id trust. Use verified tokens or a signed internal service credential, with explicit service-to-service auth.",
      confidence: "High.",
      tags: ["identity", "IDOR"]
    },
    {
      id: "SEC-11",
      sev: "medium",
      area: "Data handling",
      title: "Integration credentials and connections are process-local",
      impact: "Credentials are lost on restart, connections differ across instances, and secrets are held in plain process memory without durable encryption or TTL.",
      evidence: "src/lib/integrations/credentials-store.ts uses global._userCredentialsStore; src/lib/integrations/integration-registry.ts uses global maps for connected apps and approvals.",
      recommendation: "Persist encrypted credentials in a durable store with per-user scoping and rotation, move connection state to the database or Redis, and add TTLs.",
      confidence: "High.",
      tags: ["state", "secrets", "reliability"]
    },
    {
      id: "SEC-12",
      sev: "low",
      area: "Disclosure",
      title: "Public health endpoint reports configuration presence",
      impact: "Attackers learn which providers and environment variables are configured, reducing uncertainty for targeted abuse.",
      evidence: "src/app/api/health/route.ts reports provider/key presence without authentication.",
      recommendation: "Return a minimal liveness response publicly and move configuration detail behind admin authentication.",
      confidence: "High.",
      tags: ["disclosure"]
    },
    {
      id: "SEC-13",
      sev: "low",
      area: "Authorization",
      title: "Metrics authentication is optional",
      impact: "If METRICS_API_KEY is not set, the metrics endpoint is reachable without a key, exposing operational data.",
      evidence: "src/app/api/metrics/route.ts only checks authorization when the key is configured.",
      recommendation: "Require authentication unconditionally or disable the route when no key is present.",
      confidence: "High.",
      tags: ["misconfiguration"]
    },
    {
      id: "SEC-14",
      sev: "low",
      area: "Browser security",
      title: "Wildcard CORS on AI and browser-related endpoints",
      impact: "Any origin can call these endpoints from a browser context, compounding the unauthenticated surfaces and enabling cross-origin abuse.",
      evidence: "Wildcard CORS appears in src/app/api/gateway/route.ts:9, src/app/api/automation/route.ts:12, and src/app/api/browser-agent/route.ts:15. browser-agent does authenticate, which limits but does not eliminate the exposure.",
      recommendation: "Use an origin allowlist, handle preflight explicitly, and avoid credentialed wildcard responses.",
      confidence: "High.",
      tags: ["cors"]
    },
    {
      id: "SEC-15",
      sev: "info",
      area: "Hygiene",
      title: "Duplicate project copies inflate static analysis",
      impact: "Lint and secret scans cover stale duplicated trees, producing noisy results and increasing the chance that a real issue is missed or an old secret survives.",
      evidence: ".kilo/worktrees/enormous-slipper and likewayai-production-fixed contain full or partial copies. npx eslint . scans them in addition to src.",
      recommendation: "Remove duplicated trees or add explicit ignores, scan history for secrets, and keep a single source of truth.",
      confidence: "High.",
      tags: ["hygiene", "ci"]
    }
  ],

  realtime: [
    {
      name: "Chat responses",
      transport: "SSE",
      status: "partial",
      detail: "Native providers stream upstream tokens. The free worker path returns a full answer and replays it on a timer, so the UI cannot distinguish simulated from native streaming.",
      proof: "Not executed"
    },
    {
      name: "Deep research",
      transport: "SSE",
      status: "implemented",
      detail: "Phase events report planning, search, reading, and synthesis. This is a genuine progressive pipeline; output quality depends on providers.",
      proof: "Not executed"
    },
    {
      name: "Automation job updates",
      transport: "SSE + EventEmitter",
      status: "partial",
      detail: "The queue emits in-process events and polls the database. The stream endpoint is unauthenticated and CORS is open.",
      proof: "Not executed"
    },
    {
      name: "Browser frames",
      transport: "WebSocket",
      status: "blocked",
      detail: "A frame server on port 10001 starts only on Render. The intended client component is unused, and no Next.js proxy was confirmed.",
      proof: "Not executed"
    },
    {
      name: "Live preview",
      transport: "iframe + postMessage",
      status: "partial",
      detail: "Preview sessions are created server-side and rendered in an iframe. There is no verified live log or console stream; isolation is weak.",
      proof: "Not executed"
    },
    {
      name: "Voice input",
      transport: "Browser speech APIs",
      status: "partial",
      detail: "Client-side speech recognition feeds a REST turn endpoint. This is not a continuous bidirectional audio channel.",
      proof: "Not executed"
    },
    {
      name: "Speech output",
      transport: "Chunked HTTP audio",
      status: "partial",
      detail: "Gemini TTS returns base64 audio; the client falls back to browser speech when configuration is missing. No low-latency audio streaming was found.",
      proof: "Not executed"
    },
    {
      name: "Payment updates",
      transport: "Webhook + polling",
      status: "partial",
      detail: "Webhooks update subscriptions when configured; the success page polls the session every 1.5 seconds as a fallback. Webhook 503 behavior is a risk.",
      proof: "Not executed"
    },
    {
      name: "Cross-device sync",
      transport: "None found",
      status: "missing",
      detail: "No pub/sub, presence, or shared session channel was found for synchronizing state across tabs, devices, or instances.",
      proof: "Not executed"
    }
  ],

  collections: [
    { name: "users", purpose: "Accounts, plan, role, subscription state" },
    { name: "usage", purpose: "Per-request usage and token records" },
    { name: "daily_usage", purpose: "Daily counters for plan limits" },
    { name: "rate_limits", purpose: "Rate-limit windows and counters" },
    { name: "session_blacklist", purpose: "Revoked session identifiers" },
    { name: "payment_refs", purpose: "Order-to-user/plan binding for payments" },
    { name: "automation_jobs", purpose: "Job queue, status, results" },
    { name: "projects", purpose: "Project containers" },
    { name: "project_files", purpose: "Project file contents and metadata" },
    { name: "project_tasks", purpose: "Project task state" },
    { name: "project_conversations", purpose: "Project-scoped chat history" },
    { name: "project_memory", purpose: "Long-term project context" },
    { name: "chatmemories", purpose: "Chat-scoped memory entries" },
    { name: "personas", purpose: "Custom persona definitions" },
    { name: "rag_documents", purpose: "Chunks and embeddings for retrieval" }
  ],

  externals: [
    { group: "Model providers", items: ["OpenRouter", "Groq", "Mistral", "Free worker proxy", "TokenHarbor", "LLM7", "Pollinations", "Google Gemini"] },
    { group: "Search and retrieval", items: ["Tavily", "Brave Search", "Firecrawl", "Jina Reader", "DuckDuckGo", "SearXNG"] },
    { group: "Media", items: ["Pollinations images", "Gemini TTS", "ComfyUI (local)", "Browser speech APIs"] },
    { group: "Commerce and identity", items: ["Razorpay", "Stripe", "Google OAuth"] },
    { group: "Platform", items: ["MongoDB Atlas", "Vercel", "Render", "Playwright Chromium", "Local companion"] }
  ],

  architecture: [
    {
      layer: "Client",
      note: "Next.js App Router · React 19",
      nodes: [
        { id: "chat-ui", label: "Chat UI", kind: "normal", detail: "A single 4,744-line page component hosts chat, tools, previews, voice, and the automation workspace. State and rendering are tightly coupled.", files: ["src/app/page.tsx", "src/hooks/useSSEChatStream.ts"] },
        { id: "preview-ui", label: "Preview workspace", kind: "risk", detail: "Renders generated HTML in an iframe with same-origin scripting enabled, weakening sandbox isolation.", files: ["src/components/LivePreviewWorkspace.tsx:607"] },
        { id: "browser-ui", label: "Browser viewport (mock)", kind: "risk", detail: "A scripted animation presents fake browser steps and an iframe rather than live Playwright frames.", files: ["src/components/VisibleBrowserWorkspace.tsx", "src/app/page.tsx:4728"] },
        { id: "voice-ui", label: "Voice assistant", kind: "normal", detail: "Captures speech in the browser and plays returned audio through REST endpoints.", files: ["src/components/VoiceAssistant.tsx"] },
        { id: "pricing-ui", label: "Pricing and success", kind: "normal", detail: "Client checkout orchestration and post-payment confirmation/polling.", files: ["src/app/pricing/page.tsx", "src/app/success/page.tsx"] }
      ]
    },
    {
      layer: "Edge and API",
      note: "Proxy · 83 HTTP handlers",
      nodes: [
        { id: "proxy", label: "Auth proxy", kind: "normal", detail: "Route protection and guest handling before handlers execute. Token verification is custom JWT logic.", files: ["src/proxy.ts", "src/lib/auth.ts"] },
        { id: "gateway", label: "AI gateway (open)", kind: "risk", detail: "Invokes the orchestrator without a session and trusts caller-supplied identity.", files: ["src/app/api/gateway/route.ts"] },
        { id: "ingest", label: "RAG ingest (open)", kind: "risk", detail: "Accepts documents without authentication, rate limits, or ownership scoping.", files: ["src/app/api/ingest/route.ts"] },
        { id: "automation-api", label: "Automation job API", kind: "risk", detail: "Job creation requires optional identity; reads, streams, and cancellation lack verified ownership.", files: ["src/app/api/automation/route.ts", "src/app/api/automation/jobs/[id]/route.ts"] },
        { id: "payments-api", label: "Payment endpoints", kind: "normal", detail: "Order creation, signature verification, subscription confirmation, and webhooks.", files: ["src/app/api/create-order/route.ts", "src/app/api/subscription/confirm/route.ts"] }
      ]
    },
    {
      layer: "Domain services",
      note: "Business logic in src/lib",
      nodes: [
        { id: "orchestrator", label: "AI orchestrator", kind: "normal", detail: "Selects providers, assembles tools and context, and coordinates generation.", files: ["src/lib/ai-orchestrator.ts", "src/lib/api-manager.ts"] },
        { id: "entitlements", label: "Entitlements", kind: "risk", detail: "Plan limits and usage counters; fails open on storage errors.", files: ["src/lib/entitlements.ts", "src/lib/plans.ts"] },
        { id: "research", label: "Deep research", kind: "normal", detail: "Real multi-phase research pipeline with progressive events.", files: ["src/lib/deep-research.ts"] },
        { id: "automation-core", label: "Playwright engine", kind: "normal", detail: "Real browser pool, worker, task engine, and screenshots.", files: ["src/lib/automation/browser-engine.ts", "src/lib/automation/job-queue.ts"] },
        { id: "preview-core", label: "Preview manager", kind: "risk", detail: "Builds executable HTML bundles and stores sessions in memory.", files: ["src/lib/preview/preview-manager.ts"] },
        { id: "integrations-core", label: "Integration registry", kind: "risk", detail: "Five manifests, tool dispatch, approvals; connection and credential state is process-local.", files: ["src/lib/integrations/integration-registry.ts", "src/lib/integrations/credentials-store.ts"] },
        { id: "rag-core", label: "RAG pipeline", kind: "normal", detail: "Chunking, embeddings, and retrieval over rag_documents.", files: ["src/lib/rag.ts"] }
      ]
    },
    {
      layer: "State",
      note: "MongoDB plus process-local memory",
      nodes: [
        { id: "mongo", label: "MongoDB Atlas", kind: "normal", detail: "Primary persistence: accounts, projects, usage, payments, jobs, documents, memories.", files: ["src/lib/mongodb.ts"] },
        { id: "fallback-store", label: "Fallback store", kind: "risk", detail: "A global in-memory store is used when the database is unavailable, splitting state and losing durability.", files: ["src/lib/mongodb.ts"] },
        { id: "global-maps", label: "In-memory globals", kind: "risk", detail: "Credentials, connected apps, approvals, and preview sessions live in global maps that vanish on restart and diverge across instances.", files: ["src/lib/integrations/credentials-store.ts", "src/lib/integrations/integration-registry.ts", "src/lib/preview/preview-manager.ts"] }
      ]
    },
    {
      layer: "External",
      note: "Credentials not validated",
      nodes: [
        { id: "model-apis", label: "Model APIs", kind: "normal", detail: "OpenRouter, Groq, Mistral, free worker proxy, TokenHarbor, LLM7, Pollinations, Gemini.", files: ["src/lib/api-manager.ts", "src/lib/models.ts"] },
        { id: "search-apis", label: "Search APIs", kind: "normal", detail: "Tavily, Brave, Firecrawl, Jina, DuckDuckGo, SearXNG.", files: ["src/lib/browsing.ts"] },
        { id: "commerce-apis", label: "Razorpay and Stripe", kind: "normal", detail: "Order/payment flows and webhook lifecycle events.", files: ["src/app/api/create-order/route.ts", "src/app/api/webhook/razorpay/route.ts"] },
        { id: "render", label: "Render browser host", kind: "normal", detail: "Hosts Playwright and the WebSocket frame server; Vercel proxies automation calls here.", files: ["src/lib/startup.ts", "src/lib/automation/browser-ws-server.ts"] },
        { id: "companion", label: "Local companion", kind: "normal", detail: "Desktop actions and local project generation. Cloud hosts refuse these operations.", files: ["companion/likeway-companion.js"] }
      ]
    }
  ],

  flows: {
    payment: [
      { title: "Pricing page starts checkout", body: "The client requests a server-priced order. The server maps the plan to an amount; the client does not set the price.", ref: "src/app/api/create-order/route.ts" },
      { title: "Payment reference is recorded", body: "The order is linked to a user and plan. The confirmation route later uses this reference to bind the upgrade.", ref: "src/lib/payments-store.ts", risk: "If this record is missing, the confirmation check is skipped." },
      { title: "Razorpay Checkout collects payment", body: "The browser receives a payment ID and signature from the gateway.", ref: "src/app/pricing/page.tsx" },
      { title: "Signature verification", body: "verify-payment recomputes the HMAC and returns success. It does not grant a plan or change the user record.", ref: "src/app/api/verify-payment/route.ts:28-48" },
      { title: "Plan confirmation", body: "subscription/confirm verifies both signature forms, checks the payment reference if present, persists the plan, and rotates session cookies.", ref: "src/app/api/subscription/confirm/route.ts:127-184", risk: "Client planId is trusted when no reference exists." },
      { title: "Webhook lifecycle", body: "Captured, cancelled, and expired events update subscription state when the webhook secret is configured.", ref: "src/app/api/webhook/razorpay/route.ts:23-98", risk: "Returns 503 without the secret." },
      { title: "Client reconciliation", body: "The success page polls the session to reflect the upgraded plan; the pricing page polls the payment status with a timeout.", ref: "src/app/success/page.tsx" }
    ],
    automation: [
      { title: "User submits an automation task", body: "The chat UI posts a prompt to the automation API. A session token is used if present; otherwise an x-user-id header can supply identity.", ref: "src/app/api/automation/route.ts:170-177", risk: "Identity fallback." },
      { title: "Job is queued", body: "A job record is created and the in-process queue/worker picks it up through events and database polling.", ref: "src/lib/automation/job-queue.ts" },
      { title: "Vercel proxies to Render", body: "On Vercel, automation requests are forwarded to the Render browser host with service credentials and an execution mode.", ref: "src/lib/automation/engine.ts" },
      { title: "Playwright executes", body: "Chromium performs navigation and actions, captures screenshots, and records results in the job.", ref: "src/lib/automation/browser-engine.ts" },
      { title: "Progress is read", body: "The client polls job status or opens an SSE stream. Neither route verifies that the caller owns the job.", ref: "src/app/api/automation/jobs/[id]/stream/route.ts", risk: "Unauthenticated read." },
      { title: "Frames could stream over WebSocket", body: "A frame server listens on Render at port 10001. No active Next.js proxy or UI consumer was confirmed.", ref: "src/lib/automation/browser-ws-server.ts", risk: "Blocked/not wired." },
      { title: "The viewport is simulated", body: "VisibleBrowserWorkspace animates fabricated steps and embeds the target site in an iframe. It does not display Playwright frames.", ref: "src/components/VisibleBrowserWorkspace.tsx", risk: "Integrity gap." }
    ]
  },

  checks: [
    { state: "pass", title: "TypeScript", text: "npx tsc --noEmit completed with no diagnostics." },
    { state: "fail", title: "ESLint (src)", text: "14 errors and 679 warnings, including conditional hooks and prefer-const issues." },
    { state: "blocked", title: "Build", text: "Production build was not run; it needs environment variables and can trigger network-dependent setup." },
    { state: "blocked", title: "Runtime", text: "No credentials, database, payment sandbox, Render worker, or browser session was used." }
  ],

  terminal: [
    { cls: "cmd", text: "$ npx tsc --noEmit" },
    { cls: "dim", text: "(no output)" },
    { cls: "ok", text: "PASS — no TypeScript diagnostics" },
    { cls: "", text: "" },
    { cls: "cmd", text: "$ npx eslint src" },
    { cls: "bad", text: "FAIL — 693 problems (14 errors, 679 warnings)" },
    { cls: "dim", text: "Notable: react-hooks/rules-of-hooks (conditional hooks), prefer-const, no-explicit-any" },
    { cls: "", text: "" },
    { cls: "cmd", text: "$ npx eslint ." },
    { cls: "bad", text: "FAIL — 1,978 problems (20 errors, 1,958 warnings)" },
    { cls: "dim", text: "Inflated by duplicate trees: .kilo/worktrees/... and likewayai-production-fixed/..." },
    { cls: "", text: "" },
    { cls: "cmd", text: "$ npm run build" },
    { cls: "dim", text: "NOT RUN — would require environment configuration and network access" },
    { cls: "dim", text: "Runtime smoke tests: BLOCKED — no live credentials or services" }
  ],

  runtimePlan: [
    "Provision a dedicated test environment file with non-production provider keys and a test MongoDB database.",
    "Run the production build and start the app; capture server logs for startup, provider routing, and database fallback behavior.",
    "Use Razorpay test mode with a tunneled webhook secret; verify order creation, signature checks, plan binding, cancellation, and expiry.",
    "Deploy or emulate the Render browser host, then run one automation job and confirm queue, SSE progress, screenshots, and WebSocket frame delivery.",
    "Test chat streaming with a native provider and the worker path; verify abort behavior, entitlements, and simulated versus native streaming.",
    "Exercise preview creation from a second account and attempt cross-session access, framing, and same-origin script behavior in an isolated browser profile.",
    "Run authenticated Playwright E2E coverage for login, plan limits, image generation, voice fallback, and the payment success path."
  ],

  roadmap: [
    {
      priority: "P0",
      title: "Contain exposure",
      caption: "Before any production reliance",
      items: [
        { title: "Revoke and rotate the committed provider key", text: "Remove it from .env.example and the code fallback, purge history, and add CI secret scanning." },
        { title: "Authenticate the open endpoints", text: "Gateway, ingest, automation job reads, job stream, cancel, and preview sessions need verified identity and ownership." },
        { title: "Isolate executable previews", text: "Serve from a separate origin or remove allow-same-origin; tighten frame-ancestors and add a strict CSP." },
        { title: "Bind upgrades to paid orders", text: "Require a stored payment reference and derive plan/amount server-side; never trust client planId." },
        { title: "Fail closed on auth secrets", text: "Remove the JWT fallback and refuse startup when required secrets are absent." }
      ]
    },
    {
      priority: "P1",
      title: "Restore integrity",
      caption: "Align product claims with implementation",
      items: [
        { title: "Wire or remove the browser viewport", text: "Connect real Playwright frames through an authenticated proxy, or clearly label the viewport as a simulation." },
        { title: "Replace fictional model branding", text: "Use real upstream identifiers or transparent aliases, and stop rewriting model identity." },
        { title: "Unify streaming semantics", text: "Either stream natively for every provider or label replayed responses as progressive delivery." },
        { title: "Persist integration state", text: "Move credentials and connections to an encrypted durable store with per-user scoping and rotation." },
        { title: "Configure payment lifecycle", text: "Set and verify webhook secrets, add reconciliation, and alert on entitlement drift." }
      ]
    },
    {
      priority: "P2",
      title: "Harden operations",
      caption: "Reliability and quality",
      items: [
        { title: "Remove duplicate project copies", text: "Delete or ignore stale trees, then re-baseline lint and secret scans." },
        { title: "Fix lint errors and hook violations", text: "Resolve conditional hooks and prefer-const errors before adding features." },
        { title: "Add runtime and E2E coverage", text: "Exercise chat, payments, automation, preview isolation, and plan limits with test credentials." },
        { title: "Add cross-instance state", text: "Use Redis or a database-backed queue and presence layer for Render and multi-instance deployments." },
        { title: "Reduce disclosure", text: "Minimize public health output and require metrics authentication unconditionally." }
      ]
    }
  ]
};
