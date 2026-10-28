# Likeway AI — Architecture

> Derived from the working tree at the time of the production upgrade, not from
> the earlier static audit. Where the two disagree, this document reflects the
> code.

## Runtime

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.x, App Router |
| UI | React 19, TypeScript, Tailwind CSS v4, Radix UI, Framer Motion, Lucide |
| Data | MongoDB (`mongodb` driver 7.x) |
| Browser automation | Playwright Chromium, in-process worker or Render worker |
| Payments | Razorpay (orders + subscriptions), Stripe (checkout) |
| Deployment | Vercel (edge/UI) + Render or Docker (long-running worker) |

Two deployment shapes are supported and the code branches on environment:

```
                 ┌──────────────────────────────┐
   browser ─────▶│  Next.js app (Vercel)        │
                 │  UI + API routes             │
                 └───────┬──────────────┬───────┘
                         │              │ x-internal-secret
                         │              ▼
                         │      ┌───────────────────────────┐
                         │      │ Render / Docker worker    │
                         │      │ Playwright, WS stream,    │
                         │      │ browser job queue         │
                         │      └─────────────┬─────────────┘
                         ▼                    ▼
                 ┌──────────────────────────────────┐
                 │ MongoDB (Atlas)                  │
                 │ users, sessions, daily_usage,    │
                 │ payment_refs, webhook_events,    │
                 │ automation_jobs, rag_documents   │
                 └──────────────────────────────────┘
```

Vercel has no long-lived Chromium, so browser routes proxy to `RENDER_API_URL`.
The proxy hop authenticates with `INTERNAL_API_SECRET` and asserts the user id
via `x-internal-user-id`; a browser cannot forge either.

## Directory map

```
src/
  app/
    page.tsx                  main chat UI (single large client component)
    api/                      61 route handlers (see API_INVENTORY.md)
    login|signup|pricing|...  auth and marketing routes
  components/                 UI, incl. LivePreviewWorkspace, VisibleBrowserWorkspace,
                              FreeTierAdSlot
  lib/
    request-auth.ts           ← single source of request identity (new)
    ssrf-guard.ts             ← outbound URL validation (new)
    tts-provider.ts           ← speech providers (new)
    auth.ts                   JWT, cookies, password hashing
    entitlements.ts           server-authoritative quota engine
    plans.ts                  plan definitions and client display
    models.ts                 model catalog
    api-manager.ts            provider dispatch, key pool, fallbacks
    mongodb.ts                connection + (dev-only) memory fallback
    automation/               job queue, worker, browser engine
    preview/                  preview sessions and HTML bundling
    integrations/             connected-app registry, approvals, credentials
    system/computer-control.ts local app launch (hardened)
  proxy.ts                    route protection (formerly middleware)
```

## Key data flows

### Chat
1. `POST /api/chat` resolves identity from the cookie (`getUserIdFromSession`).
2. `resolveEffectivePlan` reconciles the JWT plan against the database.
3. `checkModelAccess` + `consumeEntitlement` reserve quota.
4. Intent routing: computer control → autonomous build → orchestrator → model.
5. Provider call through `fetchAI` with per-provider fallback.
6. Response streamed back as SSE; the message is persisted.

### Browser automation
1. `POST /api/automation/jobs` → identity, plan, `browser_automation` quota,
   per-user concurrency cap.
2. `browserJobQueue.enqueueJob` writes a durable job record.
3. Worker claims the job, launches an isolated Chromium context, records each
   step (action, screenshot, verification) on the job.
4. Client polls `GET /api/automation/jobs/:id` or subscribes to
   `GET /api/automation/jobs/:id/stream` (SSE), both owner-scoped.

### Payments
1. `POST /api/create-order` computes the price server-side and stores a
   `payment_refs` document binding order → user + plan + amount.
2. Checkout completes at the provider.
3. `POST /api/subscription/confirm` verifies the provider signature, then
   requires a matching server-side reference, matching owner/plan/type/amount,
   and a not-yet-applied status before granting access.
4. `POST /api/webhook/razorpay` verifies the raw-body HMAC and claims the event
   id atomically before applying it (idempotent under retries).

## Trust boundaries

| Boundary | Control |
|---|---|
| Browser → API | httpOnly JWT cookie; never a client-supplied user id |
| Vercel → Render | `INTERNAL_API_SECRET`, constant-time compare, user id asserted and regex-validated |
| API → AI providers | server-held keys; no key reaches the client |
| API → arbitrary URL | `ssrf-guard`: scheme, hostname, DNS resolution, redirect re-validation, size and time caps |
| Generated preview → app | separate document with restrictive CSP, owner-scoped, never wildcard-CORS |
| Payment provider → API | HMAC over the exact payload; server-side reference is authoritative |

## Known structural debt

- `src/app/page.tsx` (~4.5k lines) and `src/app/api/chat/route.ts` (~1.8k
  lines) hold several responsibilities each. Splitting them is worthwhile but
  is a refactor with real regression risk; it is scheduled after the security
  and correctness work (see `UPGRADE_PLAN.md`).
- `src/proxy.ts` deliberately excludes `/api/*`; every API route must therefore
  enforce its own authentication. `request-auth.ts` exists to make that a
  one-liner.
