-- ============================================================
-- Buyer supplier search: join tenant company visibility_tier
-- (seller / service provider) and boost ranking for RFQ discovery.
-- Requires 027_company_registration_profile_visibility.sql (companies.visibility_tier).
-- ============================================================

DROP FUNCTION IF EXISTS public.search_suppliers(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.search_suppliers(
  p_query TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_process TEXT DEFAULT NULL,
  p_certification TEXT DEFAULT NULL,
  p_min_audit_score NUMERIC DEFAULT NULL,
  p_max_risk_score NUMERIC DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'score',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  supplier_id UUID,
  display_name TEXT,
  country TEXT,
  industry TEXT,
  overall_score NUMERIC,
  risk_score NUMERIC,
  latest_audit_score NUMERIC,
  profile_completeness INTEGER,
  boosted_score NUMERIC,
  created_at TIMESTAMPTZ,
  relevance NUMERIC,
  tenant_visibility_tier TEXT,
  tenant_visibility_rank INTEGER
)
LANGUAGE sql
STABLE
AS $$
  WITH ranked_scores AS (
    SELECT DISTINCT ON (ss.supplier_id)
      ss.supplier_id, ss.overall_score, ss.risk_score
    FROM public.supplier_scores ss
    ORDER BY ss.supplier_id, ss.calculated_at DESC
  ),
  ranked_audits AS (
    SELECT DISTINCT ON (sa.supplier_id)
      sa.supplier_id, sa.audit_score
    FROM public.supplier_audits sa
    ORDER BY sa.supplier_id, sa.audited_at DESC NULLS LAST
  ),
  completeness AS (
    SELECT s.id AS supplier_id, coalesce(sp.profile_completeness, 0) AS profile_completeness
    FROM public.suppliers s
    LEFT JOIN public.supplier_profiles sp ON sp.supplier_id = s.vendor_id
  )
  SELECT
    s.id AS supplier_id,
    s.display_name,
    s.country,
    s.industry,
    coalesce(rs.overall_score, 0) AS overall_score,
    coalesce(rs.risk_score, 0) AS risk_score,
    coalesce(ra.audit_score, 0) AS latest_audit_score,
    coalesce(c.profile_completeness, 0) AS profile_completeness,
    round((
      coalesce(rs.overall_score, 0)
      + (coalesce(c.profile_completeness, 0) * 0.20)
      + CASE co.visibility_tier
          WHEN 'verified' THEN 12
          WHEN 'premium' THEN 7
          WHEN 'standard' THEN 3
          WHEN 'incomplete' THEN 0
          ELSE 0
        END
    )::numeric, 2) AS boosted_score,
    s.created_at,
    CASE
      WHEN nullif(trim(coalesce(p_query, '')), '') IS NULL THEN 0
      ELSE ts_rank_cd(s.search_tsv, plainto_tsquery('simple', p_query))
    END AS relevance,
    co.visibility_tier::text AS tenant_visibility_tier,
    (
      CASE co.visibility_tier
        WHEN 'verified' THEN 4
        WHEN 'premium' THEN 3
        WHEN 'standard' THEN 2
        WHEN 'incomplete' THEN 1
        ELSE 0
      END
    )::integer AS tenant_visibility_rank
  FROM public.suppliers s
  LEFT JOIN public.vendors v ON v.id = s.vendor_id
  LEFT JOIN public.companies co ON co.id = v.company_id
    AND co.account_type IN ('seller', 'service_provider')
  LEFT JOIN ranked_scores rs ON rs.supplier_id = s.id
  LEFT JOIN ranked_audits ra ON ra.supplier_id = s.id
  LEFT JOIN completeness c ON c.supplier_id = s.id
  WHERE
    (nullif(trim(coalesce(p_query, '')), '') IS NULL OR s.search_tsv @@ plainto_tsquery('simple', p_query))
    AND (nullif(trim(coalesce(p_country, '')), '') IS NULL OR s.country = p_country)
    AND (nullif(trim(coalesce(p_industry, '')), '') IS NULL OR s.industry = p_industry)
    AND (p_max_risk_score IS NULL OR coalesce(rs.risk_score, 0) <= p_max_risk_score)
    AND (p_min_audit_score IS NULL OR coalesce(ra.audit_score, 0) >= p_min_audit_score)
    AND (
      nullif(trim(coalesce(p_process, '')), '') IS NULL
      OR EXISTS (
        SELECT 1 FROM public.supplier_capabilities sc
        WHERE sc.supplier_id = s.id
          AND lower(coalesce(sc.process, '')) = lower(p_process)
      )
    )
    AND (
      nullif(trim(coalesce(p_certification, '')), '') IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.supplier_certifications scf
        JOIN public.suppliers ss2 ON ss2.vendor_id = scf.supplier_id
        WHERE ss2.id = s.id
          AND lower(coalesce(scf.certification_name, '')) = lower(p_certification)
          AND scf.status = 'verified'
      )
    )
  ORDER BY
    CASE WHEN p_sort_by = 'relevance' THEN
      CASE
        WHEN nullif(trim(coalesce(p_query, '')), '') IS NULL THEN 0
        ELSE ts_rank_cd(s.search_tsv, plainto_tsquery('simple', p_query))
      END
    END DESC,
    CASE WHEN p_sort_by = 'relevance' THEN
      CASE co.visibility_tier
        WHEN 'verified' THEN 4
        WHEN 'premium' THEN 3
        WHEN 'standard' THEN 2
        WHEN 'incomplete' THEN 1
        ELSE 0
      END
    END DESC,
    CASE WHEN p_sort_by = 'score' THEN
      coalesce(rs.overall_score, 0)
        + (coalesce(c.profile_completeness, 0) * 0.20)
        + CASE co.visibility_tier
            WHEN 'verified' THEN 12
            WHEN 'premium' THEN 7
            WHEN 'standard' THEN 3
            ELSE 0
          END
    END DESC,
    CASE WHEN p_sort_by = 'newest' THEN extract(epoch from s.created_at) END DESC,
    s.display_name ASC
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 20), 100))
  OFFSET GREATEST(0, coalesce(p_offset, 0));
$$;

GRANT EXECUTE ON FUNCTION public.search_suppliers(
  TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER, INTEGER
) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.search_suppliers(
  TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER, INTEGER
) IS 'Buyer workspace supplier search; boosts rows linked to seller/service_provider companies by visibility_tier.';

NOTIFY pgrst, 'reload schema';
