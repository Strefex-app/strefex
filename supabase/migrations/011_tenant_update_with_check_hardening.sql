-- 011 — Tenant UPDATE policy WITH CHECK hardening
-- Several tenant-scoped tables had UPDATE policies with USING only.
-- This migration enforces equivalent WITH CHECK clauses so updated rows
-- cannot be reassigned outside the caller tenant.

-- Projects
DROP POLICY IF EXISTS "Tenant update" ON public.projects;
CREATE POLICY "Tenant update" ON public.projects FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

-- RFQs
DROP POLICY IF EXISTS "Tenant update" ON public.rfqs;
CREATE POLICY "Tenant update" ON public.rfqs FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

-- Contracts
DROP POLICY IF EXISTS "Tenant update" ON public.contracts;
CREATE POLICY "Tenant update" ON public.contracts FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

-- Procurement
DROP POLICY IF EXISTS "Tenant update" ON public.procurement_items;
CREATE POLICY "Tenant update" ON public.procurement_items FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

-- Vendors
DROP POLICY IF EXISTS "Tenant update" ON public.vendors;
CREATE POLICY "Tenant update" ON public.vendors FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

-- Transactions
DROP POLICY IF EXISTS "Tenant update" ON public.transactions;
CREATE POLICY "Tenant update" ON public.transactions FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

-- Service Requests
DROP POLICY IF EXISTS "Tenant update" ON public.service_requests;
CREATE POLICY "Tenant update" ON public.service_requests FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

-- Templates
DROP POLICY IF EXISTS "Tenant update" ON public.templates;
CREATE POLICY "Tenant update" ON public.templates FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

-- Wallet Accounts
DROP POLICY IF EXISTS "Tenant update" ON public.wallet_accounts;
CREATE POLICY "Tenant update" ON public.wallet_accounts FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

-- Escrow Transactions
DROP POLICY IF EXISTS "Tenant update" ON public.escrow_transactions;
CREATE POLICY "Tenant update" ON public.escrow_transactions FOR UPDATE
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- Team Members
DROP POLICY IF EXISTS "Admins can update team" ON public.team_members;
CREATE POLICY "Admins can update team" ON public.team_members FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('superadmin', 'admin')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('superadmin', 'admin')
  );

-- Production Data
DROP POLICY IF EXISTS "Tenant update" ON public.production_data;
CREATE POLICY "Tenant update" ON public.production_data FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

-- Cost Data
DROP POLICY IF EXISTS "Tenant update" ON public.cost_data;
CREATE POLICY "Tenant update" ON public.cost_data FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );

-- Enterprise Data
DROP POLICY IF EXISTS "Tenant update" ON public.enterprise_data;
CREATE POLICY "Tenant update" ON public.enterprise_data FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() NOT IN ('auditor_internal', 'auditor_external', 'guest')
  );
