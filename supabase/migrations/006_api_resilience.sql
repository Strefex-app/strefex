-- 006 — API resilience: webhook idempotency and checkout throttling ledger

-- -------------------------------------------------------------------
-- Stripe webhook idempotency table
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON public.stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON public.stripe_webhook_events(processed_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages stripe webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Service role manages stripe webhook events"
  ON public.stripe_webhook_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- -------------------------------------------------------------------
-- API request log for distributed rate limiting
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_request_log_endpoint_user_created
  ON public.api_request_log(endpoint, user_id, created_at DESC);

ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages api request log" ON public.api_request_log;
CREATE POLICY "Service role manages api request log"
  ON public.api_request_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
