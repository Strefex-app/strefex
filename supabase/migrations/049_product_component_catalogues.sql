-- Product & Component SKU catalogues (seller / superadmin authored).
-- Structure (industry → category → part family) lives in the app;
-- this table holds real articles only — no demo seed.

CREATE TABLE IF NOT EXISTS public.product_component_catalogue_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_name     TEXT,
  industry_id     TEXT NOT NULL,
  category_id     TEXT NOT NULL,
  subcategory_id  TEXT NOT NULL,
  group_id        TEXT,
  name            TEXT NOT NULL,
  description     TEXT,
  material        TEXT,
  sku             TEXT,
  unit            TEXT NOT NULL DEFAULT 'pcs',
  unit_price      NUMERIC,
  moq             INTEGER,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If an earlier draft used uuid_generate_v4() without the uuid-ossp extension.
ALTER TABLE public.product_component_catalogue_items
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_pcc_items_scope
  ON public.product_component_catalogue_items (industry_id, category_id, subcategory_id);

CREATE INDEX IF NOT EXISTS idx_pcc_items_company
  ON public.product_component_catalogue_items (company_id);

ALTER TABLE public.product_component_catalogue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pcc_items_select_authenticated" ON public.product_component_catalogue_items;
CREATE POLICY "pcc_items_select_authenticated"
  ON public.product_component_catalogue_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "pcc_items_insert_own" ON public.product_component_catalogue_items;
CREATE POLICY "pcc_items_insert_own"
  ON public.product_component_catalogue_items FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'superadmin'
    OR created_by = auth.uid()
    OR (
      company_id IS NOT NULL
      AND company_id = public.get_my_company_id()
    )
  );

DROP POLICY IF EXISTS "pcc_items_update_own" ON public.product_component_catalogue_items;
CREATE POLICY "pcc_items_update_own"
  ON public.product_component_catalogue_items FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'superadmin'
    OR created_by = auth.uid()
    OR (
      company_id IS NOT NULL
      AND company_id = public.get_my_company_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'superadmin'
    OR created_by = auth.uid()
    OR (
      company_id IS NOT NULL
      AND company_id = public.get_my_company_id()
    )
  );

DROP POLICY IF EXISTS "pcc_items_delete_own" ON public.product_component_catalogue_items;
CREATE POLICY "pcc_items_delete_own"
  ON public.product_component_catalogue_items FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'superadmin'
    OR created_by = auth.uid()
    OR (
      company_id IS NOT NULL
      AND company_id = public.get_my_company_id()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_component_catalogue_items TO authenticated;
GRANT ALL ON public.product_component_catalogue_items TO service_role;
