# Likeway AI — Operations Runbook

## 1. Required environment

| Variable | Required in production | Notes |
|---|---|---|
| `MONGODB_URI` | **yes** | Startup throws without it. |
| `JWT_SECRET` | **yes** | Min 32 chars; validated at boot. |
| `CSRF_SECRET` | yes | Must be stable across instances. |
| `INTERNAL_API_SECRET` | when Vercel + Render | Shared secret for the proxy hop. |
| `NEXT_PUBLIC_APP_URL` | yes | Origin allowlist for CORS. |
| `RAZORPAY_KEY_ID` / `_SECRET` | for payments | Rotate if ever exposed. |
| `RAZORPAY_WEBHOOK_SECRET` | for renewals | Webhook returns 503 without it. |
| `METRICS_API_KEY` | recommended | `/api/metrics` is disabled without it. |
| `TTS_BASE_URL` / `TTS_MODEL` | optional | Defaults to `speech.ai.unturf.com`, model `tts-1-f5`. |
| `QWEN_BASE_URL` / `QWEN_MODEL` | optional | Defaults to `qwen.ai.unturf.com`, `qwen3.8-27b`. |
| `NEXT_PUBLIC_ADS_ENABLED` | optional | `true` enables the free-tier ad slot. |

Never place a real secret in `.env.example`, a markdown file, or source.

## 2. Health and readiness

```
GET /api/health          → {"status":"ok"}            (public, status only)
GET /api/system/health   → {"status":"ok","database":{...}}
```

Both return **503** when the database is unreachable. Detailed provider and
session diagnostics require an admin session.

## 3. Deploy checklist

1. `npm ci` from the lockfile.
2. `npm run verify` → typecheck + unit tests + production build.
3. `npx playwright test e2e/security-regressions.spec.ts`.
4. Confirm `MONGODB_URI` is set and `/api/health` returns 200 on the deployed
   URL.
5. Confirm `/api/system/health` reports `database.status = healthy`.
6. Smoke test: sign in, send one message, open one preview.
7. If browser automation is enabled, run one job and confirm a real screenshot
   is recorded.

## 4. Secret remediation (do this before anything else)

The Razorpay live key pair was committed for 134 commits.

**Step 1 — rotate (do now).** Razorpay Dashboard → Account & Settings → API Keys
→ regenerate. Update `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in every
environment. A redacted file does not invalidate a key already in history.

**Step 2 — purge history.** Coordinate with everyone who has cloned the repo;
this rewrites commits.

```bash
git clone --mirror <repo-url> repo.git
cd repo.git
# Requires git-filter-repo (preferred) or BFG
git filter-repo --invert-paths --path PRODUCTION_ENV.txt
# Then scrub the key literal from DEPLOY.md across all commits.
#   Put the two secrets in a `replacements.txt` file OUTSIDE the repo,
#   one per line as:   <secret>==>REMOVED
#   (never paste them into a tracked file, including this one)
git filter-repo --replace-text ../replacements.txt
git push --force --all && git push --force --tags
```

**Step 3 — verify.** Re-run the CI `secret-scan` job; it must pass on a fresh
clone. Ask every collaborator to re-clone.

**Step 4 — audit.** Check the Razorpay dashboard for payments/refunds issued
outside your knowledge during the exposure window.

## 5. Database

- Backups: enable Atlas continuous backups. Take a manual snapshot before any
  schema change.
- Restore: Atlas → Backup → Restore to a new cluster, point `MONGODB_URI` at it,
  verify `/api/system/health`, then cut traffic over.
- Retention: `src/lib/indexes.ts` now declares the queue indexes at startup —
  `automation_jobs { status, createdAt }` (the claim path),
  `automation_jobs { userId, createdAt }`, a 90-day TTL on `updatedAt`, a unique
  `webhook_events.eventId`, and a 30-day TTL on `receivedAt`. `ensureIndexes()`
  runs from `src/lib/startup.ts`; verify with `db.automation_jobs.getIndexes()`
  after a deploy.
- Job claiming: when MongoDB is configured, `claimNextJob()` claims only from
  the database via a conditional `findOneAndUpdate` with a 2-minute lease.
  Do not run the worker in a process that cannot reach the database — it would
  fall back to the in-memory queue, which is single-process only.

## 6. Incident response

1. **Confirm** via `/api/health` and the structured logs (`requestId` per
   request).
2. **Contain** — if a credential is suspect, rotate it first, then investigate.
3. **Preserve** — export relevant `webhook_events`, `payment_refs` and
   `automation_jobs` documents before any cleanup.
4. **Communicate** — paying users need a factual statement of impact, not a
   status page that always says green.
5. **Post-mortem** — record root cause, the detection gap, and the test that
   would have caught it.

## 7. Rollback

- The app is stateless; redeploy the previous build.
- If a bad change shipped to `main`, revert the merge commit — do not reset a
  shared branch.
- Database changes in this upgrade are additive (new collections and indexes);
  no down-migration is required to roll back the application.

## 8. Monitoring gaps to close

- No tracing backend; only structured console logs.
- No alerting on provider failure rate, queue age, or webhook failures.
- `recordModelTelemetry` is called without input tokens, error flags or cost,
  so provider reliability dashboards would currently read zero.
