-- 010 — Team members SELECT policy hardening
-- Limit company-wide team visibility to privileged roles while still allowing
-- each user to read their own membership row.

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
