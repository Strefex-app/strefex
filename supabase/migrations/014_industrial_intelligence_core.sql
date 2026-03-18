-- ============================================================
-- Industrial Intelligence Core (scalable extension)
-- ============================================================
-- This migration extends the existing platform with normalized
-- supplier intelligence, buyer workspace, RFQ linking tables,
-- ingestion pipeline, search support, and analytics.

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------
-- Global supplier model
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id        UUID UNIQUE REFERENCES public.vendors(id) ON DELETE SET NULL,
  legal_name       TEXT NOT NULL,
  display_name     TEXT NOT NULL,
  country          TEXT,
  industry         TEXT,
  website          TEXT,
  description      TEXT,
  source_confidence NUMERIC(5,2) DEFAULT 0,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_tsv       TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(display_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(legal_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(industry, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) STORED
);

CREATE TABLE IF NOT EXISTS public.supplier_capabilities (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  process          TEXT,
  capability       TEXT NOT NULL,
  material         TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.suppliers (vendor_id, legal_name, display_name, country, industry, website, description, metadata)
SELECT
  v.id,
  coalesce(v.general->>'legalName', v.general->>'companyName', 'Supplier'),
  coalesce(v.general->>'companyName', v.general->>'legalName', 'Supplier'),
  nullif(v.general->>'country', ''),
  nullif((v.general->'industry'->>0), ''),
  nullif(v.general->>'website', ''),
  nullif(v.general->>'description', ''),
  coalesce(v.metadata, '{}'::jsonb)
FROM public.vendors v
ON CONFLICT (vendor_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.supplier_audits (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  audit_name       TEXT NOT NULL,
  auditor_name     TEXT,
  audit_score      NUMERIC(6,2),
  risk_level       TEXT,
  audited_at       TIMESTAMPTZ,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_scores (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  quality_score    NUMERIC(6,2) DEFAULT 0,
  risk_score       NUMERIC(6,2) DEFAULT 0,
  delivery_score   NUMERIC(6,2) DEFAULT 0,
  esg_score        NUMERIC(6,2) DEFAULT 0,
  overall_score    NUMERIC(6,2) DEFAULT 0,
  calculated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.score_weights (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weight_quality   NUMERIC(8,4) NOT NULL DEFAULT 0.4,
  weight_risk      NUMERIC(8,4) NOT NULL DEFAULT 0.3,
  weight_delivery  NUMERIC(8,4) NOT NULL DEFAULT 0.3,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.score_weights (weight_quality, weight_risk, weight_delivery, is_active)
SELECT 0.4, 0.3, 0.3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.score_weights);

-- ----------------------------------------------------------------
-- Buyer workspace model
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buyers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.buyer_users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id         UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('admin', 'buyer', 'viewer')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, user_id)
);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES public.buyers(id) ON DELETE SET NULL;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES public.buyers(id) ON DELETE SET NULL;
ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.rfq_suppliers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id           UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'responded', 'rejected')),
  invited_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at     TIMESTAMPTZ,
  UNIQUE (rfq_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS public.rfq_responses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id           UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  price            NUMERIC(14,2),
  lead_time        INTEGER,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS public.supplier_shortlists (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id         UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, supplier_id, project_id)
);

-- ----------------------------------------------------------------
-- Ingestion and AI-ready tables
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_sources (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name      TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('scraping', 'import', 'manual')),
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_raw_data (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id        UUID NOT NULL REFERENCES public.data_sources(id) ON DELETE CASCADE,
  raw_json         JSONB NOT NULL,
  processed        BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_embeddings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  embedding_vector JSONB NOT NULL DEFAULT '[]',
  model_name       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, model_name)
);

-- ----------------------------------------------------------------
-- Analytics
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  profile_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type       TEXT NOT NULL,
  entity_type      TEXT,
  entity_id        TEXT,
  payload          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  key_hash         TEXT NOT NULL UNIQUE,
  key_prefix       TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  scopes           JSONB NOT NULL DEFAULT '[]',
  last_used_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ
);

-- ----------------------------------------------------------------
-- Scale-focused indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_suppliers_country_industry ON public.suppliers(country, industry);
CREATE INDEX IF NOT EXISTS idx_suppliers_search_tsv ON public.suppliers USING GIN(search_tsv);
CREATE INDEX IF NOT EXISTS idx_suppliers_display_name_trgm ON public.suppliers USING GIN(display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_supplier_capabilities_supplier ON public.supplier_capabilities(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_audits_supplier_audited_at ON public.supplier_audits(supplier_id, audited_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_scores_supplier_calculated ON public.supplier_scores(supplier_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfq_suppliers_rfq_status ON public.rfq_suppliers(rfq_id, status);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq_supplier ON public.rfq_responses(rfq_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_shortlists_buyer_project ON public.supplier_shortlists(buyer_id, project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_raw_data_processed_source ON public.supplier_raw_data(processed, source_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_company_status ON public.api_keys(company_id, status);

-- ----------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_buyer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT bu.buyer_id
  FROM public.buyer_users bu
  WHERE bu.user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_buyer_member(p_buyer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.buyer_users bu
    WHERE bu.buyer_id = p_buyer_id
      AND bu.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_supplier_global(p_supplier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.is_platform_admin()
     OR EXISTS (
       SELECT 1
       FROM public.suppliers s
       JOIN public.supplier_users su ON su.supplier_id = s.vendor_id
       WHERE s.id = p_supplier_id
         AND su.user_id = auth.uid()
         AND su.role IN ('admin', 'editor')
     )
$$;

CREATE OR REPLACE FUNCTION public.recompute_supplier_overall_score(p_supplier_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wq NUMERIC := 0.4;
  wr NUMERIC := 0.3;
  wd NUMERIC := 0.3;
  rec_id UUID;
  q NUMERIC := 0;
  r NUMERIC := 0;
  d NUMERIC := 0;
  overall NUMERIC := 0;
BEGIN
  SELECT sw.weight_quality, sw.weight_risk, sw.weight_delivery
    INTO wq, wr, wd
  FROM public.score_weights sw
  WHERE sw.is_active = TRUE
  ORDER BY sw.created_at DESC
  LIMIT 1;

  SELECT ss.id, ss.quality_score, ss.risk_score, ss.delivery_score
    INTO rec_id, q, r, d
  FROM public.supplier_scores ss
  WHERE ss.supplier_id = p_supplier_id
  ORDER BY ss.calculated_at DESC
  LIMIT 1;

  IF rec_id IS NULL THEN
    RETURN 0;
  END IF;

  overall := (coalesce(q, 0) * wq) + (coalesce(r, 0) * wr) + (coalesce(d, 0) * wd);

  UPDATE public.supplier_scores
  SET overall_score = round(overall, 2),
      calculated_at = now()
  WHERE id = rec_id;

  RETURN round(overall, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.after_supplier_score_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.recompute_supplier_overall_score(NEW.supplier_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_supplier_score_change ON public.supplier_scores;
CREATE TRIGGER trg_after_supplier_score_change
AFTER INSERT OR UPDATE OF quality_score, risk_score, delivery_score
ON public.supplier_scores
FOR EACH ROW
EXECUTE FUNCTION public.after_supplier_score_change();

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
  )
  SELECT
    s.id AS supplier_id,
    s.display_name,
    s.country,
    s.industry,
    coalesce(rs.overall_score, 0) AS overall_score,
    coalesce(rs.risk_score, 0) AS risk_score,
    coalesce(ra.audit_score, 0) AS latest_audit_score,
    CASE
      WHEN nullif(trim(coalesce(p_query, '')), '') IS NULL THEN 0
      ELSE ts_rank_cd(s.search_tsv, plainto_tsquery('simple', p_query))
    END AS relevance
  FROM public.suppliers s
  LEFT JOIN ranked_scores rs ON rs.supplier_id = s.id
  LEFT JOIN ranked_audits ra ON ra.supplier_id = s.id
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
    CASE WHEN p_sort_by = 'score' THEN coalesce(rs.overall_score, 0) END DESC,
    s.display_name ASC
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 20), 100))
  OFFSET GREATEST(0, coalesce(p_offset, 0));
$$;

-- ----------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_supplier_capabilities_updated_at ON public.supplier_capabilities;
CREATE TRIGGER update_supplier_capabilities_updated_at
BEFORE UPDATE ON public.supplier_capabilities
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_supplier_audits_updated_at ON public.supplier_audits;
CREATE TRIGGER update_supplier_audits_updated_at
BEFORE UPDATE ON public.supplier_audits
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_buyers_updated_at ON public.buyers;
CREATE TRIGGER update_buyers_updated_at
BEFORE UPDATE ON public.buyers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_rfq_responses_updated_at ON public.rfq_responses;
CREATE TRIGGER update_rfq_responses_updated_at
BEFORE UPDATE ON public.rfq_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_raw_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Suppliers: public read, controlled write
CREATE POLICY "Suppliers public read"
ON public.suppliers FOR SELECT
USING (TRUE);

CREATE POLICY "Suppliers editable by owner or admin"
ON public.suppliers FOR INSERT
WITH CHECK (public.can_edit_supplier_global(id) OR public.is_platform_admin());

CREATE POLICY "Suppliers owner/admin update"
ON public.suppliers FOR UPDATE
USING (public.can_edit_supplier_global(id) OR public.is_platform_admin())
WITH CHECK (public.can_edit_supplier_global(id) OR public.is_platform_admin());

-- Capabilities, audits, scores
CREATE POLICY "Supplier capabilities public read"
ON public.supplier_capabilities FOR SELECT
USING (TRUE);
CREATE POLICY "Supplier capabilities owner/admin write"
ON public.supplier_capabilities FOR ALL
USING (public.can_edit_supplier_global(supplier_id) OR public.is_platform_admin())
WITH CHECK (public.can_edit_supplier_global(supplier_id) OR public.is_platform_admin());

CREATE POLICY "Supplier audits public read"
ON public.supplier_audits FOR SELECT
USING (TRUE);
CREATE POLICY "Supplier audits admin write"
ON public.supplier_audits FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Supplier scores public read"
ON public.supplier_scores FOR SELECT
USING (TRUE);
CREATE POLICY "Supplier scores admin write"
ON public.supplier_scores FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Score weights admin only"
ON public.score_weights FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Buyers and buyer users
CREATE POLICY "Buyer record visible to members"
ON public.buyers FOR SELECT
USING (public.is_platform_admin() OR public.is_buyer_member(id));

CREATE POLICY "Buyer record admin management"
ON public.buyers FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Buyer users visible to buyer members"
ON public.buyer_users FOR SELECT
USING (public.is_platform_admin() OR public.is_buyer_member(buyer_id) OR user_id = auth.uid());

CREATE POLICY "Buyer users admin management"
ON public.buyer_users FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- RFQ relation tables
CREATE POLICY "RFQ suppliers visible to buyer members and platform admins"
ON public.rfq_suppliers FOR SELECT
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.rfqs r
    WHERE r.id = rfq_id
      AND public.is_buyer_member(r.buyer_id)
  )
  OR public.can_edit_supplier_global(supplier_id)
);

CREATE POLICY "RFQ suppliers buyer/admin write"
ON public.rfq_suppliers FOR ALL
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.rfqs r
    WHERE r.id = rfq_id
      AND public.is_buyer_member(r.buyer_id)
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.rfqs r
    WHERE r.id = rfq_id
      AND public.is_buyer_member(r.buyer_id)
  )
);

CREATE POLICY "RFQ responses visible to participants"
ON public.rfq_responses FOR SELECT
USING (
  public.is_platform_admin()
  OR public.can_edit_supplier_global(supplier_id)
  OR EXISTS (
    SELECT 1 FROM public.rfqs r
    WHERE r.id = rfq_id
      AND public.is_buyer_member(r.buyer_id)
  )
);

CREATE POLICY "RFQ responses supplier submit and buyer/admin update"
ON public.rfq_responses FOR INSERT
WITH CHECK (
  public.is_platform_admin()
  OR public.can_edit_supplier_global(supplier_id)
);

CREATE POLICY "RFQ responses buyer/admin/supplier update"
ON public.rfq_responses FOR UPDATE
USING (
  public.is_platform_admin()
  OR public.can_edit_supplier_global(supplier_id)
  OR EXISTS (
    SELECT 1 FROM public.rfqs r
    WHERE r.id = rfq_id
      AND public.is_buyer_member(r.buyer_id)
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR public.can_edit_supplier_global(supplier_id)
  OR EXISTS (
    SELECT 1 FROM public.rfqs r
    WHERE r.id = rfq_id
      AND public.is_buyer_member(r.buyer_id)
  )
);

CREATE POLICY "Shortlists visible and editable by buyer members"
ON public.supplier_shortlists FOR SELECT
USING (public.is_platform_admin() OR public.is_buyer_member(buyer_id));
CREATE POLICY "Shortlists buyer/admin write"
ON public.supplier_shortlists FOR ALL
USING (public.is_platform_admin() OR public.is_buyer_member(buyer_id))
WITH CHECK (public.is_platform_admin() OR public.is_buyer_member(buyer_id));

-- Data pipeline and AI tables admin-only
CREATE POLICY "Data sources admin only"
ON public.data_sources FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Supplier raw data admin only"
ON public.supplier_raw_data FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Supplier embeddings admin only"
ON public.supplier_embeddings FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Analytics: authenticated insert, tenant-scoped read
CREATE POLICY "Analytics insert authenticated"
ON public.analytics_events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Analytics read for platform or tenant"
ON public.analytics_events FOR SELECT
USING (
  public.is_platform_admin()
  OR company_id = public.get_my_company_id()
  OR profile_id = auth.uid()
);

CREATE POLICY "API keys admin read/write"
ON public.api_keys FOR ALL
USING (
  public.is_platform_admin()
  OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'))
)
WITH CHECK (
  public.is_platform_admin()
  OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'))
);
