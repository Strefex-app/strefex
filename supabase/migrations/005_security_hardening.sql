-- 005 — Production security hardening and subscriptions reconciliation

-- -------------------------------------------------------------------
-- Subscriptions schema reconciliation
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  industry TEXT NOT NULL DEFAULT 'general',
  tier TEXT NOT NULL DEFAULT 'basic',
  plan_id TEXT NOT NULL DEFAULT 'basic',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS industry TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Keep status normalization backward compatible.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('pending', 'trialing', 'active', 'past_due', 'unpaid', 'inactive', 'canceled', 'cancelled'));

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_tier_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier IN ('free', 'basic', 'standard', 'premium', 'enterprise'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_industry
  ON public.subscriptions(user_id, industry);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription
  ON public.subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- -------------------------------------------------------------------
-- Subscriptions RLS hardening
-- -------------------------------------------------------------------
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Company admins can view company subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Company admins can view company subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('admin', 'superadmin')
  );

CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- -------------------------------------------------------------------
-- Notifications / audit logs insert hardening
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenant insert" ON public.notifications;
CREATE POLICY "Tenant insert"
  ON public.notifications FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      profile_id = auth.uid()
      OR company_id = public.get_my_company_id()
      OR public.get_my_role() = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.audit_logs;
CREATE POLICY "Only authenticated tenant can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      company_id = public.get_my_company_id()
      OR public.get_my_role() = 'superadmin'
    )
  );

-- -------------------------------------------------------------------
-- Storage policy hardening for documents bucket
-- Enforces first path segment to match caller company_id.
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view company documents" ON storage.objects;

CREATE POLICY "Users can upload own company documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = public.get_my_company_id()::text
  );

CREATE POLICY "Users can view own company documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = public.get_my_company_id()::text
      OR public.get_my_role() IN ('superadmin', 'auditor_external')
    )
  );

CREATE POLICY "Users can update own company documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = public.get_my_company_id()::text
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.get_my_company_id()::text
  );

CREATE POLICY "Admins can delete own company documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = public.get_my_company_id()::text
    AND public.get_my_role() IN ('superadmin', 'admin')
  );
