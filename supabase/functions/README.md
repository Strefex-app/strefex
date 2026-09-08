# Scheduled Jobs (Phase 2) + outbound mail

This folder contains cron-ready Supabase Edge Functions:

- `ingestion-processor`
  - Processes queued `supplier_raw_data` rows.
  - Normalizes and upserts into `suppliers`.
  - Marks records as processed.

- `rfq-deadline-reminders`
  - Scans `rfq_suppliers` with `invited/viewed` status.
  - Sends reminder entries to `notifications`.
  - Writes `rfq_deadline_reminders` audit rows.

- `send-seller-invite`
  - Authenticated seller growth invites.
  - Upserts `seller_growth_invites`.
  - Sends email via **Resend** from `invites@strefex.pro` (configurable).

## Required env vars (cron jobs)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

## Required secrets for `send-seller-invite`

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set RESEND_FROM_EMAIL=invites@strefex.pro
supabase secrets set RESEND_FROM_NAME=STREFEX
supabase secrets set APP_ORIGIN=https://strefex.pro
```

Also ensure `strefex.pro` is verified in the Resend dashboard.

Deploy:

```bash
supabase db push   # applies 039_seller_growth_invites.sql
supabase functions deploy send-seller-invite
```

## Suggested cron schedule

- Ingestion: every 5 minutes
- RFQ reminders: every 15 minutes

Each scheduled HTTP call must include header:

`x-cron-secret: <CRON_SECRET>`
