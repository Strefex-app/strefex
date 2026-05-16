-- Backfill companies.registration_code where NULL/blank (e.g. rows created before trigger or manual inserts).
-- Uses current max numeric suffix per format so new codes stay unique and sequences stay aligned.

-- Sellers: S + 6 digits
WITH mx AS (
  SELECT COALESCE(MAX(SUBSTRING(registration_code FROM 2)::bigint), 0) AS mx
  FROM public.companies
  WHERE account_type = 'seller'
    AND registration_code ~ '^S[0-9]+$'
),
numbered AS (
  SELECT c.id,
    row_number() OVER (ORDER BY c.created_at NULLS LAST, c.id) AS rn
  FROM public.companies c
  WHERE c.account_type = 'seller'
    AND (c.registration_code IS NULL OR trim(c.registration_code) = '')
)
UPDATE public.companies AS c
SET registration_code = 'S' || lpad((mx.mx + numbered.rn)::text, 6, '0')
FROM numbered
CROSS JOIN mx
WHERE c.id = numbered.id;

-- Service providers: SP + 7 digits
WITH mx AS (
  SELECT COALESCE(MAX(SUBSTRING(registration_code FROM 3)::bigint), 0) AS mx
  FROM public.companies
  WHERE account_type = 'service_provider'
    AND registration_code ~ '^SP[0-9]+$'
),
numbered AS (
  SELECT c.id,
    row_number() OVER (ORDER BY c.created_at NULLS LAST, c.id) AS rn
  FROM public.companies c
  WHERE c.account_type = 'service_provider'
    AND (c.registration_code IS NULL OR trim(c.registration_code) = '')
)
UPDATE public.companies AS c
SET registration_code = 'SP' || lpad((mx.mx + numbered.rn)::text, 7, '0')
FROM numbered
CROSS JOIN mx
WHERE c.id = numbered.id;

-- Buyers: B + 7 digits
WITH mx AS (
  SELECT COALESCE(MAX(SUBSTRING(registration_code FROM 2)::bigint), 0) AS mx
  FROM public.companies
  WHERE account_type = 'buyer'
    AND registration_code ~ '^B[0-9]+$'
),
numbered AS (
  SELECT c.id,
    row_number() OVER (ORDER BY c.created_at NULLS LAST, c.id) AS rn
  FROM public.companies c
  WHERE c.account_type = 'buyer'
    AND (c.registration_code IS NULL OR trim(c.registration_code) = '')
)
UPDATE public.companies AS c
SET registration_code = 'B' || lpad((mx.mx + numbered.rn)::text, 7, '0')
FROM numbered
CROSS JOIN mx
WHERE c.id = numbered.id;

-- Auditors: A + 6 digits
WITH mx AS (
  SELECT COALESCE(MAX(SUBSTRING(registration_code FROM 2)::bigint), 0) AS mx
  FROM public.companies
  WHERE account_type = 'auditor'
    AND registration_code ~ '^A[0-9]+$'
),
numbered AS (
  SELECT c.id,
    row_number() OVER (ORDER BY c.created_at NULLS LAST, c.id) AS rn
  FROM public.companies c
  WHERE c.account_type = 'auditor'
    AND (c.registration_code IS NULL OR trim(c.registration_code) = '')
)
UPDATE public.companies AS c
SET registration_code = 'A' || lpad((mx.mx + numbered.rn)::text, 6, '0')
FROM numbered
CROSS JOIN mx
WHERE c.id = numbered.id;

-- Re-align sequences (same logic as migration 027)
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

NOTIFY pgrst, 'reload schema';
