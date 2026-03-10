-- 009 — Profiles SELECT policy hardening
-- Reduce intra-company PII exposure:
-- - every user can read their own profile
-- - company-wide profile reads require privileged company role
-- - platform-level auditors/superadmin keep global visibility

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
