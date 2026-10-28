# Likeway AI — Production Upgrade Plan

> Status: **in progress**. This file tracks what has actually been changed and verified.
> No item is marked done without a test or a reproducible command result.

## Baseline (measured at start of upgrade)

| Check | Command | Result |
|---|---|---|
| Git branch | `git branch --show-current` | `main` |
| Working tree | `git status --short` | 12 modified, 2 untracked (pre-existing user work — preserved) |
| TypeScript | `npx tsc --noEmit` | **pass**, 0 errors |
| Tracked env file | `git ls-files` | `PRODUCTION_ENV.txt` **is tracked** ⚠️ |
| CSRF middleware | grep `csrfProtection` | defined but **never called** ⚠️ |

## Verified findings (each reproduced by reading the current code)

### Critical

| # | Finding | Location | Status |
|---|---|---|---|
| C1 | `PRODUCTION_ENV.txt` tracked in git, contains live Razorpay key id + secret | `PRODUCTION_ENV.txt` | **partially fixed** — untracked + literals removed from `DEPLOY.md`; key rotation and history purge are outstanding (runbook §4) |
| C2 | Shell injection: user app name interpolated into a PowerShell string | `src/lib/system/computer-control.ts:309` | **fixed + tested** — `execFile` only, env-var argument passing, charset allowlists |
| C3 | Payments can be activated with a forged/foreign signed order | `src/app/api/subscription/confirm/route.ts` | **fixed + tested** — server reference required, owner/plan/amount checks, replay returns `already_confirmed` |
| C4 | `verify-payment` passes *either* reversed HMAC direction, no auth, no persistence | `src/app/api/verify-payment/route.ts` | **fixed + tested** — `requireIdentity`, ownership via `getPaymentRef`, canonical signature only |
| C5 | Identity trusted from `x-user-id` header / body | `api/gateway`, `api/integrations*`, `api/automation*` | **fixed + tested** — `src/lib/request-auth.ts` is the only identity source |
| C6 | Any user can read/cancel any automation job (no ownership check) | `api/automation/jobs/[id]/route.ts` | **fixed + tested** — owner-scoped, 404 for non-owners |
| C7 | Preview writes AI-generated filenames via `path.join` → path traversal | `src/lib/preview/preview-manager.ts:173` | **fixed** — `resolveInsideSession()` rejects `..`/absolute, writes confined to session dir |
| C8 | Preview renders untrusted HTML on the **app origin** with `frame-ancestors 'self' *` | `api/preview/render/[id]/route.ts` | **fixed + tested** — owner-scoped render, restrictive CSP, no wildcard CORS |
| C9 | In-memory MongoDB fallback silently replaces the database in production | `src/lib/mongodb.ts` | **fixed** — startup throws without `MONGODB_URI` in production |
| C10 | `Access-Control-Allow-Origin: *` on authenticated automation/gateway APIs | multiple routes | **fixed** — origin allowlist from `NEXT_PUBLIC_APP_URL` |

### High

| # | Finding | Location | Status |
|---|---|---|---|
| H1 | Entitlement metering fails **open** on DB error | `src/lib/entitlements.ts:268` | **fixed** — fails closed with a retry message |
| H2 | Preview sessions have no owner; session id is the only capability | `preview-manager.ts` | **fixed** — `userId` on every session, owner-checked on read/write |
| H3 | Generated preview `session.title` injected unescaped into `<title>` | `preview-manager.ts:334` | **fixed** — `escapeHtml()` |
| H4 | Job queue claims jobs from an in-memory map before the DB → duplicate execution across instances | `job-queue.ts:171` | **fixed, not fully verified** — DB claim is now the only claim path when Mongo is configured, with a conditional `findOneAndUpdate` + 2-minute lease and stale-claim reclaim; insert is awaited before the job is announced. Needs two live workers to prove end to end |
| H5 | Model catalog advertises non-existent frontend model IDs (`gpt-6-astra`, `claude-opus-5.5`, …) as real vendors | `api/chat/route.ts:196-221` | **fixed, pending a naming decision** — false per-response vendor attribution removed, and `company` is now `Likeway AI` for every proxy alias so the UI cannot attribute them to OpenAI/Anthropic. Display names (`Claude Opus 5.5`, `GPT 6 Astra`) still mirror the proxy's ids; renaming them is a product call |

## Execution order

Stage A (security) → Stage B (data/billing) → Stage C (product reliability) → Stage D (features) → Stage E (release).

## Honest status vocabulary used throughout

- **Fixed + tested** — a regression test exists and passes.
- **Fixed, not fully verified** — change is in place, needs an environment/credential to prove end to end.
- **Partially implemented** — some of the behaviour exists.
- **Blocked** — needs a credential, an external account, or infrastructure.
- **Not started**.
