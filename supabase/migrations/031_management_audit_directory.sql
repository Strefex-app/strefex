-- ============================================================
-- Audit Management: curated auditor/supplier roster per tenant
-- Mirrors Zustand auditProStore auditors/suppliers for Supabase-backed sync.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.management_audit_directory (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_kind TEXT NOT NULL CHECK (entry_kind IN ('auditor', 'supplier')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_management_audit_directory_company
  ON public.management_audit_directory (company_id);

CREATE INDEX IF NOT EXISTS idx_management_audit_directory_company_kind
  ON public.management_audit_directory (company_id, entry_kind);

COMMENT ON TABLE public.management_audit_directory IS
  'Buyer/tenant curated Audit Pro registry (auditors and suppliers available for audits). Managed from app; merges with workspace snapshot offline.';

DROP TRIGGER IF EXISTS update_management_audit_directory_updated_at ON public.management_audit_directory;
CREATE TRIGGER update_management_audit_directory_updated_at
  BEFORE UPDATE ON public.management_audit_directory
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.management_audit_directory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "management_audit_directory select" ON public.management_audit_directory;
DROP POLICY IF EXISTS "management_audit_directory insert" ON public.management_audit_directory;
DROP POLICY IF EXISTS "management_audit_directory update" ON public.management_audit_directory;
DROP POLICY IF EXISTS "management_audit_directory delete" ON public.management_audit_directory;

CREATE POLICY "management_audit_directory select"
  ON public.management_audit_directory FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() IN ('superadmin', 'auditor_external')
  );

CREATE POLICY "management_audit_directory insert"
  ON public.management_audit_directory FOR INSERT
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "management_audit_directory update"
  ON public.management_audit_directory FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "management_audit_directory delete"
  ON public.management_audit_directory FOR DELETE
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.management_audit_directory TO authenticated;

NOTIFY pgrst, 'reload schema';
