-- 037 — Lock profile bootstrap to a company the user created or was invited to.
-- Also stamp companies.created_by so ownership is not inferred from email.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies(created_by);

CREATE OR REPLACE FUNCTION public.stamp_company_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_company_created_by ON public.companies;
CREATE TRIGGER trg_stamp_company_created_by
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_company_created_by();

CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_role text := public.get_my_role();
  owns_company boolean := false;
  invited_role text := NULL;
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

  IF lower(coalesce(NEW.email, '')) <> lower(coalesce(OLD.email, '')) THEN
    RAISE EXCEPTION 'email cannot be changed in profiles';
  END IF;

  -- One-time join: only a company this user created, or a pending/active invite.
  IF OLD.company_id IS NULL AND NEW.company_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = NEW.company_id
        AND c.created_by = auth.uid()
    ) INTO owns_company;

    SELECT tm.role
    INTO invited_role
    FROM public.team_members tm
    WHERE tm.company_id = NEW.company_id
      AND lower(tm.email) = lower(NEW.email)
      AND tm.status IN ('pending', 'active')
    ORDER BY tm.invited_at DESC NULLS LAST
    LIMIT 1;

    IF owns_company THEN
      IF NEW.role IS NULL OR NEW.role NOT IN ('user', 'admin', 'manager') THEN
        NEW.role := 'admin';
      END IF;
    ELSIF invited_role IS NOT NULL THEN
      IF invited_role NOT IN ('user', 'admin', 'manager', 'auditor_internal') THEN
        invited_role := 'user';
      END IF;
      NEW.role := invited_role;
      UPDATE public.team_members
      SET
        status = 'active',
        profile_id = NEW.id,
        accepted_at = COALESCE(accepted_at, NOW())
      WHERE company_id = NEW.company_id
        AND lower(email) = lower(NEW.email)
        AND status = 'pending';
    ELSE
      RAISE EXCEPTION 'company_id must be a company you created or were invited to';
    END IF;
  ELSIF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'company_id cannot be changed by this user';
  ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role cannot be changed by this user';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.search_suppliers(
    TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER, INTEGER
  ) FROM anon;
  GRANT EXECUTE ON FUNCTION public.search_suppliers(
    TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER, INTEGER
  ) TO authenticated, service_role;
EXCEPTION
  WHEN undefined_function THEN
    NULL;
END $$;

NOTIFY pgrst, 'reload schema';
