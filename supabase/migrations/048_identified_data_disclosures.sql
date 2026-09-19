-- ============================================================
-- Identified-data disclosure (buyer request / seller consent)
-- plus sourcing-network RPC that hides email, contact, street
-- unless operator, owner, or granted disclosure.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.identified_data_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  target_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requester_company_name TEXT,
  requester_email TEXT,
  target_company_name TEXT,
  purpose TEXT NOT NULL DEFAULT 'sourcing',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'granted', 'denied', 'revoked')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  CONSTRAINT identified_data_pair UNIQUE (requester_company_id, target_company_id),
  CONSTRAINT identified_data_not_self CHECK (requester_company_id <> target_company_id)
);

CREATE INDEX IF NOT EXISTS idx_identified_data_target
  ON public.identified_data_disclosures (target_company_id, status);
CREATE INDEX IF NOT EXISTS idx_identified_data_requester
  ON public.identified_data_disclosures (requester_company_id, status);

ALTER TABLE public.identified_data_disclosures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Identified data select parties" ON public.identified_data_disclosures;
DROP POLICY IF EXISTS "Identified data insert requester" ON public.identified_data_disclosures;
DROP POLICY IF EXISTS "Identified data update parties" ON public.identified_data_disclosures;

CREATE POLICY "Identified data select parties"
  ON public.identified_data_disclosures FOR SELECT
  USING (
    requester_company_id = public.get_my_company_id()
    OR target_company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "Identified data insert requester"
  ON public.identified_data_disclosures FOR INSERT
  WITH CHECK (
    requester_company_id = public.get_my_company_id()
    AND requester_company_id IS DISTINCT FROM target_company_id
  );

CREATE POLICY "Identified data update parties"
  ON public.identified_data_disclosures FOR UPDATE
  USING (
    target_company_id = public.get_my_company_id()
    OR requester_company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  )
  WITH CHECK (
    target_company_id = public.get_my_company_id()
    OR requester_company_id = public.get_my_company_id()
    OR public.get_my_role() = 'superadmin'
  );

GRANT SELECT, INSERT, UPDATE ON public.identified_data_disclosures TO authenticated;
GRANT ALL ON public.identified_data_disclosures TO service_role;

COMMENT ON TABLE public.identified_data_disclosures IS
  'Buyer requests seller consent to view identified contact data. Default marketplace view is company name + country/city only.';

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
  v_role TEXT := public.get_my_role();
  v_company UUID := public.get_my_company_id();
  v_privileged BOOLEAN := COALESCE(v_role, '') IN ('superadmin', 'auditor_external');
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    CASE
      WHEN v_privileged
        OR c.id = v_company
        OR EXISTS (
          SELECT 1
          FROM public.identified_data_disclosures d
          WHERE d.target_company_id = c.id
            AND d.requester_company_id = v_company
            AND d.status = 'granted'
        )
      THEN COALESCE(NULLIF(LOWER(TRIM(c.email)), ''), NULLIF(LOWER(TRIM(p.email)), ''))
      ELSE NULL
    END AS email,
    COALESCE(NULLIF(TRIM(c.name), ''), 'Company') AS company,
    CASE
      WHEN v_privileged
        OR c.id = v_company
        OR EXISTS (
          SELECT 1
          FROM public.identified_data_disclosures d
          WHERE d.target_company_id = c.id
            AND d.requester_company_id = v_company
            AND d.status = 'granted'
        )
      THEN NULLIF(TRIM(p.full_name), '')
      ELSE NULL
    END AS contact_name,
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
    CASE
      WHEN v_privileged
        OR c.id = v_company
        OR EXISTS (
          SELECT 1
          FROM public.identified_data_disclosures d
          WHERE d.target_company_id = c.id
            AND d.requester_company_id = v_company
            AND d.status = 'granted'
        )
      THEN COALESCE(NULLIF(TRIM(c.address), ''), NULLIF(TRIM(c.metadata->>'address'), ''))
      ELSE NULL
    END AS address,
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
  'Sourcing directory. Email, contact name, and street address are returned only to the owner, platform operators, or buyers with a granted identified-data disclosure.';

REVOKE ALL ON FUNCTION public.list_sourcing_network_accounts(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_sourcing_network_accounts(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_sourcing_network_accounts(INTEGER) TO service_role;

NOTIFY pgrst, 'reload schema';
