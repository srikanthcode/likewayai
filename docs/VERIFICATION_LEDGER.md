# Likeway AI — Verification Ledger

Every entry records what actually ran, not what was intended.

## Session commands and results

| # | Command | Result | When |
|---|---|---|---|
| 1 | `git status --short` | 12 modified, 2 untracked — preserved | baseline |
| 2 | `npx tsc --noEmit` | **0 errors** (exit 0) | baseline |
| 3 | `npx next build --webpack` | **success** (all 61 routes compiled) | after security batch 1 |
| 4 | `npx tsc --noEmit` | **0 errors** | after ownership/AI batch |
| 5 | `node --test tests/security.test.mjs` | **12/12 pass** | after SSRF guard fix |
| 6 | `GET /api/health` on the running dev server | `200 {"status":"ok",...}` — no secret names | live |
| 7 | `npx playwright test e2e/security-regressions.spec.ts` | **35/35 pass** (51.7 s) | live server |
| 8 | `GET https://speech.ai.unturf.com/v1/models` | `200`, returns `tts-1-f5` | live |
| 9 | `POST https://speech.ai.unturf.com/v1/audio/speech` (4 payload variants) | **400 on every variant** | live |
| 10 | `GET git grep` credential-pattern scan | **no matches** in `src/` | after redaction |
| 11 | `npx tsc --noEmit` | **0 errors** (exit 0) | after job-queue lease + model-label edits |
| 12 | `node --test tests/security.test.mjs` / `npm test` | **12/12 pass** | same tree |
| 13 | `npx playwright test e2e/security-regressions.spec.ts` | **35/35 pass** (1.3 m) | same tree, live server on :3000 |
| 14 | `npx next build --webpack` | **success**, all routes compiled | same tree |
| 15 | `GET http://localhost:3000/api/health` | `200` | live |

## Test coverage added

**`tests/security.test.mjs` (12 tests)** — pure logic, no network:

- SSRF blocks loopback / private / link-local / CGNAT / metadata / multicast,
  IPv4 and IPv6, including IPv4-mapped IPv6.
- SSRF blocks non-http schemes and embedded credentials.
- SSRF blocks internal hostnames.
- SSRF allows ordinary public URLs.
- Command-injection payloads are rejected; legitimate app names accepted;
  unsafe names refused before any process spawn.
- Ownership predicate: cross-user denied, admin allowed, `guest_` prefix
  normalised.

**`e2e/security-regressions.spec.ts` (35 tests)** — real HTTP against the app:

- 10 protected routes reject anonymous callers with 401.
- `x-user-id` header and body `userId` do not authenticate.
- 6 automation job routes require auth; `?userId=` cannot select another owner.
- Payment: `verify-payment` requires auth; forged subscription confirm is
  refused; unsigned webhook is refused.
- 7 SSRF targets refused.
- Preview render is neither readable nor wildcard-CORS.
- Health endpoints leak no secret names; metrics fails closed.
- Computer-control enumeration requires auth.

## Bugs the tests found

1. **SSRF bypass via IPv4-mapped IPv6.** `new URL("http://[::ffff:127.0.0.1]/")`
   normalises the host to `::ffff:7f00:1`, which the original dotted-quad regex
   did not match. Fixed by parsing the address into 16-bit groups. This is the
   clearest example of why "it compiles" is not verification.
2. **e2e suite initially reported 35 failures** — all `ECONNREFUSED` because the
   dev server was not running. The tests were not at fault; the harness was.
   Re-run against a live server: 35/35 pass.

## Not verified (and therefore not claimed)

| Claim | Why it is not verified |
|---|---|
| Live checkout end-to-end | Needs Razorpay test credentials and a hosted callback |
| Webhook idempotency under real retries | Logic reviewed; no provider delivery exercised |
| Browser automation launches Chromium | Needs Playwright browsers on the runtime |
| TTS produces audio | Upstream returns 400 |
| Qwen responds | Model id unverified |
| Job lease prevents duplicate claims | Single-process claim path exercised by types/build only; needs two live workers against one database |
| Production DB guard at boot | Would require booting with `NODE_ENV=production` and no URI |
| Streaming is real for every model | It is not — see PRODUCTION_READINESS §2 |

## Re-running everything

```bash
npx tsc --noEmit
npm test                                                # node --test "tests/*.test.mjs"
npx next build --webpack
npx playwright test e2e/security-regressions.spec.ts   # needs a server on :3000
```

`npm run verify` runs the first three. Note that `node --test tests/` does not
work on Windows — Node treats the bare directory as a module path and exits 1.
The `npm test` script uses a glob instead, which behaves the same on both
platforms.
