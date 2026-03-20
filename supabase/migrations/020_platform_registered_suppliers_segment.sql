-- ============================================================
-- Supplier directory (registered suppliers) — align with buyer directory
-- Add segment + mirror Plastic/Stamping contacts from buyer directory
-- ============================================================

ALTER TABLE public.platform_registered_suppliers
  ADD COLUMN IF NOT EXISTS segment TEXT NOT NULL DEFAULT 'Company list (2025)';

CREATE INDEX IF NOT EXISTS idx_platform_reg_suppliers_segment ON public.platform_registered_suppliers (segment);

COMMENT ON COLUMN public.platform_registered_suppliers.segment IS
  'Same concept as buyer directory (Plastic, Stamping, Company list (2025), etc.).';

-- Existing rows: derive segment from industry when useful, else default
UPDATE public.platform_registered_suppliers
SET segment = COALESCE(NULLIF(TRIM(industry), ''), segment)
WHERE segment = 'Company list (2025)' AND industry IS NOT NULL AND TRIM(industry) <> '';

-- Mirror buyer-directory seed into supplier registry (superadmin sees both; idempotent)
INSERT INTO public.platform_registered_suppliers (
  segment,
  company_name,
  industry,
  country,
  contact_name,
  "position",
  email,
  phone,
  website,
  source_ref,
  metadata
)
SELECT
  p.segment,
  p.company_name,
  NULL,
  p.country,
  p.contact_name,
  p."position",
  p.email,
  p.phone,
  p.website,
  COALESCE(p.source_ref, 'buyer directory') || ' · supplier directory mirror',
  jsonb_build_object('mirrored_from', 'platform_directory_contacts', 'source_row_id', p.id::text)
FROM public.platform_directory_contacts p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.platform_registered_suppliers r
  WHERE lower(trim(r.company_name)) = lower(trim(p.company_name))
    AND coalesce(lower(trim(r.email)), '') = coalesce(lower(trim(p.email)), '')
    AND coalesce(lower(trim(r.contact_name)), '') = coalesce(lower(trim(p.contact_name)), '')
    AND coalesce(r.segment, '') = p.segment
);

NOTIFY pgrst, 'reload schema';
