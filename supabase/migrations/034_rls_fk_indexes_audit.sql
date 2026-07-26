-- 034 — RLS audit helpers: FK indexes for tenant-scoped policies + RLS on newer tables

-- Indexes on company_id (and related FKs) used in RLS USING/WITH CHECK clauses
CREATE INDEX IF NOT EXISTS idx_team_members_company_id ON public.team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_company_id ON public.rfqs(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_procurement_items_company_id ON public.procurement_items(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_company_id ON public.vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_company_id ON public.service_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_company_id ON public.templates(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_production_data_company_id ON public.production_data(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_data_company_id ON public.cost_data(company_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_data_company_id ON public.enterprise_data(company_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_company_id ON public.file_metadata(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);

-- Tenant workspace snapshots (025) — ensure RLS + index if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenant_workspace_snapshots'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tenant_workspace_snapshots_company_id ON public.tenant_workspace_snapshots(company_id)';
    EXECUTE 'ALTER TABLE public.tenant_workspace_snapshots ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Management audit program tables (030+) — company-scoped read/write via get_my_company_id()
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'management_audits') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_management_audits_company_id ON public.management_audits(company_id)';
    EXECUTE 'ALTER TABLE public.management_audits ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'management_audit_plans') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_management_audit_plans_company_id ON public.management_audit_plans(company_id)';
    EXECUTE 'ALTER TABLE public.management_audit_plans ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'management_audit_directory') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_management_audit_directory_company_id ON public.management_audit_directory(company_id)';
    EXECUTE 'ALTER TABLE public.management_audit_directory ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

COMMENT ON INDEX idx_team_members_company_id IS 'RLS policy lookup — company_id = get_my_company_id()';
