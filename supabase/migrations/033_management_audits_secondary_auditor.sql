-- Optional secondary auditor on management audit plans.
-- Requires public.management_audits (see 030_management_audit_program.sql). If you only see
-- "relation management_audits does not exist", run 030 first in the SQL editor or via `supabase db push`.
ALTER TABLE public.management_audits
  ADD COLUMN IF NOT EXISTS secondary_auditor_ref TEXT;
