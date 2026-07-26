# Infrastructure roadmap (Management UX follow-up)

Items requested alongside the Management hub restructure. Stripe **plan prices and tier limits** stay unchanged in `src/services/stripeService.js`.

## Done in this pass

| Item | Location |
|------|----------|
| FK indexes for RLS `company_id` lookups | `supabase/migrations/034_rls_fk_indexes_audit.sql` |
| Stripe webhook idempotency (event id ledger) | `backend/app/models/stripe_webhook_event.py`, `backend/app/repositories/stripe_webhook.py`, `backend/app/api/v1/billing.py`, Alembic `006` |

## Next steps (ops / backend)

### Supabase RLS on every table

- Core schema (`001_initial_schema.sql`) already enables RLS on primary tenant tables.
- Migration `034` adds indexes and enables RLS on newer audit/snapshot tables where missing.
- **Remaining:** audit each migration-added table for explicit `SELECT`/`INSERT`/`UPDATE` policies (not just `ENABLE ROW LEVEL SECURITY`). Track in a checklist per table.

### Connection pooling (Supavisor / PgBouncer)

- In Supabase Dashboard: **Project Settings → Database → Connection pooling** — use the **pooled** connection string (port 6543) for serverless/edge functions and high-concurrency API workers.
- For the FastAPI backend (`backend/app/database.py`), point `DATABASE_URL` at the pooler in production; keep direct connection for Alembic migrations only.

### Background jobs (Spend Analysis, AI Insights)

- Move heavy aggregations off the request path:
  1. Add a `report_jobs` queue table or use Supabase Edge Functions + cron.
  2. API returns job id + cached snapshot; UI polls or subscribes via realtime.
  3. Seed jobs on data change (procurement PO, spend import) rather than on every page load.

Suggested first job: **Spend Analysis rollup** — nightly + on-demand refresh per company.
