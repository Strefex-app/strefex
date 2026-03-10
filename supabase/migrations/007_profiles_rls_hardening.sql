-- 007 — Profiles RLS hardening (tenant/role escalation prevention)
-- This migration prevents self-service escalation by locking down
-- `profiles.role` and `profiles.company_id` after initial bootstrap.

-- -------------------------------------------------------------------
-- Safer UPDATE policy for profiles
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- -------------------------------------------------------------------
-- Trigger guard: block role/company/email tampering after bootstrap
-- -------------------------------------------------------------------
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
  -- Service role (backend automation / webhooks) bypasses user-level guards.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Never allow changing ownership key.
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profiles.id is immutable';
  END IF;

  -- Superadmin is allowed to manage profiles through SQL tooling.
  IF my_role = 'superadmin' THEN
    RETURN NEW;
  END IF;

  -- Only the profile owner may update their own row.
  IF auth.uid() IS NULL OR OLD.id <> auth.uid() THEN
    RAISE EXCEPTION 'not allowed to modify this profile';
  END IF;

  -- One-time bootstrap:
  -- user confirms account and gets initial company_id/role assignment.
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

  -- Email is sourced from auth identity and must remain stable here.
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

-- -------------------------------------------------------------------
-- Notifications UPDATE hardening (explicit WITH CHECK)
-- -------------------------------------------------------------------
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
