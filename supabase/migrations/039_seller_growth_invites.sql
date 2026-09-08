-- Seller growth invites (Phase 1): tracked invites with optional Resend delivery metadata.
CREATE TABLE IF NOT EXISTS public.seller_growth_invites (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token             TEXT NOT NULL UNIQUE,
  invitee_email     TEXT NOT NULL,
  invitee_name      TEXT,
  inviter_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  inviter_email     TEXT,
  inviter_company   TEXT,
  company_id        UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  source            TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual', 'rfq', 'messenger', 'admin')),
  rfq_id            TEXT,
  rfq_title         TEXT,
  message           TEXT,
  register_url      TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'accepted', 'expired', 'revoked', 'bounced')),
  provider          TEXT,
  provider_message_id TEXT,
  last_error        TEXT,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  sent_at           TIMESTAMPTZ,
  accepted_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_growth_invites_invitee
  ON public.seller_growth_invites (lower(invitee_email));
CREATE INDEX IF NOT EXISTS idx_seller_growth_invites_inviter
  ON public.seller_growth_invites (inviter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_growth_invites_token
  ON public.seller_growth_invites (token);

ALTER TABLE public.seller_growth_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Inviters can read own seller growth invites" ON public.seller_growth_invites;
CREATE POLICY "Inviters can read own seller growth invites"
  ON public.seller_growth_invites FOR SELECT
  USING (
    public.get_my_role() = 'superadmin'
    OR inviter_user_id = auth.uid()
    OR lower(inviter_email) = lower(coalesce(
      (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()),
      ''
    ))
  );

-- Inserts/updates go through service role in the Edge Function.
DROP POLICY IF EXISTS "No direct client insert on seller growth invites" ON public.seller_growth_invites;
CREATE POLICY "No direct client insert on seller growth invites"
  ON public.seller_growth_invites FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "No direct client update on seller growth invites" ON public.seller_growth_invites;
CREATE POLICY "No direct client update on seller growth invites"
  ON public.seller_growth_invites FOR UPDATE
  USING (public.get_my_role() = 'superadmin')
  WITH CHECK (public.get_my_role() = 'superadmin');

COMMENT ON TABLE public.seller_growth_invites IS
  'Organic seller invites; outbound mail via Resend Edge Function send-seller-invite.';
