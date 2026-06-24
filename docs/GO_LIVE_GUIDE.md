# STREFEX — Simple Go-Live Guide

**For:** non-developers who need to launch the platform safely  
**Time needed:** usually 1–2 days (spread over a few sessions)  
**Technical companion:** [DEPLOYMENT_AUDIT.md](./DEPLOYMENT_AUDIT.md) (detailed checklist for your team or a developer)

---

## Part 0 — What you are actually launching

Think of STREFEX as **4 connected services**. Each has its own website/dashboard where you configure it:

| Piece | What it does | Where you manage it |
|-------|----------------|---------------------|
| **1. Website (frontend)** | What users see in the browser — login, menus, pages | **Vercel** (or similar host) |
| **2. User accounts & database** | Sign up, login, profiles, company data | **Supabase** |
| **3. Business API (backend)** | Projects, billing webhooks, multi-company security | **Your server** (Docker, Railway, VPS, etc.) — *only if you use it in production* |
| **4. Payments** | Subscriptions and paid plans | **Stripe** |

**Most important rule:** In production, users normally log in through **Supabase**, not through the small FastAPI server on your laptop. The website on Vercel talks to Supabase automatically once you paste the correct keys.

```
User's browser
     │
     ▼
  Vercel (your app: app.strefex.com)
     │
     ├──► Supabase (login, profiles, data)     ← required
     ├──► Stripe (payments)                    ← if you charge money
     └──► FastAPI backend (api.strefex.com)    ← optional; needed for some B2B API features
```

---

## Part 1 — Before you start (gather these)

Check each box when you have it:

- [ ] **Domain name** (e.g. `strefex.com`) and access to DNS settings
- [ ] **GitHub account** with access to the `strefex` repository
- [ ] **Supabase project** (free or paid) — [supabase.com](https://supabase.com)
- [ ] **Vercel account** linked to GitHub — [vercel.com](https://vercel.com)
- [ ] **Stripe account** (if you accept payments) — [stripe.com](https://stripe.com)
- [ ] **Server for backend** (only if you deploy FastAPI in prod) — e.g. Railway, DigitalOcean, AWS
- [ ] **Business email** for superadmin (`STREFEX@strfgroup.ru` or your choice)
- [ ] **2–3 hours** for setup + **1 hour** for testing with a fresh test account

**Do not** put real passwords or secret keys in WhatsApp, email, or screenshots. Use each platform’s “Environment variables” screen only.

---

## Part 2 — Step-by-step launch order

Follow these steps **in order**. Do not skip ahead to “go live” before testing.

---

### STEP 1 — Make sure the code on GitHub is good

**Goal:** Confirm the latest version builds and tests pass.

1. Open your GitHub repository in the browser.
2. Click **Actions** (top menu).
3. Wait until the latest run on `main` shows **green checkmarks** on all jobs.
   - If something is red, fix that before continuing (ask a developer or share the failed job name).

**You are done with Step 1 when:** All CI jobs pass on `main`.

---

### STEP 2 — Set up Supabase (user accounts)

**Goal:** Users can register and log in; database is ready.

#### 2.1 Create or open your project

1. Go to [app.supabase.com](https://app.supabase.com).
2. Open your STREFEX project (or create one).
3. Write down:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key** (Settings → API → `anon` `public`)

#### 2.2 Run database migrations

Your app needs tables defined in the `supabase/migrations/` folder in the repo.

**Option A — you have Supabase CLI installed (developer helps):**
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

**Option B — no CLI:**
- Ask a developer to run migrations, **or**
- In Supabase dashboard → **SQL Editor**, run the migration files **in filename order** (001, 002, 003…).

#### 2.3 Configure authentication

1. Supabase → **Authentication** → **Providers** → ensure **Email** is enabled.
2. **Authentication** → **URL configuration**:
   - **Site URL:** `https://your-domain.com` (your future Vercel URL)
   - **Redirect URLs:** add:
     - `https://your-domain.com/**`
     - `http://localhost:5173/**` (for local testing)
3. **Authentication** → **Email templates**:
   - Open “Confirm signup” — check the link points to your domain.
   - Customize the email text if you want (company name, support email).

#### 2.4 Create your superadmin user

1. **Authentication** → **Users** → **Add user** (or register through the app later).
2. Use your business email (same as `VITE_SA_EMAIL` in Step 4).
3. Set a **strong password** and store it in a password manager.

**You are done with Step 2 when:** You can see your project URL and anon key, migrations are applied, and auth URLs include your domain.

---

### STEP 3 — Deploy the website on Vercel

**Goal:** The app is visible on the internet at a real URL.

#### 3.1 Import the project

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Import the GitHub `strefex` repository.
3. Framework should auto-detect **Vite**.
4. Build settings (usually auto-filled):
   - Build command: `npm run build`
   - Output directory: `dist`

#### 3.2 Add environment variables (critical)

In Vercel → your project → **Settings** → **Environment Variables**, add these for **Production**:

| Name | Value | Required? |
|------|--------|-----------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL | **Yes** |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key | **Yes** |
| `VITE_SA_EMAIL` | Your superadmin email | **Yes** |
| `VITE_AUTH_USE_COOKIES` | `true` | Recommended |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe `pk_live_…` or `pk_test_…` | If using payments |
| `VITE_SENTRY_DSN` | Sentry DSN | Optional but recommended |

**Important:**
- Do **not** set `VITE_SEED_SUPPLIER_DIRECTORY=true` in production.
- Do **not** put Supabase **service_role** key here — only the **anon** key.

#### 3.3 Deploy

1. Click **Deploy** (or push to `main` if already connected — Vercel redeploys automatically).
2. Wait until the deployment shows **Ready**.
3. Open the Vercel URL (e.g. `https://strefex.vercel.app`) — you should see the login page.

#### 3.4 Connect your custom domain (when ready)

1. Vercel → **Settings** → **Domains** → add `app.strefex.com` (or your choice).
2. Copy the DNS records Vercel shows you.
3. In your domain registrar (GoDaddy, Cloudflare, etc.), add those DNS records.
4. Wait up to 24 hours for DNS (often 15–30 minutes).
5. Go back to **Step 2.3** and update Supabase Site URL to the final domain.

**You are done with Step 3 when:** Login page loads on HTTPS and shows no “auth not configured” error.

---

### STEP 4 — Set up Stripe (only if you charge for plans)

**Goal:** Users can pay; subscriptions update correctly.

#### 4.1 Stripe products

1. [dashboard.stripe.com](https://dashboard.stripe.com) → **Products** — create prices matching your plans (Basic, Standard, Premium, etc.).
2. Copy each **Price ID** (`price_…`).

#### 4.2 Keys in Vercel

Add to Vercel environment variables (Production):

- `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_live_…` (use `pk_test_…` while testing)

Server-side Stripe secrets go on the **backend** or Vercel serverless functions if you use them — never in the frontend.

#### 4.3 Webhook (needs backend URL — Step 5)

You will configure this after the API server is live:
- URL: `https://api.yourdomain.com/api/v1/billing/webhook`
- Events: subscription and checkout events (see DEPLOYMENT_AUDIT.md §3.4)

**Start with Stripe Test mode** until everything works, then switch to Live mode.

**You are done with Step 4 when:** Test payment completes and subscription status updates (may require Step 5).

---

### STEP 5 — Deploy the FastAPI backend (if you use it in production)

**Skip this step** if your production app uses **only Supabase** and you do not host the Python API.

**Goal:** API runs 24/7 with a real database and secure settings.

#### 5.1 Prepare a server

Common choices: Railway, Render, DigitalOcean App Platform, or Docker on a VPS.

You need:
- PostgreSQL database (can be Supabase Postgres connection string or separate DB)
- Optional: Redis for rate limiting (`REDIS_URL`)

#### 5.2 Set backend environment variables

Copy from `backend/.env.example`. **Minimum for production:**

| Variable | What to put |
|----------|-------------|
| `DEBUG` | `false` |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | Random string — run `openssl rand -hex 32` on a Mac/Linux terminal |
| `FRONTEND_URL` | `https://your-domain.com` |
| `CORS_ORIGINS` | `["https://your-domain.com"]` |
| `AUTH_USE_COOKIES` | `true` |
| `AUTH_COOKIE_SECURE` | `true` |
| `STRIPE_SECRET_KEY` | From Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook setup |
| `REDIS_URL` | If you have Redis |

#### 5.3 Run database migrations

On the server (or one-time job):

```bash
cd backend
alembic upgrade head
```

This updates the API database to the latest version (through migration **005**).

#### 5.4 Point the frontend at the API

In Vercel, add:

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | `https://api.yourdomain.com/api/v1` |

Redeploy Vercel after changing variables.

**You are done with Step 5 when:** Opening `https://api.yourdomain.com/health` returns OK (or docs work in staging).

---

### STEP 6 — Test everything like a real user

**Goal:** Find problems before customers do.

Use a **new email address** you have never registered before (e.g. `test+1@yourcompany.com`).

| # | Test | What should happen | Pass? |
|---|------|-------------------|-------|
| 1 | Open site in **Incognito/Private** window | Login page loads | ☐ |
| 2 | Register new account | Confirmation email arrives (check spam) | ☐ |
| 3 | Click confirm link in email | Account activates | ☐ |
| 4 | Log in | Main menu opens | ☐ |
| 5 | Log out | Returns to login; back button doesn’t stay logged in | ☐ |
| 6 | Wrong password | Clear error message, no crash | ☐ |
| 7 | Open Settings / Profile | Page loads | ☐ |
| 8 | Try a paid plan (test mode) | Stripe checkout opens and completes | ☐ |
| 9 | Superadmin email login | Admin areas visible only for your SA email | ☐ |
| 10 | Open site on phone | Layout usable | ☐ |

If anything fails, write down: **what you clicked**, **what you expected**, **what happened instead**, and a screenshot.

---

### STEP 7 — Final security checks (5 minutes)

- [ ] Supabase **service_role** key is **not** in Vercel or GitHub
- [ ] Stripe is in **Live mode** only when you intentionally switch from test
- [ ] `DEBUG=false` on production backend
- [ ] HTTPS works (padlock in browser)
- [ ] No demo/seed data flags enabled in production

---

### STEP 8 — Go live

1. Announce the URL to a **small group** first (pilot).
2. Watch for 24–48 hours:
   - Supabase → Authentication (new signups)
   - Stripe → Payments (if used)
   - Sentry → Errors (if configured)
3. Fix urgent issues before marketing to everyone.

**Congratulations — the platform is officially live** when Steps 1–7 pass and you accept real users.

---

## Part 3 — Quick reference: who fixes what?

| Problem | Likely place to look |
|---------|---------------------|
| “Auth not configured” on login | Vercel env: missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` |
| Email confirmation not arriving | Supabase → Auth → Email templates / SMTP settings |
| Login works locally but not on Vercel | Supabase redirect URLs don’t include production domain |
| Payments don’t activate plan | Stripe webhook not pointing to backend; check Stripe → Webhooks → logs |
| 404 on API calls | `VITE_API_BASE_URL` wrong or backend not deployed |
| User sees wrong company’s data | Escalate immediately — backend tenant bug |

---

## Part 4 — If you work with a developer

Send them:

1. This guide — which step you are on  
2. [DEPLOYMENT_AUDIT.md](./DEPLOYMENT_AUDIT.md) — for the full technical checklist  
3. [AUDIT_FIX_TRACKING.md](./AUDIT_FIX_TRACKING.md) — what was already fixed in code  

**Commands they may run locally:**

```bash
# Frontend checks
npm test
npm run build

# Backend checks (needs Postgres + Redis running)
cd backend && alembic upgrade head
DEBUG=true pytest tests/ -v
```

---

## Part 5 — Simple timeline suggestion

| Day | What you do |
|-----|-------------|
| **Day 1** | Steps 1–3 (GitHub CI, Supabase, Vercel deploy) |
| **Day 2** | Steps 4–5 if needed (Stripe + backend) |
| **Day 3** | Step 6 testing — fix issues |
| **Day 4** | Step 7–8 — pilot launch |

---

## Sign-off (print or copy)

| Step | Completed | Date |
|------|-----------|------|
| 1. CI green | ☐ | |
| 2. Supabase ready | ☐ | |
| 3. Vercel deployed | ☐ | |
| 4. Stripe (if used) | ☐ | |
| 5. Backend (if used) | ☐ | |
| 6. User tests passed | ☐ | |
| 7. Security checks | ☐ | |
| 8. Live | ☐ | |

**Approved by:** _________________________ **Date:** __________
