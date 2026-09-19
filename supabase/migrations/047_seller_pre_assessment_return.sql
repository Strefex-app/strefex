-- Seller returns the pre-assessment from Profile without changing auditor, visit date, or badges.

CREATE OR REPLACE FUNCTION public.submit_seller_pre_assessment(p_notes TEXT)
RETURNS public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid UUID;
  row_out public.companies;
BEGIN
  cid := public.get_my_company_id();
  IF cid IS NULL THEN
    RAISE EXCEPTION 'no company';
  END IF;

  UPDATE public.companies
  SET external_audit_notes = nullif(trim(coalesce(p_notes, '')), '')
  WHERE id = cid
  RETURNING * INTO row_out;

  IF row_out.id IS NULL THEN
    RAISE EXCEPTION 'company not found';
  END IF;

  RETURN row_out;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_seller_pre_assessment(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_seller_pre_assessment(TEXT) TO authenticated;
