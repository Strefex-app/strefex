-- 012 — Security hardening rollup bundle
-- Purpose: one paste-ready SQL bundle for Supabase SQL Editor.
-- Scope: includes hardening from 007..011 in safe execution order.

-- ===================================================================
-- 007 — Profiles RLS hardening
-- ===================================================================
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_role text := public.get_my_role();
  bootstrap_allowed boolean := false;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profiles.id is immutable';
  END IF;

  IF my_role = 'superadmin' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR OLD.id <> auth.uid() THEN
    RAISE EXCEPTION 'not allowed to modify this profile';
  END IF;

  bootstrap_allowed :=
    OLD.company_id IS NULL
    AND NEW.company_id IS NOT NULL
    AND OLD.role = 'user'
    AND NEW.role IN ('user', 'admin', 'manager', 'auditor_internal');

  IF NOT bootstrap_allowed THEN
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'company_id cannot be changed by this user';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'role cannot be changed by this user';
    END IF;
  END IF;

  IF lower(coalesce(NEW.email, '')) <> lower(coalesce(OLD.email, '')) THEN
    RAISE EXCEPTION 'email cannot be changed in profiles';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_guard_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_sensitive_fields();

DROP POLICY IF EXISTS "Tenant update" ON public.notifications;
CREATE POLICY "Tenant update"
  ON public.notifications
  FOR UPDATE
  USING (
    profile_id = auth.uid()
    OR company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  )
  WITH CHECK (
    profile_id = auth.uid()
    OR company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

-- ===================================================================
-- 008 — Companies INSERT policy hardening
-- ===================================================================
DROP POLICY IF EXISTS "Superadmin can insert companies" ON public.companies;

CREATE POLICY "Bootstrap or superadmin can insert companies"
  ON public.companies
  FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'superadmin'
    OR (
      auth.uid() IS NOT NULL
      AND public.get_my_company_id() IS NULL
    )
  );

-- ===================================================================
-- 009 — Profiles SELECT policy hardening
-- ===================================================================
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;

CREATE POLICY "Profiles select hardened"
  ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR (
      company_id = public.get_my_company_id()
      AND public.get_my_role() IN ('admin', 'manager', 'auditor_internal')
    )
    OR public.get_my_role() IN ('superadmin', 'auditor_external')
  );

-- ===================================================================
-- 010 — Team members SELECT policy hardening
-- ===================================================================
DROP POLICY IF EXISTS "Tenant isolation" ON public.team_members;

CREATE POLICY "Team members select hardened"
  ON public.team_members
  FOR SELECT
  USING (
    profile_id = auth.uid()
    OR (
      company_id = public.get_my_company_id()
      AND public.get_my_role() IN ('admin', 'manager', 'auditor_internal')
    )
    OR public.get_my_role() IN ('superadmin', 'auditor_external')
  );

-- ===================================================================
-- 011 — Tenant UPDATE WITH CHECK hardening
-- ===================================================================
DROP POLICY IF EXISTS "Tenant update" ON public.projects;
CREATE POLICY "Tenant update" ON public.projects FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

DROP POLICY IF EXISTS "Tenant update" ON public.rfqs;
CREATE POLICY "Tenant update" ON public.rfqs FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

DROP POLICY IF EXISTS "Tenant update" ON public.contracts;
CREATE POLICY "Tenant update" ON public.contracts FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

DROP POLICY IF EXISTS "Tenant update" ON public.procurement_items;
CREATE POLICY "Tenant update" ON public.procurement_items FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

DROP POLICY IF EXISTS "Tenant update" ON public.vendors;
CREATE POLICY "Tenant update" ON public.vendors FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

DROP POLICY IF EXISTS "Tenant update" ON public.transactions;
CREATE POLICY "Tenant update" ON public.transactions FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

DROP POLICY IF EXISTS "Tenant update" ON public.service_requests;
CREATE POLICY "Tenant update" ON public.service_requests FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

DROP POLICY IF EXISTS "Tenant update" ON public.templates;
CREATE POLICY "Tenant update" ON public.templates FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

DROP POLICY IF EXISTS "Tenant update" ON public.wallet_accounts;
CREATE POLICY "Tenant update" ON public.wallet_accounts FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

DROP POLICY IF EXISTS "Tenant update" ON public.escrow_transactions;
CREATE POLICY "Tenant update" ON public.escrow_transactions FOR UPDATE
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Admins can update team" ON public.team_members;
CREATE POLICY "Admins can update team" ON public.team_members FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('superadmin', 'admin')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('superadmin', 'admin')
  );

DROP POLICY IF EXISTS "Tenant update" ON public.production_data;
CREATE POLICY "Tenant update" ON public.production_data FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

DROP POLICY IF EXISTS "Tenant update" ON public.cost_data;
CREATE POLICY "Tenant update" ON public.cost_data FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

DROP POLICY IF EXISTS "Tenant update" ON public.enterprise_data;
CREATE POLICY "Tenant update" ON public.enterprise_data FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );
