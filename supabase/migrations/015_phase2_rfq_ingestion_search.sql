-- ============================================================
-- Phase 2: RFQ completion, ingestion processing, search ranking
-- ============================================================

-- ----------------------------------------------------------------
-- RFQ lifecycle/status, structured responses, reminder tracking
-- ----------------------------------------------------------------
ALTER TABLE public.rfq_suppliers
  DROP CONSTRAINT IF EXISTS rfq_suppliers_status_check;

ALTER TABLE public.rfq_suppliers
  ADD CONSTRAINT rfq_suppliers_status_check
  CHECK (status IN ('invited', 'viewed', 'responded', 'rejected', 'closed'));

ALTER TABLE public.rfq_suppliers
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;

ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE public.rfq_responses
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS warranty_months INTEGER,
  ADD COLUMN IF NOT EXISTS moq INTEGER,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS attachment_urls JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS response_fields JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_rfq_suppliers_status_deadline
  ON public.rfq_suppliers(status, last_reminder_at, invited_at DESC);

CREATE TABLE IF NOT EXISTS public.rfq_deadline_reminders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id        UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '6h', '1h')),
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, supplier_id, reminder_type)
);

ALTER TABLE public.rfq_deadline_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RFQ reminders visible to participants"
ON public.rfq_deadline_reminders FOR SELECT
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.rfqs r
    WHERE r.id = rfq_id
      AND public.is_buyer_member(r.buyer_id)
  )
  OR public.can_edit_supplier_global(supplier_id)
);
CREATE POLICY "RFQ reminders managed by platform admin"
ON public.rfq_deadline_reminders FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- ----------------------------------------------------------------
-- Search: include completeness and newest sorting support
-- ----------------------------------------------------------------
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
  relevance NUMERIC
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
    round((coalesce(rs.overall_score, 0) + (coalesce(c.profile_completeness, 0) * 0.20))::numeric, 2) AS boosted_score,
    s.created_at,
    CASE
      WHEN nullif(trim(coalesce(p_query, '')), '') IS NULL THEN 0
      ELSE ts_rank_cd(s.search_tsv, plainto_tsquery('simple', p_query))
    END AS relevance
  FROM public.suppliers s
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
    CASE WHEN p_sort_by = 'score' THEN (coalesce(rs.overall_score, 0) + (coalesce(c.profile_completeness, 0) * 0.20)) END DESC,
    CASE WHEN p_sort_by = 'newest' THEN extract(epoch from s.created_at) END DESC,
    s.display_name ASC
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 20), 100))
  OFFSET GREATEST(0, coalesce(p_offset, 0));
$$;
