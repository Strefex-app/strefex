-- Documents workspace snapshot usage for Audit Pro (no schema change).
-- Client sync key `audit_pro` stores audits, auditors, suppliers, audit activity rows, reminders.

COMMENT ON TABLE public.tenant_workspace_snapshots IS
  'Company-scoped JSON blobs synced across clients (profiles.company_id). Keys include audit_pro (Management Audit Pro: audits, auditors, suppliers, auditLogs, reminders).';
