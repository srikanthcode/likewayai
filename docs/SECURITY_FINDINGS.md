# Likeway AI — Verified Security Findings

> Every finding below was reproduced against the working tree, not copied from
> an earlier audit. Secret **values are never printed** in this document.

Legend: **FIXED** = changed and covered by a test · **PARTIAL** = code changed,
needs an external action or a credential · **OPEN** = not yet addressed.

---

## CRITICAL

### C1 — Live Razorpay credentials are committed to the repository

| | |
|---|---|
| Where | `PRODUCTION_ENV.txt`, `DEPLOY.md` |
| Impact | Anyone with repository access can issue/refund payments with the live merchant account. |
| Status | **PARTIAL** |

What was done:

- `PRODUCTION_ENV.txt` untracked (`git rm --cached`) — the local file is kept,
  it is no longer in the index.
- `DEPLOY.md` rewritten: three occurrences of the live key id and secret
  replaced with `<YOUR_RAZORPAY_LIVE_KEY_ID>` / `<YOUR_RAZORPAY_LIVE_KEY_SECRET>`.
- `.gitignore` already ignores `.env*`; `PRODUCTION_ENV.txt` is now covered by
  the new secret-scanning CI job.

**Still required (cannot be done from this codebase):**

1. **Rotate the key pair in the Razorpay dashboard now.** A redacted working
   tree does not invalidate a key that has been in git for 134 commits.
2. Purge history (see `docs/OPERATIONS_RUNBOOK.md → Secret remediation`).
   Purging is irreversible and must be coordinated with every clone.

### C2 — Shell injection in Computer Control

| | |
|---|---|
| Where | `src/lib/system/computer-control.ts` |
| Cause | The requested app name was interpolated into a PowerShell command string (`Get-StartApps ... -like "*${searchPattern}*"`) and executed with `exec({ shell })`. |
| Impact | A prompt like `open notepad"; calc; "` executed attacker-chosen PowerShell on the host running the companion. |
| Status | **FIXED** |

Fix: `execFile` with argument arrays; the search term is passed through an
environment variable so the script text is constant; app names must match
`^[A-Za-z0-9 ._+\-]{1,40}$`; app ids and URLs are validated before launch;
web fallbacks are restricted to http/https.

Tests: `tests/security.test.mjs` — 10 injection payloads rejected, legitimate
names accepted, unsafe names refused before any process spawn.

### C3 — Payment activation accepted forged/foreign orders

| | |
|---|---|
| Where | `src/app/api/subscription/confirm/route.ts` |
| Cause | Signature verification accepted *either* `HMAC(order|payment)` or the reversed `HMAC(payment|order)`; the order→user/plan check was skipped entirely when no server reference existed; no replay guard. |
| Impact | A signed payment for a different order, or a replayed signature, could grant a paid plan. |
| Status | **FIXED** |

Fix: exactly one signature shape per resource type (order vs subscription);
a missing server-side payment reference now fails closed (403); owner, plan,
payment type and (for orders) amount are all re-checked server-side; an
already-applied reference returns `already_confirmed` instead of extending
access again.

### C4 — `verify-payment` was unauthenticated and accepted a fabricated digest

| | |
|---|---|
| Where | `src/app/api/verify-payment/route.ts` |
| Cause | No authentication; accepted the reversed HMAC direction; returned success without any state change. |
| Status | **FIXED** |

Fix: requires a verified session, the order must belong to the caller, and
only the canonical digest is accepted.

### C5 — Client-controlled identity (`x-user-id` / body `userId`)

| | |
|---|---|
| Where | `api/gateway`, `api/integrations*`, `api/automation*`, `api/ingest` |
| Impact | Any anonymous caller could act as any user, read another account's integrations and credentials, and consume AI spend with no quota. |
| Status | **FIXED** |

Fix: `src/lib/request-auth.ts` derives identity solely from the verified
access-token cookie. Server-to-server calls (Vercel → Render) must present
`INTERNAL_API_SECRET` (constant-time compare) and may assert a user id; that
path never grants admin. Guest mode no longer contributes identity to the API.

### C6 — Any user could read or cancel any automation job (IDOR)

| | |
|---|---|
| Where | `api/automation/jobs/[id]`, `.../[id]/stream`, `api/automation/jobs` |
| Impact | Job ids leak other users' tasks, screenshots and results; a stranger could cancel a running job. |
| Status | **FIXED** |

Fix: all job routes require authentication; reads, deletes and SSE streams are
gated by `canAccessResource(identity, job.userId)`; non-owners receive 404 (no
existence oracle); the `?userId=` list override is admin-only.

### C7 — Path traversal / arbitrary file write via preview sessions

| | |
|---|---|
| Where | `src/lib/preview/preview-manager.ts` |
| Cause | AI-supplied file names were joined with `path.join(dir, relPath)` and written without containment checks. |
| Impact | `../../src/app/...` could overwrite application source. |
| Status | **FIXED** |

Fix: every write resolves inside the session directory
(`resolveInsideSession`), escaping paths are dropped and logged; session ids
must belong to a user.

### C8 — Generated HTML executed on the application origin

| | |
|---|---|
| Where | `api/preview/render/[id]`, `next.config.ts`, `src/lib/preview/preview-manager.ts` |
| Cause | `frame-ancestors 'self' *`, wildcard CORS, no owner check, and a document that could be opened same-origin without a sandbox. |
| Impact | Stored XSS capable of reading authenticated responses. |
| Status | **FIXED (server side); PARTIAL (client hardening)** |

Fix: owner-scoped delivery; `frame-ancestors 'self'`; wildcard CORS removed
from the API surface; restrictive CSP (`connect-src 'none'`, `default-src
'none'` with an explicit script/style allowlist); session title escaped.

**Remaining hardening (documented, not silently skipped):** the iframe in
`LivePreviewWorkspace.tsx` should use `sandbox="allow-scripts allow-forms
allow-popups"` **without** `allow-same-origin`, which gives the document an
opaque origin. That change must be paired with an audit of the
`window.parent.postMessage` bridge, because an opaque origin cannot share
`localStorage` with the app.

### C9 — Production silently used an in-memory database

| | |
|---|---|
| Where | `src/lib/mongodb.ts` |
| Impact | Account, quota and payment state vanished on restart and differed per instance. |
| Status | **FIXED** |

Fix: production throws when `MONGODB_URI` is missing and surfaces connection
failures instead of swapping in a mock store. An explicit
`LIKEWAY_ALLOW_MEMORY_DB=1` escape hatch exists for throwaway environments.

### C10 — Wildcard CORS on authenticated APIs

| | |
|---|---|
| Where | `next.config.ts`, `api/automation*`, `api/browser-agent`, `api/gateway` |
| Impact | Any website could drive a signed-in user's automation session and read responses. |
| Status | **FIXED** |

Fix: the API surface no longer emits `Access-Control-Allow-Origin: *`; routes
that need cross-origin access build an allowlist from
`NEXT_PUBLIC_APP_URL` / `FRONTEND_URL` / `RENDER_EXTERNAL_URL`.

---

## HIGH

| # | Finding | Location | Status |
|---|---|---|---|
| H1 | Entitlement metering failed **open** on any DB error (free unlimited usage) | `src/lib/entitlements.ts` | **FIXED** — fails closed, returns a retryable denial |
| H2 | No ownership on preview sessions | `preview-manager.ts`, `api/preview/session` | **FIXED** |
| H3 | Session title injected unescaped into `<title>` | `preview-manager.ts` | **FIXED** |
| H4 | SSRF via prompt URLs, `agent-reach/extract`, integration `serverUrl` | `chat/route.ts`, `api/agent-reach/extract`, `api/integrations/verify` | **FIXED** — shared `ssrf-guard` (scheme, hostname, DNS, redirects, size, timeout) |
| H5 | Unauthenticated paid-LLM proxies (`preview/repair`, `learn/generate-questions`, `gateway`) | various | **FIXED** — auth + metering |
| H6 | File downloads readable by id without auth | `api/files/[id]` | **FIXED** |
| H7 | MongoDB field-path injection via `provider` in API-key storage; stored keys returned in clear | `api/user/api-keys` | **FIXED** — allowlist + masked read |
| H8 | Unauthenticated RAG ingestion into any project | `api/ingest`, `src/lib/rag.ts` | **FIXED** — auth, size cap, docs scoped to owner |
| H9 | Health endpoints disclosed which secrets are configured and validation errors | `api/health`, `api/system/health` | **FIXED** — public callers get a boolean status only |
| H10 | Metrics endpoint public when `METRICS_API_KEY` unset | `api/metrics` | **FIXED** — fails closed, constant-time bearer compare |
| H11 | Unauthenticated process spawning / host probing | `api/system/control` GET | **FIXED** |
| H12 | Integration approvals could be resolved by anyone holding the id | `api/integrations/approval` | **FIXED** — owner-scoped |
| H13 | `authorization` header forwarded to the Render worker could not carry browser identity; wildcard CORS let any site try | `api/automation*` | **FIXED** — signed internal secret + asserted user id |
| H14 | Webhook events not idempotent | `api/webhook/razorpay` | **FIXED** — atomic event-id claim, duplicates acknowledged without re-applying |
| H15 | Hardcoded Pollinations key in source (`.env.example`, `config/keys.ts`, `image-models.ts`) | 3 files | **FIXED** — literal removed, env-only |
| H16 | CSRF middleware defined but never invoked | `src/lib/csrf-middleware.ts` | **OPEN** (see below) |
| H17 | No CSRF enforcement on cookie-authenticated state changes | `src/proxy.ts` excludes `/api/*` | **OPEN** |
| H18 | Response identity laundering: a model's self-identity rewritten to another vendor's | `chat/route.ts` | **PARTIAL** — false vendor claims removed; fictional per-model descriptions still returned |
| H19 | Fabricated completion appended to truncated answers | `chat/route.ts` | **FIXED** |
| H20 | Default free chat path faked token streaming (chunking a completed response with a 12 ms delay) | `chat/route.ts` PATH 1 | **OPEN** — see accuracy note below |
| H21 | Model catalog advertises non-existent models (`gpt-6-astra`, `claude-opus-5.5`, …) as real vendors | `models.ts`, `chat/route.ts` | **OPEN** — product decision required |

### Accuracy note on H20/H21

Both are honest-labelling defects rather than exploitable vulnerabilities, and
both are visible to paying users. Changing them changes what the product
*claims*, so they are recorded here rather than changed silently:
see `docs/PRODUCTION_READINESS.md → Decisions needed from you`.

---

## Verified but not exploited here

- `MAX_INGEST_CHARS` caps RAG uploads at 500k characters.
- `checkUrlSyntax` classifies IPv4-mapped IPv6 (`::ffff:7f00:1`) correctly —
  a browser-level normalisation trick that the first implementation missed.
  Found by the unit test, fixed in `src/lib/ssrf-guard.ts`.
