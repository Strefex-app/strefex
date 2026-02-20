-- ============================================================
-- 002 — Subscriptions table for Stripe billing
-- ============================================================
-- Tracks each company / user's active Stripe subscription.
-- Updated by the stripe-webhook Edge Function.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id              UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  stripe_customer_id      TEXT NOT NULL,
  stripe_subscription_id  TEXT NOT NULL UNIQUE,
  plan_id                 TEXT NOT NULL DEFAULT 'start',
  status                  TEXT NOT NULL DEFAULT 'active',
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user       ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company    ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer   ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status     ON public.subscriptions(status);

-- Auto-update updated_at
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Company admins can view all subscriptions for their company
CREATE POLICY "Company admins can view company subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    company_id IN (
      SELECT p.company_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
    )
  );

-- Only the service role (webhook) can insert/update/delete
CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');
