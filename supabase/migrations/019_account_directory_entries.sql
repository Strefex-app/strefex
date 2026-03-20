-- ============================================================
-- Per-tenant account directory + superadmin cross-tenant visibility
-- Extract: buyers (as "customer" workspace) + suppliers/vendors (equipment suppliers)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.account_directory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL DEFAULT 'contact'
    CHECK (entry_type IN ('contact', 'customer', 'equipment_supplier', 'other')),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  "position" TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  country TEXT,
  industry_hub_id TEXT,
  industry_label TEXT,
  category_id TEXT,
  source_ref TEXT,
  visible_in_exec_summary_superadmin BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ade_company ON public.account_directory_entries (company_id);
CREATE INDEX IF NOT EXISTS idx_ade_entry_type ON public.account_directory_entries (entry_type);
CREATE INDEX IF NOT EXISTS idx_ade_industry_hub ON public.account_directory_entries (industry_hub_id);
CREATE INDEX IF NOT EXISTS idx_ade_company_lower_name ON public.account_directory_entries (company_id, lower(company_name));

COMMENT ON TABLE public.account_directory_entries IS
  'B2B directory per tenant (company_id). Superadmin sees all rows; metadata.source_company_id documents origin for extracted rows.';

COMMENT ON COLUMN public.account_directory_entries.visible_in_exec_summary_superadmin IS
  'When true, row is intended for superadmin-only executive-summary / industry rollups (not shown to buyers without feature access).';

DROP TRIGGER IF EXISTS update_account_directory_entries_updated_at ON public.account_directory_entries;
CREATE TRIGGER update_account_directory_entries_updated_at
  BEFORE UPDATE ON public.account_directory_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.account_directory_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account directory select" ON public.account_directory_entries;
DROP POLICY IF EXISTS "Account directory insert" ON public.account_directory_entries;
DROP POLICY IF EXISTS "Account directory update" ON public.account_directory_entries;
DROP POLICY IF EXISTS "Account directory delete" ON public.account_directory_entries;

CREATE POLICY "Account directory select"
  ON public.account_directory_entries FOR SELECT
  USING (
    public.get_my_role() IN ('superadmin', 'auditor_external')
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "Account directory insert"
  ON public.account_directory_entries FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'superadmin'
    OR (
      company_id = public.get_my_company_id()
      AND public.get_my_role() NOT IN ('guest', 'auditor_internal', 'auditor_external')
    )
  );

CREATE POLICY "Account directory update"
  ON public.account_directory_entries FOR UPDATE
  USING (
    public.get_my_role() = 'superadmin'
    OR company_id = public.get_my_company_id()
  )
  WITH CHECK (
    public.get_my_role() = 'superadmin'
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "Account directory delete"
  ON public.account_directory_entries FOR DELETE
  USING (
    public.get_my_role() = 'superadmin'
    OR (
      company_id = public.get_my_company_id()
      AND public.get_my_role() IN ('superadmin', 'admin')
    )
  );

-- ----------------------------------------------------------------
-- Superadmin: create RFQs / vendor stubs for any tenant company
-- (001 only allowed inserts where company_id = current profile company)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Tenant insert" ON public.rfqs;
CREATE POLICY "Tenant insert" ON public.rfqs FOR INSERT
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

DROP POLICY IF EXISTS "Tenant insert" ON public.vendors;
CREATE POLICY "Tenant insert" ON public.vendors FOR INSERT
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

-- ----------------------------------------------------------------
-- Idempotent extract: buyers → customer; suppliers+vendors → equipment_supplier
-- Invoker must be superadmin (RLS on INSERT allows superadmin any company_id)
-- ----------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.extract_account_directory_from_platform() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.extract_account_directory_from_platform() TO authenticated;

NOTIFY pgrst, 'reload schema';
