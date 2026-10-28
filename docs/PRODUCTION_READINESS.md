# Likeway AI — Production Readiness

**Verdict: not yet production-ready for paying users.** Significant security
defects are fixed and verified; several honesty and reliability gaps remain, and
one credential rotation is outstanding and cannot be done from the codebase.

## What is fixed and tested

| Area | Evidence |
|---|---|
| Identity cannot be forged by a client | 35 HTTP tests assert `x-user-id` and body `userId` do not authenticate; all job/integration/preview/file routes return 401 anonymously |
| Resource ownership | Job read/cancel/stream, preview sessions, files, integration approvals — owner-scoped, non-owners get 404 |
| SSRF | 7 HTTP cases + 5 unit groups; including IPv4-mapped IPv6 (`::ffff:127.0.0.1`), found by the tests |
| Command injection | 10 payloads rejected at the validation boundary and before process spawn |
| Payment activation | Forged signature rejected; missing/foreign server reference fails closed; replay returns `already_confirmed`; webhook events claimed idempotently |
| Preview isolation | Owner-scoped, restrictive CSP, no wildcard CORS, path traversal blocked |
| Production database | Startup throws without `MONGODB_URI`; no silent memory store |
| Metering | Fails **closed** on infrastructure error |
| Secret exposure in tracked files | Zero credential literals in tracked non-doc files; CI gate added |
| Build | `tsc --noEmit` clean; `next build --webpack` succeeded |

Commands used (final tree, after the job-queue lease and model-label changes):

```
npx tsc --noEmit                                        → 0 errors
npm test                                                → 12/12 pass
npx next build --webpack                                → success
npx playwright test e2e/security-regressions.spec.ts    → 35/35 pass
GET /api/health                                         → 200
```

## What is fixed but not fully verified

These changes are in place and compile, but need a live database, provider
credential, or external account to prove end to end:

- Razorpay/Stripe happy-path checkout (tested only in rejection paths).
- Webhook idempotency under real retries (logic reviewed; no live delivery).
- Entitlement metering on the success path (needs MongoDB).
- TTS primary provider — implemented, but the upstream returns 400.
- Qwen endpoint — added, model id unverified.
- Browser automation execution (needs Playwright Chromium on the runtime).

## What is still unsafe or dishonest — **must be resolved before charging users**

### 1. Rotate the Razorpay key pair
The live key id and secret were committed for 134 commits. Removing them from
the working tree does **not** revoke them. Do this first; then purge history per
the runbook.

### 2. Default chat does not truly stream
The free/worker path calls the provider with `stream: false` and then replays
the finished text in ~25-character chunks with a 12 ms delay. The UI presents
this as live streaming. Real SSE passthrough exists for
OpenRouter/Groq/Mistral only. Either stream natively or label the provider as
non-streaming.

### 3. Model catalog labels (partially resolved)
`gpt-6-astra`, `claude-opus-5.5`, `claude-sonnet-5`, `claude-fable-5(.1)`,
`sol`, `terra`, `glm-5.2`, `kimi-k3` are proxy aliases. The false per-response
attribution rewriting was removed, and `company` is now `Likeway AI` for every
one of them, so no vendor name is rendered next to a model we do not request
from that vendor. What remains is a naming decision: the display names still
mirror the proxy's ids — see item 7.

### 4. CSRF is not enforced
`csrfProtection` exists but is never called, and `/api/*` is excluded from the
middleware matcher. Cookie-authenticated state changes rely on `SameSite=Lax`.
That blocks cross-site POSTs from forms but is not a complete CSRF strategy for
a same-site subdomain attack. Wire the middleware into the API routes or move to
strict origin checking.

### 5. Promises made to paying users vs. enforced limits
The pricing page advertises quantities that differ from `PLAN_LIMITS`. Pick one
source of truth and render the pricing copy from it.

### 6. Browser automation durability — fixed, not yet proven under two workers
`claimNextJob` now claims only from the database when MongoDB is configured,
using a conditional `findOneAndUpdate` with a two-minute lease; jobs whose
lease lapses are requeued, and every step refreshes the lease. Inserts are
awaited before the `job:created` event fires. A single worker path is covered
by types and the build, but no test runs two workers against one database, so
treat cross-instance uniqueness as designed rather than demonstrated.

### 7. Model display names still mirror the proxy's ids
The `company` field is now `Likeway AI` for every proxy alias, so the UI can no
longer attribute them to OpenAI or Anthropic. The display names themselves
(`Claude Opus 5.5`, `GPT 6 Astra`) still read as vendor products. Rename them
to Likeway-branded names, or keep them as aliases with an explicit "hosted by
Likeway" note.

## Not started

- Refactoring `page.tsx` and `chat/route.ts` into modules.
- Sandboxed execution for generated server-side code (containers).
- Tracing/monitoring backend and alerting.
- Automated backup verification and a tested restore.
- OAuth flows beyond GitHub.
- Scheduled workflows.

## Honest capability statement for users

Until items 2–3 are resolved, the product should not claim "real-time streaming"
or name third-party vendors for models it hosts under aliases.

## Decisions needed from you

1. **Model naming** — rename the proxy aliases to Likeway-branded names, or
   keep the current display names with a "hosted by Likeway" note?
2. **Streaming** — invest in native streaming for the worker path, or label it?
3. **CSRF** — enforce tokens on all cookie-authenticated writes (requires a
   client change shipped together), or keep `SameSite=Lax` plus an origin check?
4. **Ads** — supply the HilltopAds script URL and set `NEXT_PUBLIC_ADS_ENABLED=true`.
5. **TTS** — the upstream `speech.ai.unturf.com` rejects speech requests; is
   there another endpoint/auth we should use?
