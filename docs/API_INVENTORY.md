# Likeway AI — API Inventory

Authentication column reflects the code **after** the upgrade:

- **Session** — verified `lw_at` access-token cookie (`request-auth.ts`).
- **Session (optional)** — anonymous allowed by design; identity is still
  session-derived, never header-derived.
- **Internal** — `INTERNAL_API_SECRET`, for the Vercel → Render hop only.
- **Signature** — provider HMAC over the raw payload.
- **Public** — explicitly reachable without credentials.

`Meter` = quota reserved before work. `Owner` = resource scoped to the caller.

| Route | Methods | Auth | Meter | Owner | Notes |
|---|---|---|---|---|---|
| /api/agent-reach/doctor | GET | Public | – | – | Fixed probe targets only |
| /api/agent-reach/extract | POST | Session | – | – | SSRF-guarded |
| /api/audit | GET | Session | – | yes | |
| /api/auth/google | POST | Public | – | – | id_token audience checked |
| /api/auth/google/callback | GET | Public (state cookie) | – | – | |
| /api/auth/google/redirect | GET | Public | – | – | |
| /api/auth/guest | POST/GET | Public | – | – | Sets httpOnly UI-preference cookie only |
| /api/auth/login | POST | Public + IP rate limit | – | – | |
| /api/auth/logout | POST | Session | – | yes | |
| /api/auth/me | GET/PUT | Session | – | yes | |
| /api/auth/recovery | POST/PUT | Public + OTP | – | – | |
| /api/auth/refresh | POST | Refresh cookie | – | yes | Rotates token |
| /api/auth/register | POST | Public + rate limit | – | – | |
| /api/auth/session | GET/DELETE | Session | – | yes | |
| /api/auth/sessions/[id] | DELETE | Session | – | yes | |
| /api/automation | GET/POST/DELETE/OPTIONS | Session / Internal | browser_automation | yes | Origin-allowlisted CORS |
| /api/automation/jobs | GET/POST | Session / Internal | browser_automation | yes | `?userId=` admin-only |
| /api/automation/jobs/[id] | GET/DELETE | Session / Internal | – | yes | 404 for non-owners |
| /api/automation/jobs/[id]/stream | GET (SSE) | Session / Internal | – | yes | Owner-checked before stream |
| /api/browser-agent | POST | Session / Internal | browser_automation | yes | Constant-time internal secret |
| /api/chat | GET/POST | Session (optional) | per feature | yes | Anonymous gets no free quota |
| /api/chat/history/list | GET | Session | – | yes | |
| /api/chat/history/[id] | DELETE | Session | – | yes | |
| /api/checkout | POST | Session | – | yes | |
| /api/create-order | POST | Session | – | yes | Server-side price |
| /api/csrf | GET | Session (optional) | – | – | Token issued; enforcement OPEN |
| /api/diagnose | GET | Session + admin | – | – | |
| /api/files/[id] | GET | Session | – | yes | Was anonymous-readable |
| /api/gateway | POST | Session | chat_messages | yes | Was fully unauthenticated |
| /api/generate-image | GET/POST | POST: Session | image_generation | – | |
| /api/health | GET | Public | – | – | Status only; details admin-only |
| /api/ingest | POST | Session | – | yes | Docs scoped to owner, 500k cap |
| /api/integrations | GET/POST | Session | – | yes | |
| /api/integrations/approval | POST | Session | – | yes | Owner-only, expiring |
| /api/integrations/execute | POST | Session | – | yes | |
| /api/integrations/verify | POST | Session | – | yes | SSRF-guarded |
| /api/learn/generate-questions | POST | Session | chat_messages | – | Was an open LLM proxy |
| /api/metrics | GET | Bearer `METRICS_API_KEY` | – | – | Fails closed (503) when unset |
| /api/news | GET | Public | – | – | Fixed upstream providers |
| /api/news/search | POST | Public | – | – | Fixed upstream providers |
| /api/preview/render/[id] | GET | Session | – | yes | Restrictive CSP, no wildcard CORS |
| /api/preview/repair | POST | Session | autonomous_app_builder | – | Was an open LLM proxy |
| /api/preview/session | GET/POST/DELETE | Session | – | yes | Writes confined to session dir |
| /api/projects | GET/POST | Session | – | yes | |
| /api/projects/[id] | GET/DELETE | Session | – | yes | |
| /api/session | GET | Session (optional) | – | yes | |
| /api/subscription/confirm | POST | Session + Signature | – | yes | Server reference required; replay guarded |
| /api/subscription/create | POST | Session | – | yes | |
| /api/support | GET/POST | Public | – | – | Attribution from session only |
| /api/system/control | GET/POST | Session | computer_control | – | Hardened command execution |
| /api/system/health | GET | Public (summary) / admin (detail) | – | – | Provider config admin-only |
| /api/tts | GET/POST | POST: Session | realtime_voice | – | Primary + Gemini fallback |
| /api/user/account | DELETE | Session | – | yes | |
| /api/user/api-keys | GET/POST/DELETE | Session | – | yes | Provider allowlist, masked read |
| /api/user/data | GET | Session | – | yes | Data export |
| /api/user/plan | GET | Session | – | yes | POST always 403 |
| /api/user/preferences | GET/PUT | Session | – | yes | |
| /api/verify-payment | POST | Session + Signature | – | yes | Order must belong to caller |
| /api/voice-chat | POST | Session | realtime_voice | – | |
| /api/webhook/razorpay | POST | Signature | – | – | Idempotent |
| /api/webhook/stripe | POST | Signature | – | – | |

## Still requiring review

These are public by design but worth a periodic look:

- `/api/news`, `/api/news/search` — fixed providers, no user input in the URL.
- `/api/agent-reach/doctor` — fixed probe list, no user-supplied target.
- `/api/auth/*` — rate limited at the login/register path.

## Contract notes

- A rejected or unknown resource returns **404**, not 403, so ids cannot be
  probed.
- Unauthenticated requests return `401 {"error": "Sign in to continue."}`.
- Quota denials return **402** with `{ error, upgradeTo, plan }`; the client
  renders an upgrade link from `upgradeTo`.
- Metering infrastructure failures return **402 with a retry message** — never
  a silent success.
