-- Server-backed feature grants (replaces client-only localStorage grants).
CREATE TABLE IF NOT EXISTS public.feature_grants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id    TEXT,
  company       TEXT,
  email         TEXT NOT NULL,
  account_type  TEXT,
  plan          TEXT,
  feature_key   TEXT NOT NULL,
  feature_label TEXT,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ,
  period_days   INTEGER,
  granted_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_grants_email ON public.feature_grants (lower(email));
CREATE INDEX IF NOT EXISTS idx_feature_grants_feature_key ON public.feature_grants (feature_key);

ALTER TABLE public.feature_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feature grants readable by owner or superadmin" ON public.feature_grants;
CREATE POLICY "Feature grants readable by owner or superadmin"
  ON public.feature_grants FOR SELECT
  USING (
    public.get_my_role() = 'superadmin'
    OR lower(email) = lower(coalesce((SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()), ''))
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Feature grants writable by superadmin" ON public.feature_grants;
CREATE POLICY "Feature grants writable by superadmin"
  ON public.feature_grants FOR INSERT
  WITH CHECK (public.get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Feature grants updatable by superadmin" ON public.feature_grants;
CREATE POLICY "Feature grants updatable by superadmin"
  ON public.feature_grants FOR UPDATE
  USING (public.get_my_role() = 'superadmin')
  WITH CHECK (public.get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Feature grants deletable by superadmin" ON public.feature_grants;
CREATE POLICY "Feature grants deletable by superadmin"
  ON public.feature_grants FOR DELETE
  USING (public.get_my_role() = 'superadmin');
