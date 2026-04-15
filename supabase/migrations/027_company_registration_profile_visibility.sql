-- ============================================================
-- Sequential registration codes (S000001, SP0000001, …),
-- profile visibility tier, external audit flags, auditor company type.
-- ============================================================

-- Allow auditor as tenant account_type (was blocked by CHECK)
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_account_type_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_account_type_check
  CHECK (account_type IN ('seller', 'buyer', 'service_provider', 'auditor'));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS registration_code TEXT;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS visibility_tier TEXT NOT NULL DEFAULT 'incomplete';

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_visibility_tier_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_visibility_tier_check
  CHECK (visibility_tier IN ('incomplete', 'standard', 'premium', 'verified'));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS external_audit_status TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_external_audit_status_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_external_audit_status_check
  CHECK (external_audit_status IN ('none', 'pending', 'passed', 'failed'));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS external_audit_passed_at TIMESTAMPTZ;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS external_audit_notes TEXT;

COMMENT ON COLUMN public.companies.registration_code IS
  'Human-readable platform id: S###### (seller), SP####### (service provider), B####### (buyer), A###### (auditor).';

COMMENT ON COLUMN public.companies.visibility_tier IS
  'incomplete < standard (mandatory profile) < premium (extra media) < verified (external audit passed).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_registration_code
  ON public.companies (registration_code)
  WHERE registration_code IS NOT NULL AND trim(registration_code) <> '';

-- Per–account-type sequences
CREATE SEQUENCE IF NOT EXISTS seq_reg_seller START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_reg_service_provider START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_reg_buyer START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_reg_auditor START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.assign_company_registration_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.registration_code IS NOT NULL AND length(trim(NEW.registration_code)) > 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.account_type = 'seller' THEN
    NEW.registration_code := 'S' || lpad(nextval('seq_reg_seller')::text, 6, '0');
  ELSIF NEW.account_type = 'service_provider' THEN
    NEW.registration_code := 'SP' || lpad(nextval('seq_reg_service_provider')::text, 7, '0');
  ELSIF NEW.account_type = 'buyer' THEN
    NEW.registration_code := 'B' || lpad(nextval('seq_reg_buyer')::text, 7, '0');
  ELSIF NEW.account_type = 'auditor' THEN
    NEW.registration_code := 'A' || lpad(nextval('seq_reg_auditor')::text, 6, '0');
  ELSE
    NEW.registration_code := 'S' || lpad(nextval('seq_reg_seller')::text, 6, '0');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_registration_code ON public.companies;
CREATE TRIGGER trg_company_registration_code
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_company_registration_code();

-- Backfill existing companies (ordered by creation)
WITH numbered AS (
  SELECT
    id,
    account_type,
    row_number() OVER (
      PARTITION BY account_type
      ORDER BY created_at NULLS LAST, id
    ) AS rn
  FROM public.companies
  WHERE registration_code IS NULL OR trim(registration_code) = ''
)
UPDATE public.companies AS c
SET registration_code = CASE n.account_type
  WHEN 'seller' THEN 'S' || lpad(n.rn::text, 6, '0')
  WHEN 'service_provider' THEN 'SP' || lpad(n.rn::text, 7, '0')
  WHEN 'buyer' THEN 'B' || lpad(n.rn::text, 7, '0')
  WHEN 'auditor' THEN 'A' || lpad(n.rn::text, 6, '0')
  ELSE 'S' || lpad(n.rn::text, 6, '0')
END
FROM numbered n
WHERE c.id = n.id;

-- Align sequences with existing codes
SELECT setval(
  'seq_reg_seller',
  GREATEST(
    1,
    COALESCE(
      (SELECT MAX(SUBSTRING(registration_code FROM 2)::bigint)
       FROM public.companies
       WHERE account_type = 'seller'
         AND registration_code ~ '^S[0-9]+$'),
      0
    )
  ),
  true
);

SELECT setval(
  'seq_reg_service_provider',
  GREATEST(
    1,
    COALESCE(
      (SELECT MAX(SUBSTRING(registration_code FROM 3)::bigint)
       FROM public.companies
       WHERE account_type = 'service_provider'
         AND registration_code ~ '^SP[0-9]+$'),
      0
    )
  ),
  true
);

SELECT setval(
  'seq_reg_buyer',
  GREATEST(
    1,
    COALESCE(
      (SELECT MAX(SUBSTRING(registration_code FROM 2)::bigint)
       FROM public.companies
       WHERE account_type = 'buyer'
         AND registration_code ~ '^B[0-9]+$'),
      0
    )
  ),
  true
);

SELECT setval(
  'seq_reg_auditor',
  GREATEST(
    1,
    COALESCE(
      (SELECT MAX(SUBSTRING(registration_code FROM 2)::bigint)
       FROM public.companies
       WHERE account_type = 'auditor'
         AND registration_code ~ '^A[0-9]+$'),
      0
    )
  ),
  true
);

-- Superadmin may update any company (audit / support) — additive RLS policy
DROP POLICY IF EXISTS "Superadmin full update on companies" ON public.companies;
CREATE POLICY "Superadmin full update on companies"
  ON public.companies FOR UPDATE
  USING (public.get_my_role() = 'superadmin')
  WITH CHECK (public.get_my_role() = 'superadmin');

-- Buyers / auditors are not subject to seller-style mandatory directory rules in the app layer.
UPDATE public.companies
SET visibility_tier = 'standard'
WHERE account_type IN ('buyer', 'auditor')
  AND visibility_tier = 'incomplete';

NOTIFY pgrst, 'reload schema';
