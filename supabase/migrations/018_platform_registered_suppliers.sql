-- ============================================================
-- Registered suppliers registry — superadmin only (not public supplier profiles)
-- Tooling / international supplier lists; separate from platform_directory_contacts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_registered_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  industry TEXT,
  country TEXT NOT NULL DEFAULT 'China',
  contact_name TEXT,
  "position" TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  row_index INTEGER,
  source_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_reg_suppliers_company ON public.platform_registered_suppliers (lower(company_name));
CREATE INDEX IF NOT EXISTS idx_platform_reg_suppliers_industry ON public.platform_registered_suppliers (lower(COALESCE(industry, '')));
CREATE INDEX IF NOT EXISTS idx_platform_reg_suppliers_country ON public.platform_registered_suppliers (lower(COALESCE(country, '')));

ALTER TABLE public.platform_registered_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Registered suppliers superadmin select" ON public.platform_registered_suppliers;
DROP POLICY IF EXISTS "Registered suppliers superadmin insert" ON public.platform_registered_suppliers;
DROP POLICY IF EXISTS "Registered suppliers superadmin update" ON public.platform_registered_suppliers;
DROP POLICY IF EXISTS "Registered suppliers superadmin delete" ON public.platform_registered_suppliers;

CREATE POLICY "Registered suppliers superadmin select"
  ON public.platform_registered_suppliers FOR SELECT
  USING (public.get_my_role() = 'superadmin');

CREATE POLICY "Registered suppliers superadmin insert"
  ON public.platform_registered_suppliers FOR INSERT
  WITH CHECK (public.get_my_role() = 'superadmin');

CREATE POLICY "Registered suppliers superadmin update"
  ON public.platform_registered_suppliers FOR UPDATE
  USING (public.get_my_role() = 'superadmin')
  WITH CHECK (public.get_my_role() = 'superadmin');

CREATE POLICY "Registered suppliers superadmin delete"
  ON public.platform_registered_suppliers FOR DELETE
  USING (public.get_my_role() = 'superadmin');

COMMENT ON TABLE public.platform_registered_suppliers IS
  'Superadmin-only registry of supplier contacts (e.g. tooling lists). Not exposed to buyers until promoted.';

NOTIFY pgrst, 'reload schema';
