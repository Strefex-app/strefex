-- Badges, deadline vs plan date, scoped auditor RPC, anonymous seller notify.
-- Apply after 044. Safe if 044 was already run.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS strefex_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS strefex_verified_at TIMESTAMPTZ;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS strefex_verified_by_email TEXT;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS onsite_audit_completed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS onsite_audit_completed_at TIMESTAMPTZ;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS external_audit_deadline_at DATE;

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

ALTER TABLE public.management_audits
  ADD COLUMN IF NOT EXISTS deadline_date DATE;

-- Scope company directory: external auditors only see assigned auditees.
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (
    id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
    OR (
      public.get_my_role() = 'auditor_external'
      AND lower(coalesce(external_audit_assigned_auditor_email, ''))
        = lower(coalesce((SELECT email FROM public.profiles WHERE id = auth.uid()), ''))
    )
  );

DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
CREATE POLICY "Users can view profiles in their company"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
    OR (
      public.get_my_role() = 'auditor_external'
      AND company_id IN (
        SELECT c.id
        FROM public.companies c
        WHERE lower(coalesce(c.external_audit_assigned_auditor_email, ''))
          = lower(coalesce((SELECT email FROM public.profiles WHERE id = auth.uid()), ''))
      )
    )
  );

DROP FUNCTION IF EXISTS public.set_company_external_audit(UUID, TEXT, TEXT, DATE, TIMESTAMPTZ, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.set_company_external_audit(
  p_company_id UUID,
  p_status TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_planned_at DATE DEFAULT NULL,
  p_deadline_at DATE DEFAULT NULL,
  p_auditor_email TEXT DEFAULT NULL,
  p_auditor_name TEXT DEFAULT NULL,
  p_strefex_verified BOOLEAN DEFAULT NULL,
  p_complete_onsite BOOLEAN DEFAULT NULL
)
RETURNS public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  caller_email TEXT;
  current_row public.companies;
  next_status TEXT;
  auditor_email TEXT;
  planned DATE;
  deadline DATE;
  row_out public.companies;
BEGIN
  caller_role := public.get_my_role();
  SELECT email INTO caller_email FROM public.profiles WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role NOT IN ('superadmin', 'auditor_external') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT * INTO current_row FROM public.companies WHERE id = p_company_id;
  IF current_row.id IS NULL THEN
    RAISE EXCEPTION 'company not found';
  END IF;

  next_status := lower(trim(coalesce(p_status, current_row.external_audit_status, 'none')));
  IF next_status NOT IN ('none', 'pending', 'planned', 'confirmed', 'passed', 'failed') THEN
    RAISE EXCEPTION 'invalid audit status';
  END IF;

  auditor_email := nullif(lower(trim(coalesce(p_auditor_email, current_row.external_audit_assigned_auditor_email, ''))), '');
  planned := coalesce(p_planned_at, current_row.external_audit_planned_at);
  deadline := current_row.external_audit_deadline_at;

  IF caller_role = 'superadmin' THEN
    deadline := p_deadline_at;
  ELSE
    IF coalesce(current_row.external_audit_assigned_auditor_email, '') <> ''
       AND lower(current_row.external_audit_assigned_auditor_email) IS DISTINCT FROM lower(coalesce(caller_email, '')) THEN
      RAISE EXCEPTION 'not assigned to this company';
    END IF;
    auditor_email := lower(coalesce(caller_email, ''));
    IF next_status IN ('passed', 'failed', 'none') AND coalesce(p_complete_onsite, FALSE) IS NOT TRUE THEN
      RAISE EXCEPTION 'auditors can only plan visits, not certify or clear the file';
    END IF;
    IF next_status NOT IN ('pending', 'planned', 'confirmed', 'passed') THEN
      RAISE EXCEPTION 'invalid auditor status';
    END IF;
    IF coalesce(p_complete_onsite, FALSE) THEN
      next_status := 'passed';
    ELSIF next_status = 'passed' THEN
      RAISE EXCEPTION 'use complete on-site to mark the visit done';
    END IF;
  END IF;

  IF next_status IN ('planned', 'confirmed') THEN
    IF planned IS NULL THEN
      RAISE EXCEPTION 'planned date required';
    END IF;
    IF deadline IS NOT NULL AND planned > deadline THEN
      RAISE EXCEPTION 'planned date cannot be after the STREFEX deadline';
    END IF;
    IF auditor_email IS NULL OR auditor_email = '' THEN
      RAISE EXCEPTION 'assign an auditor before planning';
    END IF;
  END IF;

  UPDATE public.companies
  SET
    external_audit_status = next_status,
    external_audit_notes = CASE
      WHEN caller_role = 'superadmin' THEN nullif(trim(coalesce(p_notes, '')), '')
      ELSE current_row.external_audit_notes
    END,
    external_audit_planned_at = planned,
    external_audit_deadline_at = deadline,
    external_audit_passed_at = CASE
      WHEN next_status = 'passed' OR coalesce(p_complete_onsite, FALSE) THEN coalesce(current_row.external_audit_passed_at, now())
      WHEN caller_role = 'superadmin' AND next_status <> 'passed' THEN NULL
      ELSE current_row.external_audit_passed_at
    END,
    external_audit_assigned_auditor_email = nullif(auditor_email, ''),
    external_audit_assigned_auditor_name = CASE
      WHEN caller_role = 'superadmin' THEN nullif(trim(coalesce(p_auditor_name, '')), '')
      ELSE coalesce(nullif(trim(coalesce(p_auditor_name, '')), ''), current_row.external_audit_assigned_auditor_name)
    END,
    external_audit_assigned_at = CASE WHEN nullif(auditor_email, '') IS NULL THEN NULL ELSE coalesce(current_row.external_audit_assigned_at, now()) END,
    external_audit_assigned_by_email = CASE
      WHEN nullif(auditor_email, '') IS NULL THEN NULL
      ELSE coalesce(current_row.external_audit_assigned_by_email, caller_email)
    END,
    strefex_verified = CASE
      WHEN caller_role = 'superadmin' AND p_strefex_verified IS NOT NULL THEN p_strefex_verified
      ELSE current_row.strefex_verified
    END,
    strefex_verified_at = CASE
      WHEN caller_role = 'superadmin' AND p_strefex_verified IS TRUE THEN coalesce(current_row.strefex_verified_at, now())
      WHEN caller_role = 'superadmin' AND p_strefex_verified IS FALSE THEN NULL
      ELSE current_row.strefex_verified_at
    END,
    strefex_verified_by_email = CASE
      WHEN caller_role = 'superadmin' AND p_strefex_verified IS TRUE THEN caller_email
      WHEN caller_role = 'superadmin' AND p_strefex_verified IS FALSE THEN NULL
      ELSE current_row.strefex_verified_by_email
    END,
    visibility_tier = CASE
      WHEN caller_role = 'superadmin' AND p_strefex_verified IS TRUE THEN 'verified'
      ELSE visibility_tier
    END,
    onsite_audit_completed = CASE
      WHEN coalesce(p_complete_onsite, FALSE) OR next_status = 'passed' THEN TRUE
      WHEN caller_role = 'superadmin' AND next_status IN ('none', 'pending', 'failed') THEN FALSE
      ELSE current_row.onsite_audit_completed
    END,
    onsite_audit_completed_at = CASE
      WHEN coalesce(p_complete_onsite, FALSE) OR next_status = 'passed' THEN coalesce(current_row.onsite_audit_completed_at, now())
      WHEN caller_role = 'superadmin' AND next_status IN ('none', 'pending', 'failed') THEN NULL
      ELSE current_row.onsite_audit_completed_at
    END,
    updated_at = now()
  WHERE id = p_company_id
  RETURNING * INTO row_out;

  RETURN row_out;
END;
$$;

REVOKE ALL ON FUNCTION public.set_company_external_audit(UUID, TEXT, TEXT, DATE, DATE, TEXT, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_company_external_audit(UUID, TEXT, TEXT, DATE, DATE, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_company_audit_plan(
  p_company_id UUID,
  p_seller_email TEXT,
  p_auditor_email TEXT,
  p_seller_title TEXT,
  p_seller_message TEXT,
  p_auditor_title TEXT,
  p_auditor_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  caller_email TEXT;
  assigned TEXT;
BEGIN
  caller_role := public.get_my_role();
  SELECT email INTO caller_email FROM public.profiles WHERE id = auth.uid();
  SELECT lower(coalesce(external_audit_assigned_auditor_email, ''))
    INTO assigned
    FROM public.companies
    WHERE id = p_company_id;

  IF caller_role IS NULL OR caller_role NOT IN ('superadmin', 'auditor_external') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF caller_role = 'auditor_external'
     AND assigned <> ''
     AND assigned IS DISTINCT FROM lower(coalesce(caller_email, '')) THEN
    RAISE EXCEPTION 'not assigned to this company';
  END IF;

  IF nullif(lower(trim(coalesce(p_seller_email, ''))), '') IS NOT NULL THEN
    INSERT INTO public.notifications (company_id, type, title, message, priority, from_email, target_email, read, created_at)
    VALUES (
      p_company_id,
      'audit_plan_seller',
      p_seller_title,
      p_seller_message,
      'normal',
      'platform@strefex.com',
      lower(trim(p_seller_email)),
      FALSE,
      now()
    );
  END IF;

  IF nullif(lower(trim(coalesce(p_auditor_email, ''))), '') IS NOT NULL
     AND lower(trim(p_auditor_email)) IS DISTINCT FROM lower(trim(coalesce(p_seller_email, ''))) THEN
    INSERT INTO public.notifications (company_id, type, title, message, priority, from_email, target_email, read, created_at)
    VALUES (
      p_company_id,
      'audit_plan_assigned',
      p_auditor_title,
      p_auditor_message,
      'normal',
      'platform@strefex.com',
      lower(trim(p_auditor_email)),
      FALSE,
      now()
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_company_audit_plan(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_company_audit_plan(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Tenant insert" ON public.notifications;
CREATE POLICY "Tenant insert"
  ON public.notifications FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      profile_id = auth.uid()
      OR company_id = public.get_my_company_id()
      OR public.get_my_role() = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Tenant isolation" ON public.notifications;
CREATE POLICY "Tenant isolation"
  ON public.notifications FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    OR profile_id = auth.uid()
    OR lower(coalesce(target_email, '')) = lower(coalesce((SELECT email FROM public.profiles WHERE id = auth.uid()), ''))
    OR public.get_my_role() = 'superadmin'
  );

NOTIFY pgrst, 'reload schema';
