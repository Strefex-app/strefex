-- ============================================================
-- Auto-sync new web signups into superadmin platform registries:
--   buyers  → platform_directory_contacts
--   sellers → platform_registered_suppliers
-- Runs via existing profiles INSERT/UPDATE directory sync trigger.
-- ============================================================

ALTER TABLE public.platform_directory_contacts
  ADD COLUMN IF NOT EXISTS registry_source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.platform_directory_contacts
  DROP CONSTRAINT IF EXISTS platform_directory_contacts_registry_source_check;

ALTER TABLE public.platform_directory_contacts
  ADD CONSTRAINT platform_directory_contacts_registry_source_check
  CHECK (registry_source IN (
    'web_signup',
    'spreadsheet_import',
    'manual'
  ));

CREATE INDEX IF NOT EXISTS idx_platform_directory_registry_source
  ON public.platform_directory_contacts (registry_source);

COMMENT ON COLUMN public.platform_directory_contacts.registry_source IS
  'web_signup: synced from auth profile; spreadsheet_import: file import; manual: superadmin form.';

-- ── Buyers → platform_directory_contacts ───────────────────────
CREATE OR REPLACE FUNCTION public.sync_platform_directory_from_profile(p_profile_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.profiles%ROWTYPE;
  c public.companies%ROWTYPE;
  v_industry TEXT;
BEGIN
  SELECT * INTO r FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND OR r.company_id IS NULL THEN
    RETURN;
  END IF;

  IF r.role IS NULL OR r.role NOT IN ('admin', 'superadmin') THEN
    RETURN;
  END IF;

  SELECT * INTO c FROM public.companies WHERE id = r.company_id;
  IF NOT FOUND OR c.account_type IS DISTINCT FROM 'buyer' THEN
    RETURN;
  END IF;

  v_industry := CASE
    WHEN jsonb_typeof(c.industries) = 'array' AND jsonb_array_length(c.industries) > 0
      THEN NULLIF(TRIM(c.industries->>0), '')
    ELSE NULLIF(TRIM(COALESCE(r.metadata->>'industry', '')), '')
  END;

  IF EXISTS (
    SELECT 1
    FROM public.platform_directory_contacts p
    WHERE (p.metadata->>'synced_profile_id') = p_profile_id::text
      AND p.registry_source = 'web_signup'
  ) THEN
    UPDATE public.platform_directory_contacts p
    SET
      segment = COALESCE(v_industry, 'Web signup'),
      company_name = COALESCE(NULLIF(TRIM(c.name), ''), p.company_name),
      country = COALESCE(NULLIF(TRIM(c.country), ''), p.country, 'Russia'),
      contact_name = NULLIF(TRIM(r.full_name), ''),
      email = NULLIF(LOWER(TRIM(r.email)), ''),
      phone = NULLIF(TRIM(COALESCE(r.phone, c.phone)), ''),
      website = NULLIF(TRIM(c.website), ''),
      source_ref = 'auth:web_signup',
      updated_at = now(),
      metadata = COALESCE(p.metadata, '{}'::jsonb) || jsonb_build_object(
        'synced_profile_id', p_profile_id::text,
        'synced_company_id', c.id::text,
        'synced_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    WHERE (p.metadata->>'synced_profile_id') = p_profile_id::text
      AND p.registry_source = 'web_signup';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.platform_directory_contacts p
    WHERE p.registry_source = 'web_signup'
      AND p.email IS NOT NULL
      AND LOWER(p.email) = LOWER(TRIM(r.email))
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.platform_directory_contacts (
    segment,
    company_name,
    country,
    contact_name,
    email,
    phone,
    website,
    source_ref,
    registry_source,
    metadata
  ) VALUES (
    COALESCE(v_industry, 'Web signup'),
    COALESCE(NULLIF(TRIM(c.name), ''), split_part(r.email, '@', 1)),
    COALESCE(NULLIF(TRIM(c.country), ''), 'Russia'),
    NULLIF(TRIM(r.full_name), ''),
    NULLIF(LOWER(TRIM(r.email)), ''),
    NULLIF(TRIM(COALESCE(r.phone, c.phone)), ''),
    NULLIF(TRIM(c.website), ''),
    'auth:web_signup',
    'web_signup',
    jsonb_build_object(
      'synced_profile_id', p_profile_id::text,
      'synced_company_id', c.id::text,
      'synced_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_platform_directory_from_profile(UUID) FROM PUBLIC;

-- ── Sellers → platform_registered_suppliers ────────────────────
CREATE OR REPLACE FUNCTION public.sync_platform_registered_supplier_from_profile(p_profile_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.profiles%ROWTYPE;
  c public.companies%ROWTYPE;
  v_industry TEXT;
BEGIN
  SELECT * INTO r FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND OR r.company_id IS NULL THEN
    RETURN;
  END IF;

  IF r.role IS NULL OR r.role NOT IN ('admin', 'superadmin') THEN
    RETURN;
  END IF;

  SELECT * INTO c FROM public.companies WHERE id = r.company_id;
  IF NOT FOUND OR c.account_type IS DISTINCT FROM 'seller' THEN
    RETURN;
  END IF;

  v_industry := CASE
    WHEN jsonb_typeof(c.industries) = 'array' AND jsonb_array_length(c.industries) > 0
      THEN NULLIF(TRIM(c.industries->>0), '')
    ELSE NULLIF(TRIM(COALESCE(r.metadata->>'industry', '')), '')
  END;

  IF EXISTS (
    SELECT 1
    FROM public.platform_registered_suppliers s
    WHERE (s.metadata->>'synced_profile_id') = p_profile_id::text
      AND s.registry_source = 'web_signup'
  ) THEN
    UPDATE public.platform_registered_suppliers s
    SET
      segment = COALESCE(v_industry, 'Web signup'),
      company_name = COALESCE(NULLIF(TRIM(c.name), ''), s.company_name),
      industry = v_industry,
      country = COALESCE(NULLIF(TRIM(c.country), ''), s.country, 'China'),
      contact_name = NULLIF(TRIM(r.full_name), ''),
      email = NULLIF(LOWER(TRIM(r.email)), ''),
      phone = NULLIF(TRIM(COALESCE(r.phone, c.phone)), ''),
      website = NULLIF(TRIM(c.website), ''),
      source_ref = 'auth:web_signup',
      updated_at = now(),
      metadata = COALESCE(s.metadata, '{}'::jsonb) || jsonb_build_object(
        'synced_profile_id', p_profile_id::text,
        'synced_company_id', c.id::text,
        'synced_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    WHERE (s.metadata->>'synced_profile_id') = p_profile_id::text
      AND s.registry_source = 'web_signup';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.platform_registered_suppliers s
    WHERE s.registry_source = 'web_signup'
      AND s.email IS NOT NULL
      AND LOWER(s.email) = LOWER(TRIM(r.email))
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.platform_registered_suppliers (
    segment,
    company_name,
    industry,
    country,
    contact_name,
    email,
    phone,
    website,
    source_ref,
    registry_source,
    metadata
  ) VALUES (
    COALESCE(v_industry, 'Web signup'),
    COALESCE(NULLIF(TRIM(c.name), ''), split_part(r.email, '@', 1)),
    v_industry,
    COALESCE(NULLIF(TRIM(c.country), ''), 'China'),
    NULLIF(TRIM(r.full_name), ''),
    NULLIF(LOWER(TRIM(r.email)), ''),
    NULLIF(TRIM(COALESCE(r.phone, c.phone)), ''),
    NULLIF(TRIM(c.website), ''),
    'auth:web_signup',
    'web_signup',
    jsonb_build_object(
      'synced_profile_id', p_profile_id::text,
      'synced_company_id', c.id::text,
      'synced_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_platform_registered_supplier_from_profile(UUID) FROM PUBLIC;

-- Extend profile trigger to sync platform registries
CREATE OR REPLACE FUNCTION public.profiles_sync_account_directory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.company_id IS NOT DISTINCT FROM NEW.company_id
       AND OLD.full_name IS NOT DISTINCT FROM NEW.full_name
       AND OLD.email IS NOT DISTINCT FROM NEW.email
       AND OLD.phone IS NOT DISTINCT FROM NEW.phone
       AND OLD.role IS NOT DISTINCT FROM NEW.role
       AND OLD.company_id IS NOT NULL
    THEN
      RETURN NEW;
    END IF;
  END IF;

  PERFORM public.sync_account_directory_from_profile(NEW.id);
  PERFORM public.sync_platform_directory_from_profile(NEW.id);
  PERFORM public.sync_platform_registered_supplier_from_profile(NEW.id);
  RETURN NEW;
END;
$$;

-- Backfill platform registries for existing admin profiles
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT pr.id
    FROM public.profiles pr
    INNER JOIN public.companies c ON c.id = pr.company_id
    WHERE pr.company_id IS NOT NULL
      AND pr.role IN ('admin', 'superadmin')
      AND c.account_type IN ('buyer', 'seller')
    ORDER BY pr.created_at ASC NULLS LAST, pr.id ASC
  LOOP
    PERFORM public.sync_platform_directory_from_profile(p.id);
    PERFORM public.sync_platform_registered_supplier_from_profile(p.id);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
