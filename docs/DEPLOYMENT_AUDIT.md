# STREFEX Platform — Production Deployment Audit

**Version:** 1.0 (post phase 10)  
**Last updated:** 2026-05-20  
**Purpose:** Go-live checklist for functionality, security, and operational readiness.

Use this document as the **single gate** before declaring the platform officially live. Every section should be executed in order; record pass/fail and owner in the sign-off table at the end.

---

## 1. Executive summary

STREFEX is a **Vite + React SPA** (Vercel or static host) with:

| Layer | Technology | Production role |
|-------|------------|-----------------|
| **Primary auth** | Supabase Auth + Postgres (Supabase) | User login, profiles, RLS |
| **B2B API** | FastAPI + PostgreSQL + Alembic | Multi-tenant RBAC, billing webhooks, projects |
| **Payments** | Stripe (Checkout + webhooks) | Subscriptions, trials |
| **Session (API)** | httpOnly JWT cookies + refresh rotation | Browser clients to FastAPI |
| **Rate limits** | Redis (optional) or in-memory | Auth abuse protection |
| **Email verify (API path)** | Token hash in Postgres + `/verify-email` page | Backend-only / dev deployments |

**Production default:** Supabase auth on the frontend; FastAPI backend for B2B modules when deployed separately.

---

## 2. Pre-deploy blockers (must pass)

| # | Check | Command / action | Pass |
|---|-------|------------------|------|
| B1 | CI green on `main` | GitHub Actions — all jobs | ☐ |
| B2 | Frontend tests | `npm test` (expect **67** tests) | ☐ |
| B3 | Frontend lint + build | `npm run lint:ci && npm run build` | ☐ |
| B4 | npm audit (allowlisted) | `npm run audit:ci` | ☐ |
| B5 | Backend tests | `cd backend && DEBUG=true pytest tests/ -v` (Postgres + Redis; expect **44+**) | ☐ |
| B6 | Route audit | `node scripts/route-audit.mjs` → 0 unresolved | ☐ |
| B7 | DB migrations applied | `cd backend && alembic upgrade head` (through **005**) | ☐ |
| B8 | Supabase migrations applied | All SQL in `supabase/migrations/` on remote project | ☐ |
| B9 | Secrets not in repo | `trufflehog` / manual scan — no live keys in git | ☐ |
| B10 | `DEBUG=false` on API prod | Backend env — JWT/DB validators enforce strong secrets | ☐ |

---

## 3. Environment configuration

### 3.1 Frontend (Vercel / static host)

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_SUPABASE_URL` | **Yes (prod)** | Primary auth |
| `VITE_SUPABASE_ANON_KEY` | **Yes (prod)** | Public anon key only |
| `VITE_API_BASE_URL` | If API separate | e.g. `https://api.strefex.com/api/v1` |
| `VITE_AUTH_USE_COOKIES` | Recommended `true` | No JWT in localStorage |
| `VITE_STRIPE_PUBLISHABLE_KEY` | If billing live | `pk_live_…` |
| `VITE_SENTRY_DSN` | Recommended | Error tracking |
| `VITE_MIXPANEL_TOKEN` | Optional | Analytics |
| `VITE_SA_EMAIL` | Recommended | Superadmin UI guard |
| `VITE_SEED_SUPPLIER_DIRECTORY` | **Must be unset/false** | Never seed prod directory |

Copy from [`.env.example`](../.env.example).

### 3.2 Backend (FastAPI host)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | **Yes** | `postgresql+asyncpg://…` — not default `postgres:postgres` in prod |
| `JWT_SECRET_KEY` | **Yes** | `openssl rand -hex 32` |
| `DEBUG` | **false** | Enables prod secret validation |
| `AUTH_USE_COOKIES` | `true` | httpOnly session cookies |
| `AUTH_COOKIE_SECURE` | `true` | HTTPS only |
| `AUTH_COOKIE_SAMESITE` | `lax` or `strict` | |
| `AUTH_COOKIE_DOMAIN` | If subdomains | e.g. `.strefex.com` |
| `REDIS_URL` | **Recommended prod** | `redis://…/0` — shared rate limits |
| `REQUIRE_EMAIL_VERIFICATION` | Policy | `true` when SMTP ready |
| `FRONTEND_URL` | **Yes** | Used in verification links |
| `CORS_ORIGINS` | **Yes** | Exact prod SPA origins |
| `STRIPE_SECRET_KEY` | If billing | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | If billing | From Stripe dashboard |
| `STRIPE_PRICE_*` | If billing | Price IDs per tier |
| `SENTRY_DSN` | Recommended | |

Copy from [`backend/.env.example`](../backend/.env.example).

### 3.3 Supabase (dashboard)

| Item | Action |
|------|--------|
| Auth email templates | Confirm / customize confirmation & reset emails |
| RLS policies | Review on all tenant-scoped tables |
| Service role key | **Server only** — never in frontend |
| Redirect URLs | Add prod domain + `/verify-email` if using Supabase confirm |

### 3.4 Stripe

| Item | Action |
|------|--------|
| Webhook endpoint | `POST https://<api>/api/v1/billing/webhook` |
| Events | `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed` |
| Live mode keys | Separate from test; rotate after staging validation |

---

## 4. Database migrations (ordered)

### FastAPI (Alembic)

```bash
cd backend
alembic current          # note revision
alembic upgrade head     # applies through 005
```

| Revision | Description |
|----------|-------------|
| 002 | `company_subscriptions` (billing persistence) |
| 003 | Drop legacy `tenants` table |
| 004 | `email_verified_at`, `email_verification_token_hash` |
| 005 | `email_verification_sent_at` (token expiry) |

**Post-migration (if enabling email verification on existing users):**

```sql
-- Backfill verified users created before verification was enforced
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;
```

### Supabase

Apply all files in `supabase/migrations/` to the production project (via CLI or dashboard SQL).

---

## 5. Security audit

### 5.1 Authentication & session

| ID | Test | Expected | ☐ |
|----|------|----------|---|
| S1 | JWT not in localStorage (cookie mode) | DevTools → Application → no access token in `strefex-auth` | |
| S2 | httpOnly cookies set on login | `Set-Cookie: strefex_access_token; HttpOnly` | |
| S3 | Refresh rotation | Login → `/auth/refresh` returns new cookies; old refresh invalid | |
| S4 | Logout clears cookies | `POST /auth/logout` → cookies removed | |
| S5 | 401 on expired session | Protected route redirects to `/login` | |
| S6 | Bearer fallback (API clients) | `Authorization: Bearer` still works for integrations | |
| S7 | Email verification gate | With `REQUIRE_EMAIL_VERIFICATION=true`, unverified login → 403 | |
| S8 | Verify link one-time use | Token works once; replay → 400 | |
| S9 | Verify token expiry | Link older than `EMAIL_VERIFICATION_EXPIRE_HOURS` → 400 | |

### 5.2 Authorization & tenant isolation

| ID | Test | Expected | ☐ |
|----|------|----------|---|
| S10 | Cross-company project read | User A cannot GET User B's project (`test_tenant_isolation`) | |
| S11 | Cross-company user read | User A cannot GET User B's profile | |
| S12 | `/auth/me` scoped to JWT company | Token company matches response | |
| S13 | Admin-only routes | Non-admin → 403 on admin endpoints | |
| S14 | Superadmin client guard | Non-`VITE_SA_EMAIL` cannot access superadmin UI | |
| S15 | Legacy `/tenants` removed | `404` on `/api/v1/tenants` | |

### 5.3 Abuse & input

| ID | Test | Expected | ☐ |
|----|------|----------|---|
| S16 | Login rate limit | 31st login/min from same IP → 429 | |
| S17 | Register rate limit | 11th register/hr from same IP → 429 | |
| S18 | Resend verification limit | 4th resend/hr → 429 | |
| S19 | Redis shared limits (prod) | Two API workers share same counter when `REDIS_URL` set | |
| S20 | Register validation | Weak password / missing company → 400 | |
| S21 | SQL injection spot-check | Malformed UUID in path → 422, not 500 | |
| S22 | OpenAPI disabled in prod | `/docs` → 404 when `DEBUG=false` | |

### 5.4 Secrets & transport

| ID | Test | Expected | ☐ |
|----|------|----------|---|
| S23 | HTTPS everywhere | No mixed content; HSTS on API + SPA | |
| S24 | CORS | Untrusted origin blocked on API | |
| S25 | Stripe webhook signature | Invalid signature → 400 | |
| S26 | Default JWT secret rejected | App fails start with `DEBUG=false` + default secret | |
| S27 | Default DB creds rejected | App fails start with `DEBUG=false` + `postgres:postgres` | |

### 5.5 Dependency vulnerabilities

| ID | Test | Expected | ☐ |
|----|------|----------|---|
| S28 | `npm run audit:ci` | Pass (xlsx allowlisted — track replacement) | |
| S29 | `pip-audit -r backend/requirements.txt` | No critical unmitigated issues | |
| S30 | TruffleHog CI | No verified secrets in repo | |

---

## 6. Functional test matrix

Execute on **staging** that mirrors production config, then repeat critical paths on prod after cutover.

### 6.1 Auth & onboarding

| ID | Flow | Steps | ☐ |
|----|------|-------|---|
| F1 | Register (Supabase) | New business email → confirmation email → confirm → login | |
| F2 | Register (API path) | Dev/staging with backend auth → step 3 “Check email” OR auto-login | |
| F3 | Verify email page | Open `/verify-email?token=…` → success → login | |
| F4 | Resend verification | Login blocked → resend → new link works | |
| F5 | Multi-company login | Same email, two companies → slug prompt → correct tenant | |
| F6 | Password reset | Forgot password → email → reset → login | |
| F7 | Logout | Clears session; back button does not restore access | |

### 6.2 Core platform

| ID | Flow | ☐ |
|----|------|---|
| F8 | Main menu loads after auth | |
| F9 | Settings / profile save | |
| F10 | Project CRUD (create, list, edit, delete) | |
| F11 | Team management (admin) | |
| F12 | Notifications page | |
| F13 | Calendar | |
| F14 | Industry hub navigation + guard tiers | |

### 6.3 Billing (if enabled)

| ID | Flow | ☐ |
|----|------|---|
| F15 | View plans | |
| F16 | Stripe Checkout (test/live) | |
| F17 | Webhook updates `company_subscriptions` | |
| F18 | Payment failed → grace / downgrade | |
| F19 | Plan gate blocks premium feature | |

### 6.4 Audit Pro / management

| ID | Flow | ☐ |
|----|------|---|
| F20 | Audit program gate | |
| F21 | Create audit plan | |
| F22 | Conduct audit + save | |
| F23 | Reports / print | |
| F24 | Demo kit hidden in prod (`useAuditProDemoKitVisible`) | |

### 6.5 Integrations & PWA

| ID | Flow | ☐ |
|----|------|---|
| F25 | PWA install + update banner | |
| F26 | Sentry receives test error | |
| F27 | Mixpanel receives login event (if enabled) | |
| F28 | Workspace cloud sync (authenticated) | |

---

## 7. Performance & build

| ID | Check | Target | ☐ |
|----|-------|--------|---|
| P1 | Production build | `npm run build` succeeds | |
| P2 | Main chunk size | Document baseline; Audit Pro in separate chunk | |
| P3 | Lighthouse (login) | Performance > 70, Accessibility > 90 | |
| P4 | TTI after login | Main menu interactive < 5s on 4G | |
| P5 | API health | `GET /health` → 200 < 500ms | |

---

## 8. Deployment procedure

### 8.1 Recommended order

1. **Supabase** — apply migrations; verify auth settings  
2. **Postgres (API)** — backup → `alembic upgrade head`  
3. **Redis** — provision; set `REDIS_URL`  
4. **Backend** — deploy container/VM; env from §3.2; health check  
5. **Stripe** — point webhook to prod API  
6. **Frontend** — deploy Vercel; env from §3.1  
7. **DNS / TLS** — API subdomain, SPA domain, cookie domain alignment  
8. **Smoke tests** — §6 critical paths (F1, F3, F7, F8, F15 if billing)

### 8.2 Docker Compose (single-server dev/staging)

```bash
docker compose up -d db redis
docker compose run --rm migrate
docker compose up -d backend
npm run build && npm run preview   # or deploy dist/ to CDN
```

### 8.3 Rollback

| Component | Rollback |
|-----------|----------|
| Frontend | Redeploy previous Vercel deployment |
| Backend | Redeploy previous image; **do not** downgrade Alembic without DBA review |
| DB | Restore Postgres snapshot taken in step 8.1.2 |
| Stripe | Revert webhook URL to previous API if needed |

---

## 9. Post-go-live monitoring (first 72 hours)

| Signal | Tool | Alert threshold |
|--------|------|-----------------|
| 5xx rate | Sentry / host metrics | > 1% of requests |
| Auth failures spike | API logs / Sentry | 3× baseline |
| Stripe webhook failures | Stripe dashboard | Any failed delivery |
| DB connections | Postgres metrics | > 80% pool |
| Redis down | API logs | Rate limit falls back to memory — scale to single worker or fix Redis |
| CI regression | GitHub Actions | Any failure on `main` |

---

## 10. Known limitations (track in `AUDIT_FIX_TRACKING.md`)

| Item | Status | Risk |
|------|--------|------|
| SMTP for API email verification | DEBUG log only | Must use Supabase emails in prod OR wire SMTP before `REQUIRE_EMAIL_VERIFICATION=true` |
| `xlsx` npm advisory | Allowlisted | Replace with maintained fork or server-side export |
| Main bundle ~1.1 MB | Partial split | Monitor; trim static imports |
| H10 Supabase multi-tenant UX | Partial | Company slug on login done; full UX TBD |
| Vite esbuild → oxc | Planned | Build warnings only |

---

## 11. Automated verification script (local / CI)

```bash
# From repo root
npm test
npm run lint:ci
npm run build
npm run audit:ci
node scripts/route-audit.mjs

# Backend (requires Postgres + Redis)
cd backend
DEBUG=true REDIS_URL=redis://localhost:6379/0 pytest tests/ -v --tb=short
```

---

## 12. Sign-off

| Section | Owner | Date | Pass |
|---------|-------|------|------|
| Pre-deploy blockers (§2) | | | ☐ |
| Environment config (§3) | | | ☐ |
| Migrations (§4) | | | ☐ |
| Security audit (§5) | | | ☐ |
| Functional tests (§6) | | | ☐ |
| Performance (§7) | | | ☐ |
| Deployment executed (§8) | | | ☐ |
| Monitoring active (§9) | | | ☐ |

**Production go-live approved:** _________________________ Date: __________

---

## Related documents

- [`docs/AUDIT_FIX_TRACKING.md`](./AUDIT_FIX_TRACKING.md) — remediation phases 1–10  
- [`docs/EFFICIENCY_AND_LOADING_AUDIT.md`](./EFFICIENCY_AND_LOADING_AUDIT.md) — frontend performance  
- [`backend/docs/ARCHITECTURE.md`](../backend/docs/ARCHITECTURE.md) — API design  
- [`backend/docs/TENANT_DEPRECATION.md`](../backend/docs/TENANT_DEPRECATION.md) — companies-only model  
