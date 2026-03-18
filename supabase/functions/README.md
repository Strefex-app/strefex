# Scheduled Jobs (Phase 2)

This folder contains cron-ready Supabase Edge Functions:

- `ingestion-processor`
  - Processes queued `supplier_raw_data` rows.
  - Normalizes and upserts into `suppliers`.
  - Marks records as processed.

- `rfq-deadline-reminders`
  - Scans `rfq_suppliers` with `invited/viewed` status.
  - Sends reminder entries to `notifications`.
  - Writes `rfq_deadline_reminders` audit rows.

## Required env vars

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

## Suggested cron schedule

- Ingestion: every 5 minutes
- RFQ reminders: every 15 minutes

Each scheduled HTTP call must include header:

`x-cron-secret: <CRON_SECRET>`
