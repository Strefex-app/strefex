-- Superadmin may update any profile (account editor). Trigger already allows it;
-- RLS previously limited UPDATE to auth.uid(), so privileged client updates failed.
DROP POLICY IF EXISTS "Superadmin can update any profile" ON public.profiles;
CREATE POLICY "Superadmin can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() = 'superadmin')
  WITH CHECK (public.get_my_role() = 'superadmin');

-- SECURITY DEFINER write so Super Admin account edits always land in companies/profiles
-- even if an older tenant UPDATE policy is still present.
CREATE OR REPLACE FUNCTION public.superadmin_save_company_account(
  p_company_id UUID,
  p_profile_id UUID,
  p_company JSONB,
  p_profile JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload JSONB := coalesce(p_company, '{}'::jsonb);
  prof JSONB := coalesce(p_profile, '{}'::jsonb);
  cid UUID := p_company_id;
  row_c public.companies;
  row_p public.profiles;
  next_name TEXT;
  next_slug TEXT;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'superadmin' THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  next_name := nullif(trim(coalesce(payload->>'name', '')), '');

  IF cid IS NULL THEN
    IF next_name IS NULL THEN
      RAISE EXCEPTION 'company name is required';
    END IF;
    next_slug := nullif(trim(coalesce(payload->>'slug', '')), '');
    IF next_slug IS NULL THEN
      next_slug := 'co-' || substr(replace(uuid_generate_v4()::text, '-', ''), 1, 16);
    END IF;
    INSERT INTO public.companies (
      name,
      slug,
      email,
      phone,
      website,
      country,
      city,
      address,
      account_type,
      plan,
      status,
      industries,
      categories,
      service_categories,
      metadata,
      visibility_tier,
      profile_attachments
    )
    VALUES (
      next_name,
      next_slug,
      nullif(trim(coalesce(payload->>'email', '')), ''),
      nullif(trim(coalesce(payload->>'phone', '')), ''),
      nullif(trim(coalesce(payload->>'website', '')), ''),
      nullif(trim(coalesce(payload->>'country', '')), ''),
      nullif(trim(coalesce(payload->>'city', '')), ''),
      nullif(trim(coalesce(payload->>'address', '')), ''),
      coalesce(nullif(trim(coalesce(payload->>'account_type', '')), ''), 'seller'),
      coalesce(nullif(trim(coalesce(payload->>'plan', '')), ''), 'start'),
      coalesce(nullif(trim(coalesce(payload->>'status', '')), ''), 'active'),
      coalesce(payload->'industries', '[]'::jsonb),
      coalesce(payload->'categories', '{}'::jsonb),
      coalesce(payload->'service_categories', '[]'::jsonb),
      coalesce(payload->'metadata', '{}'::jsonb),
      coalesce(nullif(trim(coalesce(payload->>'visibility_tier', '')), ''), 'incomplete'),
      coalesce(payload->'profile_attachments', '[]'::jsonb)
    )
    RETURNING * INTO row_c;
    cid := row_c.id;
  ELSE
    UPDATE public.companies
    SET
      name = CASE
        WHEN payload ? 'name' AND next_name IS NOT NULL THEN next_name
        ELSE name
      END,
      email = CASE
        WHEN payload ? 'email' AND nullif(trim(coalesce(payload->>'email', '')), '') IS NOT NULL
          THEN trim(payload->>'email')
        ELSE email
      END,
      phone = CASE
        WHEN payload ? 'phone' AND nullif(trim(coalesce(payload->>'phone', '')), '') IS NOT NULL
          THEN trim(payload->>'phone')
        ELSE phone
      END,
      website = CASE
        WHEN payload ? 'website' AND nullif(trim(coalesce(payload->>'website', '')), '') IS NOT NULL
          THEN trim(payload->>'website')
        ELSE website
      END,
      country = CASE
        WHEN payload ? 'country' AND nullif(trim(coalesce(payload->>'country', '')), '') IS NOT NULL
          THEN trim(payload->>'country')
        ELSE country
      END,
      city = CASE
        WHEN payload ? 'city' AND nullif(trim(coalesce(payload->>'city', '')), '') IS NOT NULL
          THEN trim(payload->>'city')
        ELSE city
      END,
      address = CASE
        WHEN payload ? 'address' AND nullif(trim(coalesce(payload->>'address', '')), '') IS NOT NULL
          THEN trim(payload->>'address')
        ELSE address
      END,
      account_type = CASE
        WHEN payload ? 'account_type' AND nullif(trim(coalesce(payload->>'account_type', '')), '') IS NOT NULL
          THEN trim(payload->>'account_type')
        ELSE account_type
      END,
      plan = CASE
        WHEN payload ? 'plan' AND nullif(trim(coalesce(payload->>'plan', '')), '') IS NOT NULL
          THEN trim(payload->>'plan')
        ELSE plan
      END,
      industries = CASE
        WHEN payload ? 'industries' THEN coalesce(payload->'industries', industries)
        ELSE industries
      END,
      categories = CASE
        WHEN payload ? 'categories' THEN coalesce(payload->'categories', categories)
        ELSE categories
      END,
      service_categories = CASE
        WHEN payload ? 'service_categories' THEN coalesce(payload->'service_categories', service_categories)
        ELSE service_categories
      END,
      metadata = CASE
        WHEN payload ? 'metadata' THEN coalesce(metadata, '{}'::jsonb) || coalesce(payload->'metadata', '{}'::jsonb)
        ELSE metadata
      END,
      visibility_tier = CASE
        WHEN payload ? 'visibility_tier' AND nullif(trim(coalesce(payload->>'visibility_tier', '')), '') IS NOT NULL
          THEN trim(payload->>'visibility_tier')
        ELSE visibility_tier
      END,
      profile_attachments = CASE
        WHEN payload ? 'profile_attachments' THEN coalesce(payload->'profile_attachments', profile_attachments)
        ELSE profile_attachments
      END,
      updated_at = now()
    WHERE id = cid
    RETURNING * INTO row_c;

    IF row_c.id IS NULL THEN
      RAISE EXCEPTION 'company not found';
    END IF;
  END IF;

  IF p_profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      company_id = coalesce(cid, company_id),
      full_name = CASE
        WHEN prof ? 'full_name' AND nullif(trim(coalesce(prof->>'full_name', '')), '') IS NOT NULL
          THEN trim(prof->>'full_name')
        ELSE full_name
      END,
      phone = CASE
        WHEN prof ? 'phone' AND nullif(trim(coalesce(prof->>'phone', '')), '') IS NOT NULL
          THEN trim(prof->>'phone')
        ELSE phone
      END,
      metadata = CASE
        WHEN prof ? 'metadata' THEN coalesce(metadata, '{}'::jsonb) || coalesce(prof->'metadata', '{}'::jsonb)
        ELSE metadata
      END,
      updated_at = now()
    WHERE id = p_profile_id
    RETURNING * INTO row_p;
  END IF;

  RETURN jsonb_build_object(
    'company', to_jsonb(row_c),
    'profile', CASE WHEN row_p.id IS NULL THEN NULL ELSE to_jsonb(row_p) END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.superadmin_save_company_account(UUID, UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.superadmin_save_company_account(UUID, UUID, JSONB, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
