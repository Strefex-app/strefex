-- Fix infinite RLS recursion on public.profiles after 045.
-- 045's profiles policy selected from profiles, and also selected companies whose
-- policy selected profiles again. Helpers below run as SECURITY DEFINER so they
-- do not re-enter row policies.

CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_auditee_company(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = p_company_id
      AND lower(coalesce(c.external_audit_assigned_auditor_email, ''))
        = lower(coalesce((SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()), ''))
  )
$$;

REVOKE ALL ON FUNCTION public.get_my_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;

REVOKE ALL ON FUNCTION public.is_assigned_auditee_company(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_assigned_auditee_company(UUID) TO authenticated;

DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (
    id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
    OR (
      public.get_my_role() = 'auditor_external'
      AND public.is_assigned_auditee_company(id)
    )
  );

DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select hardened" ON public.profiles;
CREATE POLICY "Users can view profiles in their company"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR (
      company_id = public.get_my_company_id()
      AND public.get_my_role() IN ('admin', 'manager', 'auditor_internal')
    )
    OR public.get_my_role() = 'superadmin'
    OR (
      public.get_my_role() = 'auditor_external'
      AND public.is_assigned_auditee_company(company_id)
    )
  );
