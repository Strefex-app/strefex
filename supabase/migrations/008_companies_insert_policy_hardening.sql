-- 008 — Companies INSERT policy hardening
-- Prevent authenticated users who already belong to a company
-- from creating additional companies directly via anon/auth clients.

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
