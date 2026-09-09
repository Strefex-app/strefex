-- ============================================================
-- Expose companies.metadata.sourcing_metrics on the sourcing
-- network RPC so buyer Compare can use seller-filled KPIs.
-- Postgres cannot change RETURNS TABLE via CREATE OR REPLACE.
-- ============================================================

DROP FUNCTION IF EXISTS public.list_sourcing_network_accounts(INTEGER);

CREATE OR REPLACE FUNCTION public.list_sourcing_network_accounts(
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  company TEXT,
  contact_name TEXT,
  account_type TEXT,
  account_types JSONB,
  country TEXT,
  city TEXT,
  address TEXT,
  industries JSONB,
  categories JSONB,
  product_categories JSONB,
  equipment_subcategories JSONB,
  product_subcategories JSONB,
  service_categories JSONB,
  sourcing_metrics JSONB,
  coordinates JSONB,
  visibility_tier TEXT,
  status TEXT,
  certifications JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim INTEGER := LEAST(GREATEST(COALESCE(p_limit, 500), 1), 2000);
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    COALESCE(NULLIF(LOWER(TRIM(c.email)), ''), NULLIF(LOWER(TRIM(p.email)), '')) AS email,
    COALESCE(NULLIF(TRIM(c.name), ''), 'Company') AS company,
    NULLIF(TRIM(p.full_name), '') AS contact_name,
    COALESCE(
      NULLIF(TRIM(c.account_type), ''),
      NULLIF(TRIM(c.metadata->>'account_type'), ''),
      NULLIF(TRIM(p.metadata->>'account_type'), ''),
      'seller'
    ) AS account_type,
    COALESCE(
      CASE
        WHEN jsonb_typeof(c.metadata->'account_types') = 'array'
          AND jsonb_array_length(c.metadata->'account_types') > 0
          THEN c.metadata->'account_types'
        WHEN jsonb_typeof(p.metadata->'account_types') = 'array'
          AND jsonb_array_length(p.metadata->'account_types') > 0
          THEN p.metadata->'account_types'
        ELSE NULL
      END,
      jsonb_build_array(
        COALESCE(
          NULLIF(TRIM(c.account_type), ''),
          NULLIF(TRIM(c.metadata->>'account_type'), ''),
          NULLIF(TRIM(p.metadata->>'account_type'), ''),
          'seller'
        )
      )
    ) AS account_types,
    COALESCE(NULLIF(TRIM(c.country), ''), NULLIF(TRIM(c.metadata->>'country'), '')) AS country,
    COALESCE(NULLIF(TRIM(c.city), ''), NULLIF(TRIM(c.metadata->>'city'), '')) AS city,
    COALESCE(NULLIF(TRIM(c.address), ''), NULLIF(TRIM(c.metadata->>'address'), '')) AS address,
    COALESCE(
      CASE
        WHEN jsonb_typeof(c.industries) = 'array' AND jsonb_array_length(c.industries) > 0
          THEN c.industries
        WHEN jsonb_typeof(c.metadata->'industries') = 'array'
          THEN c.metadata->'industries'
        WHEN jsonb_typeof(p.metadata->'industries') = 'array'
          THEN p.metadata->'industries'
        ELSE '[]'::jsonb
      END,
      '[]'::jsonb
    ) AS industries,
    COALESCE(
      CASE
        WHEN jsonb_typeof(c.categories) = 'object' AND c.categories <> '{}'::jsonb
          THEN c.categories
        WHEN jsonb_typeof(c.metadata->'categories') = 'object'
          THEN c.metadata->'categories'
        WHEN jsonb_typeof(p.metadata->'categories') = 'object'
          THEN p.metadata->'categories'
        ELSE '{}'::jsonb
      END,
      '{}'::jsonb
    ) AS categories,
    COALESCE(
      CASE
        WHEN jsonb_typeof(c.metadata->'product_categories') = 'object'
          THEN c.metadata->'product_categories'
        WHEN jsonb_typeof(p.metadata->'product_categories') = 'object'
          THEN p.metadata->'product_categories'
        ELSE '{}'::jsonb
      END,
      '{}'::jsonb
    ) AS product_categories,
    COALESCE(
      CASE
        WHEN jsonb_typeof(c.metadata->'equipment_subcategories') = 'object'
          THEN c.metadata->'equipment_subcategories'
        WHEN jsonb_typeof(p.metadata->'equipment_subcategories') = 'object'
          THEN p.metadata->'equipment_subcategories'
        ELSE '{}'::jsonb
      END,
      '{}'::jsonb
    ) AS equipment_subcategories,
    COALESCE(
      CASE
        WHEN jsonb_typeof(c.metadata->'product_subcategories') = 'object'
          THEN c.metadata->'product_subcategories'
        WHEN jsonb_typeof(p.metadata->'product_subcategories') = 'object'
          THEN p.metadata->'product_subcategories'
        ELSE '{}'::jsonb
      END,
      '{}'::jsonb
    ) AS product_subcategories,
    COALESCE(
      CASE
        WHEN jsonb_typeof(c.service_categories) = 'array'
          AND jsonb_array_length(c.service_categories) > 0
          THEN c.service_categories
        WHEN jsonb_typeof(c.metadata->'service_categories') = 'array'
          THEN c.metadata->'service_categories'
        WHEN jsonb_typeof(p.metadata->'service_categories') = 'array'
          THEN p.metadata->'service_categories'
        ELSE '[]'::jsonb
      END,
      '[]'::jsonb
    ) AS service_categories,
    COALESCE(
      CASE
        WHEN jsonb_typeof(c.metadata->'sourcing_metrics') = 'object'
          THEN c.metadata->'sourcing_metrics'
        WHEN jsonb_typeof(p.metadata->'sourcing_metrics') = 'object'
          THEN p.metadata->'sourcing_metrics'
        ELSE '{}'::jsonb
      END,
      '{}'::jsonb
    ) AS sourcing_metrics,
    COALESCE(c.coordinates, '[]'::jsonb) AS coordinates,
    COALESCE(c.visibility_tier, 'incomplete') AS visibility_tier,
    COALESCE(NULLIF(TRIM(c.status), ''), 'active') AS status,
    COALESCE(c.certifications, '[]'::jsonb) AS certifications
  FROM public.companies c
  LEFT JOIN LATERAL (
    SELECT pr.*
    FROM public.profiles pr
    WHERE pr.company_id = c.id
    ORDER BY
      CASE WHEN pr.role IN ('admin', 'superadmin') THEN 0 ELSE 1 END,
      pr.created_at ASC NULLS LAST
    LIMIT 1
  ) p ON TRUE
  WHERE COALESCE(c.status, 'active') <> 'canceled'
    AND (
      COALESCE(c.account_type, '') IN ('seller', 'service_provider', 'auditor')
      OR COALESCE(c.metadata->>'account_type', '') IN ('seller', 'service_provider', 'auditor')
      OR COALESCE(p.metadata->>'account_type', '') IN ('seller', 'service_provider', 'auditor')
      OR (
        jsonb_typeof(c.metadata->'account_types') = 'array'
        AND (
          c.metadata->'account_types' ? 'seller'
          OR c.metadata->'account_types' ? 'service_provider'
          OR c.metadata->'account_types' ? 'auditor'
        )
      )
      OR (
        jsonb_typeof(p.metadata->'account_types') = 'array'
        AND (
          p.metadata->'account_types' ? 'seller'
          OR p.metadata->'account_types' ? 'service_provider'
          OR p.metadata->'account_types' ? 'auditor'
        )
      )
    )
    AND (
      NULLIF(TRIM(c.country), '') IS NOT NULL
      OR NULLIF(TRIM(c.city), '') IS NOT NULL
      OR (
        CASE
          WHEN jsonb_typeof(c.industries) = 'array' THEN jsonb_array_length(c.industries)
          WHEN jsonb_typeof(c.metadata->'industries') = 'array' THEN jsonb_array_length(c.metadata->'industries')
          ELSE 0
        END
      ) > 0
    )
  ORDER BY c.updated_at DESC NULLS LAST
  LIMIT lim;
END;
$$;

COMMENT ON FUNCTION public.list_sourcing_network_accounts(INTEGER) IS
  'Authenticated sourcing directory of companies (seller, service_provider, auditor firms) including optional sourcing_metrics for Compare.';

REVOKE ALL ON FUNCTION public.list_sourcing_network_accounts(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_sourcing_network_accounts(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_sourcing_network_accounts(INTEGER) TO service_role;

NOTIFY pgrst, 'reload schema';
