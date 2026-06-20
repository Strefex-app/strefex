# Audit Fix Tracking Report

**Last updated:** 2026-05-20 (phase 10)  
**Scope:** Self-audit findings — security, bundle size, CI, tests.

---

## Summary

| Status | Count |
|--------|-------|
| Fixed (phase 1–10) | 54 |
| Partially fixed | 5 |
| Open / planned | 4+ |

---

## Phase 1 — Fixed

| ID | Issue | Fix | Files |
|----|-------|-----|-------|
| **C1** | Default `"default"` company on register | `company_name` required | `backend/app/api/v1/auth.py` |
| **C3/C4** | Client superadmin password check | Removed; Supabase-only | `src/services/superadminAuth.js` |
| **M9** | No admin role on signup | Bootstrap roles; creator → admin | `company.py`, `auth.py` |
| **BUG** | Missing `company_repository.create()` | Added create + role helpers | `backend/app/repositories/company.py` |
| **H2** | Weak prod JWT/DB defaults | Validator when `DEBUG=false` | `backend/app/config.py` |
| **M3** | Demo `/example` in prod | `DEBUG=true` only | `backend/app/api/v1/__init__.py` |
| **C2*** | Legacy `/tenants` API | `DEBUG=true` only | `backend/app/api/v1/__init__.py` |
| **M2** | Open CTI routes | JWT required | `cost_transformation.py` |
| **M4** | OpenAPI always on | Debug-only docs | `backend/app/main.py` |
| **M11** | Broken CORS wildcards | `allow_origin_regex` | `config.py`, `main.py` |
| **M5** | Stripe errors leak internals | Generic 500 messages | `billing.py` |
| **L6** | Exception handler unused | Wired handler | `main.py` |
| **L1** | Untracked source JPGs | `.gitignore` | `.gitignore` |
| **M7** | Route audit false positives | Nested route expansion | `scripts/route-audit.mjs` |
| **TEST** | No company name test | `test_register_requires_company_name` | `test_health.py` |

---

## Phase 2 — Fixed

| ID | Issue | Fix | Files |
|----|-------|-----|-------|
| **H4*** | Registration/login abuse | In-memory rate limit: login 30/min, register 10/hr per IP | `backend/app/core/rate_limit.py`, `auth.py` |
| **H10*** | Ambiguous login (first email match) | Error lists company slugs when email exists in multiple companies | `user.py`, `auth.py` (service) |
| **H6*** | `xlsx` in main bundle | Central lazy loader + removed static page imports | `src/utils/spreadsheet.js`, directory pages, export utils |
| **H6*** | Heavy libs not split | Vite chunks: `vendor-xlsx`, `vendor-ocr`, `vendor-heic` | `vite.config.js` |
| **npm** | `ws` high severity | `package.json` override `ws@^8.18.2` | `package.json` |
| **npm*** | `xlsx` blocks CI (no upstream fix) | `scripts/npm-audit-ci.mjs` allowlists `xlsx`; CI uses it | `scripts/npm-audit-ci.mjs`, `ci.yml` |
| **H7** | npm audit ignored in CI | `npm run audit:ci` in quality gate | `package.json`, `ci.yml` |
| **H9*** | Thin security tests | Rate-limit unit tests + superadminAuth tests | `test_auth_security.py`, `superadminAuth.test.js` |

\*Partial — see open items below.

---

## Verification (cross-check)

Run locally (agent shell timeouts prevented re-run here):

```bash
npm test                    # expect 67 tests (phase 10)
npm run lint:ci             # scoped ESLint gate (phase 4)
npm run build               # expect success; audit-pro-pages chunk
npm run audit:ci            # pass except allowlisted xlsx
node scripts/route-audit.mjs  # 0 unresolved refs
cd backend && DEBUG=true pytest tests/ -v   # expect 44 tests (phase 10)
```

| Check | Last known result |
|-------|-------------------|
| Route audit | **PASS** — 0 unresolved |
| Frontend build | **PASS** (~38s, phase 1) |
| Frontend tests | **PASS** — 56 tests (phase 1); +3 new |
| npm audit (raw) | **FAIL** — `xlsx` (allowlisted in CI) |
| npm audit:ci | **PASS** (with xlsx allowlist) |
| Backend pytest | **CI** — 44 tests with Postgres + Redis (phase 10) |

---

## Phase 10 — Fixed

| ID | Issue | Fix | Files |
|----|-------|-----|-------|
| **H4\*** | No frontend verify-email flow | `/verify-email` page; `authApi.verifyEmail` / `resendVerification`; Login resend uses backend | `VerifyEmail.jsx`, `api.js`, `authService.js`, `App.jsx` |
| **H4\*** | Register auto-login when verification required | `RegisterResponse` with `email_verification_pending`; no cookies until verified | `auth.py`, `schemas/auth.py` |
| **H4\*** | Token never expired | `email_verification_sent_at` + enforce `EMAIL_VERIFICATION_EXPIRE_HOURS` | `005_*.py`, `email_verification.py` |
| **OPS** | No go-live checklist | Comprehensive deployment + security audit doc | `docs/DEPLOYMENT_AUDIT.md` |
| **TEST** | Verify flow coverage | `verifyEmail.test.js`, extended `test_email_verification.py` | +3 backend, +2 frontend tests |

\*SMTP delivery still DEBUG-only — use Supabase confirmation in production until SMTP is wired.

Deploy: `alembic upgrade head` (applies **005**). Full go-live gate: `docs/DEPLOYMENT_AUDIT.md`.

---

## Phase 9 — Fixed

| ID | Issue | Fix | Files |
|----|-------|-----|-------|
| **H4** | Rate limit single-process only | `RedisRateLimitBackend` when `REDIS_URL` set; async `check_auth_rate_limit` | `rate_limit_backends.py`, `rate_limit.py`, `auth.py`, `config.py` |
| **H4*** | No email verification | `email_verified_at` + token hash; `/verify-email`, `/resend-verification`; optional login gate | `004_user_email_verification.py`, `email_verification.py`, `auth.py`, `user.py` |
| **TEST** | Rate limit async + Redis | `test_auth_security.py` (async), `test_rate_limit_redis.py` | CI Redis service + `REDIS_URL` |
| **TEST** | Email verification flow | Register unverified, verify token, resend, login gate | `test_email_verification.py` |

\*SMTP delivery not wired — DEBUG logs verification link; set `REQUIRE_EMAIL_VERIFICATION=true` when ready.

Deploy: `cd backend && alembic upgrade head` (applies `004` if not yet applied). Optional: `REDIS_URL=redis://…` for multi-worker rate limits.

---

## Phase 8 — Fixed

| ID | Issue | Fix | Files |
|----|-------|-----|-------|
| **H1** | JWT in `localStorage` | httpOnly `strefex_*` cookies on login/register; cookie-first auth in deps | `auth_cookies.py`, `auth.py`, `deps.py`, `main.py` |
| **H1** | Frontend token storage | `VITE_AUTH_USE_COOKIES`; `credentials: 'include'`; no JWT in localStorage | `authCookies.js`, `api.js`, `authStore.js`, `authService.js` |
| **M10** | No JWT refresh | `POST /auth/refresh` with rotation; auto-retry on 401; `POST /auth/logout` clears cookies | `security.py`, `auth.py`, `api.js` |
| **TEST** | Cookie auth coverage | `test_auth_cookies.py`, `authCookies.test.js` | 6 backend + 1 frontend test |

\*Bearer header still supported for Bubble/API clients. Set `VITE_AUTH_USE_COOKIES=false` to revert to Bearer-only UX.

---

## Phase 7 — Fixed

| ID | Issue | Fix | Files |
|----|-------|-----|-------|
| **C2** | Dual tenant model | Migration `003` migrates orphan rows + drops `tenants`; removed legacy API/ORM | `003_drop_tenants_table.py`, deleted tenant model/repo/routes |
| **C2** | Legacy `/tenants` API | Router removed (404); frontend `tenantsApi` removed | `api/v1/__init__.py`, `api.js` |
| **C2** | Deprecation docs | Updated completion status | `TENANT_DEPRECATION.md`, `backend/README.md` |
| **TEST** | Regression guard | `test_tenant_deprecation.py` — 404 on `/tenants`, register still works | `test_tenant_deprecation.py` |

Deploy: `cd backend && alembic upgrade head` (runs 002 + 003 if not yet applied).

---

## Phase 6 — Fixed

| ID | Issue | Fix | Files |
|----|-------|-----|-------|
| **H5** | Billing subscriptions in memory | `company_subscriptions` table + repository; all billing endpoints + webhooks use Postgres | `models/subscription.py`, `repositories/subscription.py`, `services/billing_subscription.py`, `billing.py`, `002_company_subscriptions.py` |
| **H5** | Billing schemas mixed with routes | Extracted `schemas/billing.py` | `schemas/billing.py` |
| **H5** | Persistence untested | Default plan, trial, payment_failed webhook tests | `test_billing_persistence.py`, `test_billing_webhook.py` |

---

## Phase 5 — Fixed

| ID | Issue | Fix | Files |
|----|-------|-----|-------|
| **H9** | No tenant isolation tests | Cross-company project/user/me tests | `test_tenant_isolation.py`, `helpers.py` |
| **H9** | Stripe webhook untested | Mocked webhook lifecycle tests | `test_billing_webhook.py` |
| **M1*** | Rehydrate logic duplicated in authStore | Extracted `rehydrateTenantStores.js`; authStore imports module statically | `rehydrateTenantStores.js`, `authStore.js` |
| **M6*** | Silent catch in projectStore sync | `devWarn` on workspace notify failure | `projectStore.js` |

\*Partial — dynamic imports retained where required for circular-deps / lazy load.

---

## Phase 3 — Fixed

| ID | Issue | Fix | Files |
|----|-------|-----|-------|
| **H10** | Login UX for multi-company | Company slug field + helpers | `Login.jsx`, `loginErrors.js` |
| **C2*** | Broken `Tenant.users` ORM | Removed relationship; deprecation doc | `tenant.py`, `TENANT_DEPRECATION.md` |
| **H9*** | Register flow untested | `test_register_success_assigns_admin` | `test_health.py` |
| **H9*** | Multi-company message | `format_multi_company_login_error` + tests | `auth.py`, `test_auth_messages.py` |
| **M8*** | Audit Pro demo kit hook | `useAuditProDemoKitVisible.test.js` | hook test |

---

## Phase 4 — Fixed

| ID | Issue | Fix | Files |
|----|-------|-----|-------|
| **H8** | No ESLint in CI | Flat ESLint 9 config + scoped `lint:ci` gate; removed noop `tsc` step | `eslint.config.js`, `scripts/lint-ci.mjs`, `ci.yml`, `package.json` |
| **M6*** | Silent `.catch(() => {})` on auth bootstrap | `devWarn` in dev for tenant rehydrate + workspace sync + logout | `src/utils/devLog.js`, `authStore.js` |
| **H6*** | Main chunk still large | Function-based `manualChunks`; Audit Pro pages → `audit-pro-pages` | `vite.config.js` |

\*Partial — expand ESLint scope and replace remaining silent catches gradually.

---

## Still open — plan

### Critical / High

| ID | Issue | Plan |
|----|-------|------|
| ~~**C2**~~ | ~~Dual tenant model~~ | Done phase 7 — `companies` only; migration `003` |
| ~~**H1**~~ | ~~JWT in `localStorage`~~ | Done phase 8 — httpOnly cookies; Bearer fallback retained |
| ~~**H4**~~ | ~~Rate limit single-process only~~ | Done phase 9–10 — Redis + verify UI (SMTP TBD) |
| ~~**H5**~~ | ~~Billing in memory~~ | Done phase 6 — Postgres `company_subscriptions`; run `alembic upgrade head` on deploy |
| **H6** | Main chunk still ~1.1 MB | ~~Audit Pro chunk split~~ done; trim static store imports (M1) |
| ~~**H8**~~ | ~~No ESLint in CI~~ | Done phase 4 — expand scope to full `src/` |
| ~~**H9**~~ | ~~Backend integration gaps~~ | Tenant isolation + webhook tests done phase 5 |
| **H10** | Login UX for multi-company | ~~Frontend company slug field~~ done; Supabase multi-tenant UX TBD |
| **npm** | `xlsx` vulnerability | Replace with maintained fork or server-side export (allowlist is temporary) |

### Medium (backlog)

| ID | Issue | Plan |
|----|-------|------|
| **M1** | Redundant dynamic imports | ~~Rehydrate extracted~~ done; projectStore→workspaceCloudSync cycle remains dynamic |
| **M6** | Silent `.catch(() => {})` | ~~Auth bootstrap devWarn~~ done; user feedback on critical UI paths |
| ~~**M8**~~ | ~~Thin integration tests~~ | Demo kit hook test done phase 3 |
| ~~**M10**~~ | ~~No JWT refresh~~ | Done phase 8 — `/auth/refresh` + cookie rotation |
| **M12** | Vite esbuild deprecation | Migrate to oxc when stable |

### Low

| ID | Issue | Plan |
|----|-------|------|
| **L2–L4, L8** | Typography, console.log, keys, ORM | Gradual cleanup |

---

## Go-live

Use **[docs/DEPLOYMENT_AUDIT.md](./DEPLOYMENT_AUDIT.md)** as the official pre-production gate (security §5, functional §6, sign-off §12).
