-- ============================================================
-- Management Audit Pro — relational storage (company scoped)
-- Supplements tenant_workspace_snapshots audit_pro sync.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.management_audits (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  industry TEXT,
  audit_type TEXT,
  standard TEXT NOT NULL,
  supplier_ref TEXT,
  auditor_ref TEXT,
  secondary_auditor_ref TEXT,
  status TEXT NOT NULL DEFAULT 'Planned',
  planned_date DATE,
  completed_date DATE,
  next_audit_date DATE,
  scope TEXT,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit_days INT NOT NULL DEFAULT 1,
  language TEXT DEFAULT 'English',
  parent_audit_id TEXT,
  is_auto_planned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_management_audits_company ON public.management_audits (company_id);
CREATE INDEX IF NOT EXISTS idx_management_audits_company_date ON public.management_audits (company_id, planned_date);

DROP TRIGGER IF EXISTS update_management_audits_updated_at ON public.management_audits;
CREATE TRIGGER update_management_audits_updated_at
  BEFORE UPDATE ON public.management_audits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.management_audit_events (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  audit_id TEXT NOT NULL REFERENCES public.management_audits(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_name TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_management_audit_events_company ON public.management_audit_events (company_id);
CREATE INDEX IF NOT EXISTS idx_management_audit_events_audit ON public.management_audit_events (audit_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.management_audit_reminders (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  audit_id TEXT,
  finding_id TEXT,
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  reminder_type TEXT NOT NULL DEFAULT 'finding_due',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_management_audit_reminders_company ON public.management_audit_reminders (company_id);

ALTER TABLE public.management_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_audit_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "management_audits select" ON public.management_audits;
DROP POLICY IF EXISTS "management_audits insert" ON public.management_audits;
DROP POLICY IF EXISTS "management_audits update" ON public.management_audits;
DROP POLICY IF EXISTS "management_audits delete" ON public.management_audits;

CREATE POLICY "management_audits select"
  ON public.management_audits FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() IN ('superadmin', 'auditor_external')
  );

CREATE POLICY "management_audits insert"
  ON public.management_audits FOR INSERT
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "management_audits update"
  ON public.management_audits FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "management_audits delete"
  ON public.management_audits FOR DELETE
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

DROP POLICY IF EXISTS "management_audit_events select" ON public.management_audit_events;
DROP POLICY IF EXISTS "management_audit_events insert" ON public.management_audit_events;
DROP POLICY IF EXISTS "management_audit_events delete" ON public.management_audit_events;

CREATE POLICY "management_audit_events select"
  ON public.management_audit_events FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() IN ('superadmin', 'auditor_external')
  );

CREATE POLICY "management_audit_events insert"
  ON public.management_audit_events FOR INSERT
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "management_audit_events delete"
  ON public.management_audit_events FOR DELETE
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

DROP POLICY IF EXISTS "management_audit_reminders select" ON public.management_audit_reminders;
DROP POLICY IF EXISTS "management_audit_reminders insert" ON public.management_audit_reminders;
DROP POLICY IF EXISTS "management_audit_reminders update" ON public.management_audit_reminders;
DROP POLICY IF EXISTS "management_audit_reminders delete" ON public.management_audit_reminders;

CREATE POLICY "management_audit_reminders select"
  ON public.management_audit_reminders FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() IN ('superadmin', 'auditor_external')
  );

CREATE POLICY "management_audit_reminders insert"
  ON public.management_audit_reminders FOR INSERT
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "management_audit_reminders update"
  ON public.management_audit_reminders FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "management_audit_reminders delete"
  ON public.management_audit_reminders FOR DELETE
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.management_audits TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.management_audit_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.management_audit_reminders TO authenticated;
