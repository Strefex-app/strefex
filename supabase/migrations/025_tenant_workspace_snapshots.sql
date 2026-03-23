-- ============================================================
-- Tenant workspace snapshots — cross-device sync for Zustand/local data
-- One row per (company_id, state_key); payload is JSONB workspace slice.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_workspace_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  state_key     TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, state_key)
);

CREATE INDEX IF NOT EXISTS idx_tws_company ON public.tenant_workspace_snapshots (company_id);
CREATE INDEX IF NOT EXISTS idx_tws_company_key ON public.tenant_workspace_snapshots (company_id, state_key);

COMMENT ON TABLE public.tenant_workspace_snapshots IS
  'Company-scoped JSON blobs synced across web/PWA/mobile for the same Supabase account (via profiles.company_id).';

DROP TRIGGER IF EXISTS update_tenant_workspace_snapshots_updated_at ON public.tenant_workspace_snapshots;
CREATE TRIGGER update_tenant_workspace_snapshots_updated_at
  BEFORE UPDATE ON public.tenant_workspace_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.tenant_workspace_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace snapshots select" ON public.tenant_workspace_snapshots;
DROP POLICY IF EXISTS "Workspace snapshots insert" ON public.tenant_workspace_snapshots;
DROP POLICY IF EXISTS "Workspace snapshots update" ON public.tenant_workspace_snapshots;
DROP POLICY IF EXISTS "Workspace snapshots delete" ON public.tenant_workspace_snapshots;

CREATE POLICY "Workspace snapshots select"
  ON public.tenant_workspace_snapshots FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() IN ('superadmin', 'auditor_external')
  );

CREATE POLICY "Workspace snapshots insert"
  ON public.tenant_workspace_snapshots FOR INSERT
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "Workspace snapshots update"
  ON public.tenant_workspace_snapshots FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "Workspace snapshots delete"
  ON public.tenant_workspace_snapshots FOR DELETE
  USING (
    (company_id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'))
    OR public.get_my_role() = 'superadmin'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_workspace_snapshots TO authenticated;
