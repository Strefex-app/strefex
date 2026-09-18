-- External audit scheduling: planned/confirmed + date + assigned auditor.
-- Superadmin and platform auditors can set these fields via RPC.
-- Sellers and assigned auditors receive in-app notifications (target_email).

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS external_audit_planned_at DATE;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS external_audit_assigned_auditor_email TEXT;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS external_audit_assigned_auditor_name TEXT;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS external_audit_assigned_at TIMESTAMPTZ;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS external_audit_assigned_by_email TEXT;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_external_audit_status_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_external_audit_status_check
  CHECK (external_audit_status IN (
    'none',
    'pending',
    'planned',
    'confirmed',
    'passed',
    'failed'
  ));

CREATE INDEX IF NOT EXISTS idx_companies_external_audit_status
  ON public.companies (external_audit_status);

CREATE INDEX IF NOT EXISTS idx_companies_external_audit_auditor
  ON public.companies (external_audit_assigned_auditor_email);

CREATE OR REPLACE FUNCTION public.set_company_external_audit(
  p_company_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL,
  p_planned_at DATE DEFAULT NULL,
  p_passed_at TIMESTAMPTZ DEFAULT NULL,
  p_auditor_email TEXT DEFAULT NULL,
  p_auditor_name TEXT DEFAULT NULL
)
RETURNS public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  caller_email TEXT;
  next_status TEXT;
  auditor_email TEXT;
  row_out public.companies;
BEGIN
  caller_role := public.get_my_role();
  IF caller_role IS NULL OR caller_role NOT IN ('superadmin', 'auditor_external') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  next_status := lower(trim(coalesce(p_status, 'none')));
  IF next_status NOT IN ('none', 'pending', 'planned', 'confirmed', 'passed', 'failed') THEN
    RAISE EXCEPTION 'invalid audit status';
  END IF;

  auditor_email := nullif(lower(trim(coalesce(p_auditor_email, ''))), '');
  SELECT email INTO caller_email FROM public.profiles WHERE id = auth.uid();

  UPDATE public.companies
  SET
    external_audit_status = next_status,
    external_audit_notes = nullif(trim(coalesce(p_notes, '')), ''),
    external_audit_planned_at = CASE
      WHEN next_status IN ('planned', 'confirmed') THEN p_planned_at
      ELSE p_planned_at
    END,
    external_audit_passed_at = CASE
      WHEN next_status = 'passed' THEN coalesce(p_passed_at, now())
      ELSE NULL
    END,
    external_audit_assigned_auditor_email = auditor_email,
    external_audit_assigned_auditor_name = nullif(trim(coalesce(p_auditor_name, '')), ''),
    external_audit_assigned_at = CASE WHEN auditor_email IS NULL THEN NULL ELSE now() END,
    external_audit_assigned_by_email = CASE WHEN auditor_email IS NULL THEN NULL ELSE caller_email END,
    visibility_tier = CASE
      WHEN next_status = 'passed' THEN 'verified'
      ELSE visibility_tier
    END,
    updated_at = now()
  WHERE id = p_company_id
  RETURNING * INTO row_out;

  IF row_out.id IS NULL THEN
    RAISE EXCEPTION 'company not found';
  END IF;

  RETURN row_out;
END;
$$;

REVOKE ALL ON FUNCTION public.set_company_external_audit(UUID, TEXT, TEXT, DATE, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_company_external_audit(UUID, TEXT, TEXT, DATE, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Tenant insert" ON public.notifications;
CREATE POLICY "Tenant insert"
  ON public.notifications FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      profile_id = auth.uid()
      OR company_id = public.get_my_company_id()
      OR public.get_my_role() IN ('superadmin', 'auditor_external')
    )
  );

DROP POLICY IF EXISTS "Tenant isolation" ON public.notifications;
CREATE POLICY "Tenant isolation"
  ON public.notifications FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    OR profile_id = auth.uid()
    OR lower(coalesce(target_email, '')) = lower(coalesce((SELECT email FROM public.profiles WHERE id = auth.uid()), ''))
    OR public.get_my_role() IN ('superadmin', 'auditor_external')
  );

NOTIFY pgrst, 'reload schema';
