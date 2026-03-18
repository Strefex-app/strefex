-- ============================================================
-- Supplier Ownership, Editing, and Verification
-- ============================================================

-- ----------------------------------------------------------------
-- Helper functions
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_my_role() IN ('superadmin', 'auditor_external')
$$;

CREATE OR REPLACE FUNCTION public.domain_from_email(p_email TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(lower(trim(coalesce(p_email, ''))), '@', 2), '')
$$;

CREATE OR REPLACE FUNCTION public.domain_from_url(p_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned TEXT := lower(trim(coalesce(p_url, '')));
BEGIN
  IF cleaned = '' THEN
    RETURN NULL;
  END IF;
  cleaned := regexp_replace(cleaned, '^https?://', '');
  cleaned := regexp_replace(cleaned, '^www\.', '');
  cleaned := split_part(cleaned, '/', 1);
  RETURN NULLIF(cleaned, '');
END;
$$;

-- ----------------------------------------------------------------
-- Core tables
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_claims (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id         UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verification_method TEXT NOT NULL CHECK (verification_method IN ('email_domain', 'manual', 'document')),
  review_note         TEXT,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.supplier_profiles (
  supplier_id           UUID PRIMARY KEY REFERENCES public.vendors(id) ON DELETE CASCADE,
  description           TEXT,
  website               TEXT,
  contact_email         TEXT,
  phone                 TEXT,
  profile_completeness  INTEGER NOT NULL DEFAULT 0 CHECK (profile_completeness BETWEEN 0 AND 100),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by            UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.supplier_products (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_name          TEXT NOT NULL,
  category              TEXT,
  manufacturing_process TEXT,
  material              TEXT,
  description           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES auth.users(id),
  updated_by            UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.supplier_certifications (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id        UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  certification_name TEXT NOT NULL,
  issuing_body       TEXT,
  valid_until        DATE,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  review_note        TEXT,
  reviewed_at        TIMESTAMPTZ,
  reviewed_by        UUID REFERENCES auth.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by         UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.change_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id  TEXT NOT NULL,
  supplier_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value  TEXT,
  new_value  TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Access helpers depend on supplier_users table.
CREATE OR REPLACE FUNCTION public.is_supplier_member(p_supplier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supplier_users su
    WHERE su.supplier_id = p_supplier_id
      AND su.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.get_supplier_member_role(p_supplier_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT su.role
  FROM public.supplier_users su
  WHERE su.supplier_id = p_supplier_id
    AND su.user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_edit_supplier(p_supplier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.is_platform_admin()
         OR public.get_supplier_member_role(p_supplier_id) IN ('admin', 'editor')
$$;

-- ----------------------------------------------------------------
-- Indexes for scale
-- ----------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_claims_supplier_user ON public.supplier_claims(supplier_id, user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_claims_status_created ON public.supplier_claims(status, created_at);
CREATE INDEX IF NOT EXISTS idx_supplier_users_user_supplier ON public.supplier_users(user_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_updated ON public.supplier_products(supplier_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_certifications_supplier_status ON public.supplier_certifications(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_change_logs_supplier_table_created ON public.change_logs(supplier_id, table_name, created_at DESC);

-- ----------------------------------------------------------------
-- Auto-approval and claim guards
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_review_supplier_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  user_domain TEXT;
  website_domain TEXT;
  contact_domain TEXT;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.supplier_claims sc
    WHERE sc.supplier_id = NEW.supplier_id
      AND sc.user_id = NEW.user_id
      AND sc.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending claim already exists for this supplier and user.';
  END IF;

  IF NEW.verification_method = 'email_domain' THEN
    SELECT au.email
    INTO user_email
    FROM auth.users au
    WHERE au.id = NEW.user_id;

    user_domain := public.domain_from_email(user_email);

    SELECT public.domain_from_url(sp.website), public.domain_from_email(sp.contact_email)
      INTO website_domain, contact_domain
    FROM public.supplier_profiles sp
    WHERE sp.supplier_id = NEW.supplier_id;

    IF website_domain IS NULL THEN
      SELECT public.domain_from_url(v.general->>'website')
        INTO website_domain
      FROM public.vendors v
      WHERE v.id = NEW.supplier_id;
    END IF;

    IF user_domain IS NOT NULL AND (
      user_domain = website_domain
      OR (contact_domain IS NOT NULL AND user_domain = contact_domain)
    ) THEN
      NEW.status := 'approved';
      NEW.reviewed_at := now();
      NEW.reviewed_by := NEW.user_id;
      NEW.review_note := 'Auto-approved by email domain match';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_review_supplier_claim ON public.supplier_claims;
CREATE TRIGGER trg_auto_review_supplier_claim
BEFORE INSERT ON public.supplier_claims
FOR EACH ROW
EXECUTE FUNCTION public.auto_review_supplier_claim();

CREATE OR REPLACE FUNCTION public.sync_supplier_user_after_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO public.supplier_users (supplier_id, user_id, role, created_by)
    VALUES (NEW.supplier_id, NEW.user_id, 'admin', COALESCE(NEW.reviewed_by, auth.uid()))
    ON CONFLICT (supplier_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_supplier_user_after_claim ON public.supplier_claims;
CREATE TRIGGER trg_sync_supplier_user_after_claim
AFTER INSERT OR UPDATE OF status ON public.supplier_claims
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION public.sync_supplier_user_after_claim();

-- ----------------------------------------------------------------
-- Completeness scoring
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_supplier_profile_completeness(p_supplier_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  score INTEGER := 0;
  has_desc BOOLEAN := FALSE;
  products_count INTEGER := 0;
  certs_count INTEGER := 0;
  website_text TEXT := '';
  contact_email_text TEXT := '';
  phone_text TEXT := '';
  contact_signals INTEGER := 0;
BEGIN
  SELECT
    (length(trim(coalesce(sp.description, ''))) > 0),
    coalesce(sp.website, ''),
    coalesce(sp.contact_email, ''),
    coalesce(sp.phone, '')
  INTO has_desc, website_text, contact_email_text, phone_text
  FROM public.supplier_profiles sp
  WHERE sp.supplier_id = p_supplier_id;

  SELECT count(*) INTO products_count
  FROM public.supplier_products p
  WHERE p.supplier_id = p_supplier_id;

  SELECT count(*) INTO certs_count
  FROM public.supplier_certifications c
  WHERE c.supplier_id = p_supplier_id;

  IF has_desc THEN score := score + 20; END IF;
  IF products_count > 0 THEN score := score + 30; END IF;
  IF certs_count > 0 THEN score := score + 30; END IF;

  IF length(trim(website_text)) > 0 THEN contact_signals := contact_signals + 1; END IF;
  IF length(trim(contact_email_text)) > 0 THEN contact_signals := contact_signals + 1; END IF;
  IF length(trim(phone_text)) > 0 THEN contact_signals := contact_signals + 1; END IF;
  score := score + round((contact_signals::numeric / 3.0) * 20.0)::integer;

  UPDATE public.supplier_profiles
  SET profile_completeness = LEAST(100, GREATEST(0, score))
  WHERE supplier_id = p_supplier_id
    AND profile_completeness IS DISTINCT FROM LEAST(100, GREATEST(0, score));

  RETURN LEAST(100, GREATEST(0, score));
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_supplier_profile_completeness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sid UUID;
BEGIN
  sid := COALESCE(NEW.supplier_id, OLD.supplier_id);
  IF sid IS NOT NULL THEN
    PERFORM public.recompute_supplier_profile_completeness(sid);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_profile_completeness_profiles ON public.supplier_profiles;
CREATE TRIGGER trg_supplier_profile_completeness_profiles
AFTER INSERT OR UPDATE OF description, website, contact_email, phone ON public.supplier_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_supplier_profile_completeness();

DROP TRIGGER IF EXISTS trg_supplier_profile_completeness_products ON public.supplier_products;
CREATE TRIGGER trg_supplier_profile_completeness_products
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_products
FOR EACH ROW
EXECUTE FUNCTION public.sync_supplier_profile_completeness();

DROP TRIGGER IF EXISTS trg_supplier_profile_completeness_certs ON public.supplier_certifications;
CREATE TRIGGER trg_supplier_profile_completeness_certs
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_certifications
FOR EACH ROW
EXECUTE FUNCTION public.sync_supplier_profile_completeness();

-- ----------------------------------------------------------------
-- Certification status governance
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_supplier_certification_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status <> OLD.status
     AND NOT public.is_platform_admin()
  THEN
    RAISE EXCEPTION 'Only platform admin can change certification status to verified/rejected';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_certification_status ON public.supplier_certifications;
CREATE TRIGGER trg_guard_supplier_certification_status
BEFORE UPDATE ON public.supplier_certifications
FOR EACH ROW
EXECUTE FUNCTION public.guard_supplier_certification_status();

-- ----------------------------------------------------------------
-- Generic field-level change log trigger
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_supplier_field_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  k TEXT;
  old_json JSONB;
  new_json JSONB;
  old_txt TEXT;
  new_txt TEXT;
  sid UUID;
  rid TEXT;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  old_json := to_jsonb(OLD);
  new_json := to_jsonb(NEW);
  sid := COALESCE(NEW.supplier_id, OLD.supplier_id);
  rid := COALESCE(
    NULLIF((new_json->>'id'), ''),
    NULLIF((new_json->>'supplier_id'), ''),
    NULLIF((old_json->>'id'), ''),
    NULLIF((old_json->>'supplier_id'), '')
  );

  FOR k IN SELECT jsonb_object_keys(new_json)
  LOOP
    IF k IN ('updated_at', 'updated_by') THEN
      CONTINUE;
    END IF;
    old_txt := old_json->>k;
    new_txt := new_json->>k;
    IF old_txt IS DISTINCT FROM new_txt THEN
      INSERT INTO public.change_logs (
        table_name, record_id, supplier_id, field_name, old_value, new_value, changed_by
      )
      VALUES (
        TG_TABLE_NAME, COALESCE(rid, ''), sid, k, old_txt, new_txt, auth.uid()
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_supplier_profile_changes ON public.supplier_profiles;
CREATE TRIGGER trg_log_supplier_profile_changes
AFTER UPDATE ON public.supplier_profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_supplier_field_changes();

DROP TRIGGER IF EXISTS trg_log_supplier_products_changes ON public.supplier_products;
CREATE TRIGGER trg_log_supplier_products_changes
AFTER UPDATE ON public.supplier_products
FOR EACH ROW
EXECUTE FUNCTION public.log_supplier_field_changes();

DROP TRIGGER IF EXISTS trg_log_supplier_certifications_changes ON public.supplier_certifications;
CREATE TRIGGER trg_log_supplier_certifications_changes
AFTER UPDATE ON public.supplier_certifications
FOR EACH ROW
EXECUTE FUNCTION public.log_supplier_field_changes();

-- ----------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS update_supplier_profiles_updated_at ON public.supplier_profiles;
CREATE TRIGGER update_supplier_profiles_updated_at
BEFORE UPDATE ON public.supplier_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_supplier_products_updated_at ON public.supplier_products;
CREATE TRIGGER update_supplier_products_updated_at
BEFORE UPDATE ON public.supplier_products
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_supplier_certifications_updated_at ON public.supplier_certifications;
CREATE TRIGGER update_supplier_certifications_updated_at
BEFORE UPDATE ON public.supplier_certifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------
ALTER TABLE public.supplier_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_logs ENABLE ROW LEVEL SECURITY;

-- supplier_claims
CREATE POLICY "Supplier claims visible to requester or platform admin"
ON public.supplier_claims FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_platform_admin()
  OR public.is_supplier_member(supplier_id)
);

CREATE POLICY "Authenticated users can create own supplier claims"
ON public.supplier_claims FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND status IN ('pending', 'approved')
);

CREATE POLICY "Platform admin can review supplier claims"
ON public.supplier_claims FOR UPDATE
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- supplier_users
CREATE POLICY "Supplier users visible to own account or platform admin"
ON public.supplier_users FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_platform_admin()
  OR public.is_supplier_member(supplier_id)
);

CREATE POLICY "Platform admin manages supplier users"
ON public.supplier_users FOR INSERT
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Platform admin updates supplier users"
ON public.supplier_users FOR UPDATE
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Platform admin deletes supplier users"
ON public.supplier_users FOR DELETE
USING (public.is_platform_admin());

-- supplier_profiles
CREATE POLICY "Authenticated users can read supplier profiles"
ON public.supplier_profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supplier editors and platform admin insert profiles"
ON public.supplier_profiles FOR INSERT
WITH CHECK (public.can_edit_supplier(supplier_id));

CREATE POLICY "Supplier editors and platform admin update profiles"
ON public.supplier_profiles FOR UPDATE
USING (public.can_edit_supplier(supplier_id))
WITH CHECK (public.can_edit_supplier(supplier_id));

-- supplier_products
CREATE POLICY "Authenticated users can read supplier products"
ON public.supplier_products FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supplier editors and platform admin insert products"
ON public.supplier_products FOR INSERT
WITH CHECK (public.can_edit_supplier(supplier_id));

CREATE POLICY "Supplier editors and platform admin update products"
ON public.supplier_products FOR UPDATE
USING (public.can_edit_supplier(supplier_id))
WITH CHECK (public.can_edit_supplier(supplier_id));

CREATE POLICY "Supplier admins and platform admin delete products"
ON public.supplier_products FOR DELETE
USING (
  public.is_platform_admin()
  OR public.get_supplier_member_role(supplier_id) = 'admin'
);

-- supplier_certifications
CREATE POLICY "Authenticated users can read supplier certifications"
ON public.supplier_certifications FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supplier editors can submit pending certifications"
ON public.supplier_certifications FOR INSERT
WITH CHECK (
  public.can_edit_supplier(supplier_id)
  AND status = 'pending'
);

CREATE POLICY "Supplier editors can update pending certification details"
ON public.supplier_certifications FOR UPDATE
USING (
  public.can_edit_supplier(supplier_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_platform_admin()
  OR (public.can_edit_supplier(supplier_id) AND status = 'pending')
);

-- change_logs
CREATE POLICY "Supplier change logs visible to members and platform admin"
ON public.change_logs FOR SELECT
USING (
  public.is_platform_admin()
  OR public.is_supplier_member(supplier_id)
);

CREATE POLICY "Authenticated users can insert change logs"
ON public.change_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
