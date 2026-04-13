-- ============================================================
-- Distinguish web signups vs imported / extracted / manual rows
-- Auto-sync account_directory_entries when a tenant admin profile
-- is linked to a company (post-registration).
-- ============================================================

-- ── account_directory_entries.registry_source ─────────────────
ALTER TABLE public.account_directory_entries
  ADD COLUMN IF NOT EXISTS registry_source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.account_directory_entries
  DROP CONSTRAINT IF EXISTS account_directory_entries_registry_source_check;

ALTER TABLE public.account_directory_entries
  ADD CONSTRAINT account_directory_entries_registry_source_check
  CHECK (registry_source IN (
    'web_signup',
    'spreadsheet_import',
    'platform_extract',
    'manual'
  ));

CREATE INDEX IF NOT EXISTS idx_ade_registry_source
  ON public.account_directory_entries (registry_source);

COMMENT ON COLUMN public.account_directory_entries.registry_source IS
  'web_signup: synced from auth profile; spreadsheet_import: file import; platform_extract: extract RPC; manual: UI.';

UPDATE public.account_directory_entries
SET registry_source = 'spreadsheet_import'
WHERE registry_source = 'manual'
  AND (
    metadata ? 'import_file'
    OR (source_ref IS NOT NULL AND source_ref ILIKE 'import:%')
  );

UPDATE public.account_directory_entries
SET registry_source = 'platform_extract'
WHERE source_ref IN ('extract:buyers', 'extract:suppliers')
   OR (source_ref IS NOT NULL AND source_ref LIKE 'extract:%');

-- ── platform_registered_suppliers.registry_source ─────────────
ALTER TABLE public.platform_registered_suppliers
  ADD COLUMN IF NOT EXISTS registry_source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.platform_registered_suppliers
  DROP CONSTRAINT IF EXISTS platform_registered_suppliers_registry_source_check;

ALTER TABLE public.platform_registered_suppliers
  ADD CONSTRAINT platform_registered_suppliers_registry_source_check
  CHECK (registry_source IN (
    'web_signup',
    'spreadsheet_import',
    'manual'
  ));

CREATE INDEX IF NOT EXISTS idx_platform_reg_suppliers_registry_source
  ON public.platform_registered_suppliers (registry_source);

COMMENT ON COLUMN public.platform_registered_suppliers.registry_source IS
  'web_signup: optional future sync; spreadsheet_import: file import; manual: superadmin form.';

UPDATE public.platform_registered_suppliers
SET registry_source = 'spreadsheet_import'
WHERE registry_source = 'manual'
  AND source_ref IS NOT NULL
  AND (
    source_ref ILIKE 'xlsx:%'
    OR source_ref ILIKE 'csv:%'
  );

-- ── Sync: profile (admin/superadmin) → tenant directory row ────
CREATE OR REPLACE FUNCTION public.sync_account_directory_from_profile(p_profile_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.profiles%ROWTYPE;
  c public.companies%ROWTYPE;
  v_entry_type TEXT;
BEGIN
  SELECT * INTO r FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND OR r.company_id IS NULL THEN
    RETURN;
  END IF;

  IF r.role IS NULL OR r.role NOT IN ('admin', 'superadmin') THEN
    RETURN;
  END IF;

  SELECT * INTO c FROM public.companies WHERE id = r.company_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_entry_type := CASE c.account_type
    WHEN 'buyer' THEN 'customer'
    WHEN 'seller' THEN 'equipment_supplier'
    ELSE 'other'
  END;

  IF EXISTS (
    SELECT 1
    FROM public.account_directory_entries e
    WHERE e.company_id = r.company_id
      AND e.registry_source = 'web_signup'
      AND (e.metadata->>'synced_profile_id') = p_profile_id::text
  ) THEN
    UPDATE public.account_directory_entries e
    SET
      company_name = COALESCE(NULLIF(TRIM(c.name), ''), e.company_name),
      contact_name = NULLIF(TRIM(r.full_name), ''),
      email = NULLIF(LOWER(TRIM(r.email)), ''),
      phone = NULLIF(TRIM(r.phone), ''),
      website = NULLIF(TRIM(c.website), ''),
      country = NULLIF(TRIM(c.country), ''),
      entry_type = v_entry_type,
      industry_hub_id = CASE
        WHEN jsonb_typeof(c.industries) = 'array'
          AND jsonb_array_length(c.industries) > 0
          THEN NULLIF(TRIM(c.industries->>0), '')
        ELSE NULL
      END,
      industry_label = NULLIF(TRIM(c.industries->>0), ''),
      updated_at = now(),
      metadata = COALESCE(e.metadata, '{}'::jsonb) || jsonb_build_object(
        'synced_profile_id', p_profile_id::text,
        'synced_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    WHERE e.company_id = r.company_id
      AND e.registry_source = 'web_signup'
      AND (e.metadata->>'synced_profile_id') = p_profile_id::text;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.account_directory_entries e
    WHERE e.company_id = r.company_id
      AND e.registry_source = 'web_signup'
      AND (e.metadata->>'synced_profile_id') IS NOT NULL
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.account_directory_entries (
    company_id,
    created_by,
    entry_type,
    company_name,
    contact_name,
    email,
    phone,
    website,
    country,
    industry_hub_id,
    industry_label,
    source_ref,
    visible_in_exec_summary_superadmin,
    registry_source,
    metadata
  ) VALUES (
    r.company_id,
    r.id,
    v_entry_type,
    COALESCE(NULLIF(TRIM(c.name), ''), split_part(r.email, '@', 1)),
    NULLIF(TRIM(r.full_name), ''),
    NULLIF(LOWER(TRIM(r.email)), ''),
    NULLIF(TRIM(r.phone), ''),
    NULLIF(TRIM(c.website), ''),
    NULLIF(TRIM(c.country), ''),
    CASE
      WHEN jsonb_typeof(c.industries) = 'array'
        AND jsonb_array_length(c.industries) > 0
        THEN NULLIF(TRIM(c.industries->>0), '')
      ELSE NULL
    END,
    NULLIF(TRIM(c.industries->>0), ''),
    'auth:web_signup',
    true,
    'web_signup',
    jsonb_build_object(
      'synced_profile_id', p_profile_id::text,
      'synced_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_account_directory_from_profile(UUID) FROM PUBLIC;

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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_after_insert_sync_directory ON public.profiles;
CREATE TRIGGER profiles_after_insert_sync_directory
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.company_id IS NOT NULL)
  EXECUTE FUNCTION public.profiles_sync_account_directory();

DROP TRIGGER IF EXISTS profiles_after_update_sync_directory ON public.profiles;
CREATE TRIGGER profiles_after_update_sync_directory
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.company_id IS NOT NULL)
  EXECUTE FUNCTION public.profiles_sync_account_directory();

-- Backfill: one web_signup row per company (prefer earliest admin by created_at)
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT DISTINCT ON (pr.company_id) pr.id
    FROM public.profiles pr
    WHERE pr.company_id IS NOT NULL
      AND pr.role IN ('admin', 'superadmin')
      AND NOT EXISTS (
        SELECT 1
        FROM public.account_directory_entries e
        WHERE e.company_id = pr.company_id
          AND e.registry_source = 'web_signup'
      )
    ORDER BY pr.company_id, pr.created_at ASC NULLS LAST, pr.id ASC
  LOOP
    PERFORM public.sync_account_directory_from_profile(p.id);
  END LOOP;
END;
$$;

-- ── Extract RPC: tag rows ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.extract_account_directory_from_platform()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  n_customers INTEGER := 0;
  n_suppliers INTEGER := 0;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'superadmin' THEN
    RAISE EXCEPTION 'extract_account_directory_from_platform: superadmin only';
  END IF;

  INSERT INTO public.account_directory_entries (
    company_id,
    entry_type,
    company_name,
    contact_name,
    email,
    phone,
    website,
    country,
    industry_hub_id,
    industry_label,
    source_ref,
    visible_in_exec_summary_superadmin,
    registry_source,
    metadata
  )
  SELECT
    b.company_id,
    'customer',
    COALESCE(NULLIF(TRIM(c.name), ''), b.name),
    NULL,
    NULLIF(LOWER(TRIM(c.email)), ''),
    NULLIF(TRIM(c.phone), ''),
    NULLIF(TRIM(c.website), ''),
    NULLIF(TRIM(c.country), ''),
    CASE
      WHEN jsonb_typeof(c.industries) = 'array'
        AND jsonb_array_length(c.industries) > 0
        THEN NULLIF(TRIM(c.industries->>0), '')
      ELSE NULL
    END,
    NULLIF(TRIM(c.industries->>0), ''),
    'extract:buyers',
    true,
    'platform_extract',
    jsonb_build_object(
      'source_buyer_id', b.id::text,
      'source_company_id', b.company_id::text,
      'extracted_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  FROM public.buyers b
  LEFT JOIN public.companies c ON c.id = b.company_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.account_directory_entries e
    WHERE e.company_id = b.company_id
      AND e.entry_type = 'customer'
      AND (e.metadata->>'source_buyer_id') = b.id::text
  );

  GET DIAGNOSTICS n_customers = ROW_COUNT;

  INSERT INTO public.account_directory_entries (
    company_id,
    entry_type,
    company_name,
    contact_name,
    "position",
    email,
    phone,
    website,
    country,
    industry_hub_id,
    industry_label,
    source_ref,
    visible_in_exec_summary_superadmin,
    registry_source,
    metadata
  )
  SELECT
    v.company_id,
    'equipment_supplier',
    s.display_name,
    NULLIF(TRIM(v.contacts->0->>'name'), ''),
    NULLIF(TRIM(v.contacts->0->>'role'), ''),
    NULLIF(
      LOWER(TRIM(COALESCE(
        s.metadata->>'contact_email',
        v.contacts->0->>'email',
        ''
      ))),
      ''
    ),
    NULLIF(TRIM(COALESCE(v.contacts->0->>'phone', '')), ''),
    NULLIF(TRIM(COALESCE(s.website, v.general->>'website', '')), ''),
    NULLIF(TRIM(COALESCE(s.country, v.general->>'country', '')), ''),
    NULLIF(
      LOWER(TRIM(COALESCE(
        NULLIF(v.general->'industry'->>0, ''),
        s.industry
      ))),
      ''
    ),
    NULLIF(TRIM(COALESCE(s.industry, '')), ''),
    'extract:suppliers',
    true,
    'platform_extract',
    jsonb_build_object(
      'source_supplier_id', s.id::text,
      'source_vendor_id', v.id::text,
      'source_company_id', v.company_id::text,
      'extracted_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  FROM public.suppliers s
  INNER JOIN public.vendors v ON v.id = s.vendor_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.account_directory_entries e
    WHERE e.company_id = v.company_id
      AND e.entry_type = 'equipment_supplier'
      AND (e.metadata->>'source_supplier_id') = s.id::text
  );

  GET DIAGNOSTICS n_suppliers = ROW_COUNT;

  RETURN jsonb_build_object(
    'inserted_customers', n_customers,
    'inserted_equipment_suppliers', n_suppliers
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
