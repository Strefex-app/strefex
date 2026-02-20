-- ============================================================
-- STREFEX Platform — Supabase Database Schema
-- ============================================================
-- Multi-tenant schema with Row Level Security (RLS).
-- Every tenant-scoped table has a `company_id` column.
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. COMPANIES (tenants)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE,
  email         TEXT,
  phone         TEXT,
  country       TEXT,
  city          TEXT,
  address       TEXT,
  website       TEXT,
  account_type  TEXT CHECK (account_type IN ('seller', 'buyer', 'service_provider')) DEFAULT 'seller',
  plan          TEXT DEFAULT 'start',
  status        TEXT DEFAULT 'active',
  industries    JSONB DEFAULT '[]',
  categories    JSONB DEFAULT '{}',
  service_categories JSONB DEFAULT '[]',
  coordinates   JSONB DEFAULT '[]',
  rating        NUMERIC(3,2),
  certifications JSONB DEFAULT '[]',
  employees     INTEGER,
  established   INTEGER,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  email         TEXT NOT NULL,
  full_name     TEXT,
  phone         TEXT,
  role          TEXT DEFAULT 'user' CHECK (role IN (
    'superadmin', 'auditor_external', 'admin', 'auditor_internal', 'manager', 'user', 'guest'
  )),
  avatar_url    TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  status        TEXT DEFAULT 'active',
  invited_by    UUID REFERENCES public.profiles(id),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TEAM MEMBERS (company-level invitations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT DEFAULT 'user',
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
  invited_by    UUID REFERENCES public.profiles(id),
  invited_at    TIMESTAMPTZ DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ,
  UNIQUE(company_id, email)
);

-- ============================================================
-- 4. PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES public.profiles(id),
  name          TEXT NOT NULL,
  budget        NUMERIC(14,2) DEFAULT 0,
  currency      TEXT DEFAULT 'USD',
  status        TEXT DEFAULT 'active',
  tasks         JSONB DEFAULT '[]',
  revisions     JSONB DEFAULT '[]',
  resources     JSONB DEFAULT '[]',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. RFQS (Request for Quotation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rfqs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES public.profiles(id),
  title         TEXT NOT NULL,
  industry_id   TEXT,
  category_id   TEXT,
  status        TEXT DEFAULT 'draft',
  due_date      DATE,
  buyer_company TEXT,
  buyer_email   TEXT,
  requirements  JSONB DEFAULT '{}',
  suppliers     JSONB DEFAULT '[]',
  attachments   JSONB DEFAULT '[]',
  responses     JSONB DEFAULT '[]',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  sent_at       TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. CONTRACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contracts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES public.profiles(id),
  title         TEXT NOT NULL,
  type          TEXT,
  vendor_id     TEXT,
  vendor_name   TEXT,
  category      TEXT,
  value         NUMERIC(14,2) DEFAULT 0,
  currency      TEXT DEFAULT 'USD',
  start_date    DATE,
  end_date      DATE,
  renewal_date  DATE,
  auto_renew    BOOLEAN DEFAULT FALSE,
  status        TEXT DEFAULT 'draft',
  priority      TEXT DEFAULT 'medium',
  terms         TEXT,
  owner         TEXT,
  department    TEXT,
  documents     JSONB DEFAULT '[]',
  milestones    JSONB DEFAULT '[]',
  notes         TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. PROCUREMENT (PRs and POs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.procurement_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES public.profiles(id),
  type          TEXT NOT NULL CHECK (type IN ('pr', 'po')),
  title         TEXT NOT NULL,
  description   TEXT,
  requester     TEXT,
  department    TEXT,
  category      TEXT,
  priority      TEXT DEFAULT 'medium',
  currency      TEXT DEFAULT 'USD',
  items         JSONB DEFAULT '[]',
  total_amount  NUMERIC(14,2) DEFAULT 0,
  vendor_id     TEXT,
  vendor_name   TEXT,
  status        TEXT DEFAULT 'draft',
  approval_chain JSONB DEFAULT '[]',
  linked_pr_id  UUID REFERENCES public.procurement_items(id),
  linked_po_id  UUID REFERENCES public.procurement_items(id),
  delivery_date DATE,
  payment_terms TEXT,
  receiving_status TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. VENDORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES public.profiles(id),
  vendor_number TEXT,
  status        TEXT DEFAULT 'draft',
  general       JSONB DEFAULT '{}',
  addresses     JSONB DEFAULT '{}',
  contacts      JSONB DEFAULT '[]',
  banking       JSONB DEFAULT '{}',
  purchasing    JSONB DEFAULT '{}',
  certifications JSONB DEFAULT '[]',
  connections   JSONB DEFAULT '[]',
  documents     JSONB DEFAULT '[]',
  evaluations   JSONB DEFAULT '[]',
  complaints    JSONB DEFAULT '[]',
  notes         JSONB DEFAULT '[]',
  change_log    JSONB DEFAULT '[]',
  status_reason TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. TRANSACTIONS (financial)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES public.profiles(id),
  invoice_id    TEXT,
  type          TEXT,
  service       TEXT,
  amount        NUMERIC(14,2) DEFAULT 0,
  currency      TEXT DEFAULT 'USD',
  method        TEXT,
  status        TEXT DEFAULT 'pending',
  user_email    TEXT,
  company_name  TEXT,
  plan_from     TEXT,
  plan_to       TEXT,
  account_type  TEXT,
  requested_by  TEXT,
  task_status   TEXT,
  assigned_to   TEXT,
  assigned_by   TEXT,
  assigned_at   TIMESTAMPTZ,
  approved_by   TEXT,
  approved_at   TIMESTAMPTZ,
  rejected_by   TEXT,
  rejection_reason TEXT,
  paid_by       TEXT,
  paid_at       TIMESTAMPTZ,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. SERVICE REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES public.profiles(id),
  services      JSONB DEFAULT '[]',
  industry_id   TEXT,
  company_name  TEXT,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  preferred_date DATE,
  priority      TEXT DEFAULT 'normal',
  description   TEXT,
  notes         TEXT,
  attachment_names JSONB DEFAULT '[]',
  account_type  TEXT,
  status        TEXT DEFAULT 'new',
  assigned_to   TEXT,
  assigned_by   TEXT,
  assigned_at   TIMESTAMPTZ,
  admin_notes   JSONB DEFAULT '[]',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id    UUID REFERENCES public.profiles(id),
  type          TEXT,
  request_id    UUID,
  title         TEXT,
  message       TEXT,
  priority      TEXT DEFAULT 'normal',
  from_email    TEXT,
  from_name     TEXT,
  from_company  TEXT,
  target_email  TEXT,
  read          BOOLEAN DEFAULT FALSE,
  read_by       JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES public.profiles(id),
  name          TEXT NOT NULL,
  category      TEXT,
  description   TEXT,
  format        TEXT,
  pages         INTEGER DEFAULT 1,
  downloads     INTEGER DEFAULT 0,
  rating        NUMERIC(3,2) DEFAULT 0,
  tags          JSONB DEFAULT '[]',
  icon          TEXT,
  featured      BOOLEAN DEFAULT FALSE,
  files         JSONB DEFAULT '[]',
  status        TEXT DEFAULT 'draft',
  approved_by   TEXT,
  approved_at   TIMESTAMPTZ,
  rejection_note TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id    UUID REFERENCES public.profiles(id),
  user_email    TEXT,
  user_role     TEXT,
  module        TEXT,
  action        TEXT,
  entity        TEXT,
  description   TEXT,
  details       JSONB DEFAULT '{}',
  severity      TEXT DEFAULT 'info',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. WALLET ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  balance       NUMERIC(14,2) DEFAULT 0,
  currency      TEXT DEFAULT 'USD',
  escrow_held   NUMERIC(14,2) DEFAULT 0,
  total_deposited NUMERIC(14,2) DEFAULT 0,
  total_withdrawn NUMERIC(14,2) DEFAULT 0,
  total_sent    NUMERIC(14,2) DEFAULT 0,
  total_received NUMERIC(14,2) DEFAULT 0,
  security      JSONB DEFAULT '{}',
  payment_methods JSONB DEFAULT '[]',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. WALLET TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id     UUID REFERENCES public.wallet_accounts(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type          TEXT,
  amount        NUMERIC(14,2) DEFAULT 0,
  currency      TEXT DEFAULT 'USD',
  status        TEXT DEFAULT 'pending',
  description   TEXT,
  counterparty  TEXT,
  payment_method_id TEXT,
  reference     TEXT,
  security_verified BOOLEAN DEFAULT FALSE,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- ============================================================
-- 16. ESCROW TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id     UUID REFERENCES public.wallet_accounts(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  buyer_email   TEXT,
  seller_email  TEXT,
  seller_name   TEXT,
  amount        NUMERIC(14,2) DEFAULT 0,
  currency      TEXT DEFAULT 'USD',
  description   TEXT,
  status        TEXT DEFAULT 'pending',
  rfq_id        UUID,
  dispute_reason TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  funded_at     TIMESTAMPTZ,
  released_at   TIMESTAMPTZ
);

-- ============================================================
-- 17. PRODUCTION DATA (JSONB for deeply nested structures)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.production_data (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data_type     TEXT NOT NULL,
  data          JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. COST DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cost_data (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data_type     TEXT NOT NULL,
  data          JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 19. ENTERPRISE COST DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enterprise_data (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data_type     TEXT NOT NULL,
  data          JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 20. FILE STORAGE METADATA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.file_metadata (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by   UUID REFERENCES public.profiles(id),
  bucket        TEXT NOT NULL DEFAULT 'documents',
  path          TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    BIGINT DEFAULT 0,
  entity_type   TEXT,
  entity_id     UUID,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_team_members_company ON public.team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members(email);
CREATE INDEX IF NOT EXISTS idx_projects_company ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_company ON public.rfqs(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_procurement_company ON public.procurement_items(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_company ON public.vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_company ON public.service_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_company ON public.templates(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_company ON public.wallet_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_company ON public.wallet_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_escrow_company ON public.escrow_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_production_company ON public.production_data(company_id);
CREATE INDEX IF NOT EXISTS idx_production_type ON public.production_data(company_id, data_type);
CREATE INDEX IF NOT EXISTS idx_cost_company ON public.cost_data(company_id, data_type);
CREATE INDEX IF NOT EXISTS idx_enterprise_company ON public.enterprise_data(company_id, data_type);
CREATE INDEX IF NOT EXISTS idx_files_company ON public.file_metadata(company_id);
CREATE INDEX IF NOT EXISTS idx_files_entity ON public.file_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_email ON public.companies(email);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_metadata ENABLE ROW LEVEL SECURITY;


-- ── Helper: get the current user's company_id from their profile ──
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ── Helper: get the current user's role ──
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;


-- ── COMPANIES policies ──────────────────────────────────────
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));

CREATE POLICY "Admins can update their own company"
  ON public.companies FOR UPDATE
  USING (id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'))
  WITH CHECK (id = public.get_my_company_id());

CREATE POLICY "Superadmin can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (public.get_my_role() = 'superadmin' OR auth.uid() IS NOT NULL);

-- ── PROFILES policies ───────────────────────────────────────
CREATE POLICY "Users can view profiles in their company"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR company_id = public.get_my_company_id()
    OR public.get_my_role() IN ('superadmin', 'auditor_external')
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "New profiles can be inserted on signup"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());


-- ── GENERIC TENANT-SCOPED POLICIES ──────────────────────────
-- Macro for all company-scoped data tables.

-- Projects
CREATE POLICY "Tenant isolation" ON public.projects FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.projects FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant update" ON public.projects FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest'));
CREATE POLICY "Tenant delete" ON public.projects FOR DELETE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'));

-- RFQs
CREATE POLICY "Tenant isolation" ON public.rfqs FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.rfqs FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant update" ON public.rfqs FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest'));
CREATE POLICY "Tenant delete" ON public.rfqs FOR DELETE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'));

-- Contracts
CREATE POLICY "Tenant isolation" ON public.contracts FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.contracts FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant update" ON public.contracts FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest'));
CREATE POLICY "Tenant delete" ON public.contracts FOR DELETE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'));

-- Procurement
CREATE POLICY "Tenant isolation" ON public.procurement_items FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.procurement_items FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant update" ON public.procurement_items FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest'));
CREATE POLICY "Tenant delete" ON public.procurement_items FOR DELETE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'));

-- Vendors
CREATE POLICY "Tenant isolation" ON public.vendors FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.vendors FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant update" ON public.vendors FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest'));
CREATE POLICY "Tenant delete" ON public.vendors FOR DELETE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'));

-- Transactions
CREATE POLICY "Tenant isolation" ON public.transactions FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.transactions FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant update" ON public.transactions FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest'));

-- Service Requests
CREATE POLICY "Tenant isolation" ON public.service_requests FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.service_requests FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant update" ON public.service_requests FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest'));

-- Notifications
CREATE POLICY "Tenant isolation" ON public.notifications FOR SELECT
  USING (company_id = public.get_my_company_id() OR profile_id = auth.uid() OR public.get_my_role() IN ('superadmin'));
CREATE POLICY "Tenant insert" ON public.notifications FOR INSERT
  WITH CHECK (TRUE);
CREATE POLICY "Tenant update" ON public.notifications FOR UPDATE
  USING (profile_id = auth.uid() OR company_id = public.get_my_company_id());

-- Templates
CREATE POLICY "Tenant isolation" ON public.templates FOR SELECT
  USING (company_id = public.get_my_company_id() OR company_id IS NULL OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.templates FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id() OR company_id IS NULL);
CREATE POLICY "Tenant update" ON public.templates FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest'));

-- Audit Logs
CREATE POLICY "Tenant isolation" ON public.audit_logs FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Anyone can insert audit logs" ON public.audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- Wallet Accounts
CREATE POLICY "Tenant isolation" ON public.wallet_accounts FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.wallet_accounts FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant update" ON public.wallet_accounts FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest'));

-- Wallet Transactions
CREATE POLICY "Tenant isolation" ON public.wallet_transactions FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.wallet_transactions FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());

-- Escrow Transactions
CREATE POLICY "Tenant isolation" ON public.escrow_transactions FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.escrow_transactions FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant update" ON public.escrow_transactions FOR UPDATE
  USING (company_id = public.get_my_company_id());

-- Team Members
CREATE POLICY "Tenant isolation" ON public.team_members FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Admins can manage team" ON public.team_members FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'));
CREATE POLICY "Admins can update team" ON public.team_members FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'));
CREATE POLICY "Admins can remove team" ON public.team_members FOR DELETE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'));

-- Production Data
CREATE POLICY "Tenant isolation" ON public.production_data FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.production_data FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant update" ON public.production_data FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest'));

-- Cost Data
CREATE POLICY "Tenant isolation" ON public.cost_data FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.cost_data FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant update" ON public.cost_data FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest'));

-- Enterprise Data
CREATE POLICY "Tenant isolation" ON public.enterprise_data FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.enterprise_data FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant update" ON public.enterprise_data FOR UPDATE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest'));

-- File Metadata
CREATE POLICY "Tenant isolation" ON public.file_metadata FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "Tenant insert" ON public.file_metadata FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant delete" ON public.file_metadata FOR DELETE
  USING (company_id = public.get_my_company_id() AND public.get_my_role() IN ('superadmin', 'admin'));


-- ============================================================
-- TRIGGERS — auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies', 'profiles', 'projects', 'rfqs', 'contracts',
    'procurement_items', 'vendors', 'transactions', 'service_requests',
    'templates', 'wallet_accounts', 'production_data', 'cost_data', 'enterprise_data'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t
    );
  END LOOP;
END;
$$;


-- ============================================================
-- TRIGGER — auto-create profile on auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'user'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view company documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
