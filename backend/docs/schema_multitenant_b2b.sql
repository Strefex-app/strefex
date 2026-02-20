-- =============================================================================
-- Multi-tenant B2B Platform - PostgreSQL Schema
-- =============================================================================
-- Requirements:
--   - Each record belongs to a company (data isolation per company)
--   - UUIDs for all primary keys
--   - Audit timestamps (created_at, updated_at)
--   - Optimized for reporting (indexes on company_id, dates, status)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. COMPANIES (tenants)
-- =============================================================================
CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(64) NOT NULL UNIQUE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_is_active ON companies(is_active);

-- =============================================================================
-- 2. ROLES (reference / lookup per company or global)
-- =============================================================================
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(64) NOT NULL,
    code            VARCHAR(32) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, code)
);

CREATE INDEX idx_roles_company_id ON roles(company_id);

-- =============================================================================
-- 3. USERS
-- =============================================================================
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role_id              UUID REFERENCES roles(id) ON DELETE SET NULL,
    email                VARCHAR(255) NOT NULL,
    hashed_password      VARCHAR(255) NOT NULL,
    full_name           VARCHAR(255),
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, email)
);

CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_email ON users(company_id, email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- =============================================================================
-- 4. PROJECTS
-- =============================================================================
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(64),
    description     TEXT,
    status          VARCHAR(32) NOT NULL DEFAULT 'draft',
    start_date      DATE,
    end_date        DATE,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(company_id, status);
CREATE INDEX idx_projects_dates ON projects(company_id, start_date, end_date);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- =============================================================================
-- 5. ASSETS (equipment / machines)
-- =============================================================================
CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,
    asset_type      VARCHAR(64) NOT NULL,
    serial_number   VARCHAR(128),
    location        VARCHAR(255),
    status          VARCHAR(32) NOT NULL DEFAULT 'active',
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_company_id ON assets(company_id);
CREATE INDEX idx_assets_project_id ON assets(project_id);
CREATE INDEX idx_assets_company_status ON assets(company_id, status);
CREATE INDEX idx_assets_asset_type ON assets(company_id, asset_type);
CREATE INDEX idx_assets_metadata ON assets USING GIN(metadata);

-- =============================================================================
-- 6. AUDITS
-- =============================================================================
CREATE TABLE audits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    asset_id        UUID REFERENCES assets(id) ON DELETE SET NULL,
    audit_type      VARCHAR(64) NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    scheduled_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    auditor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    findings        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audits_company_id ON audits(company_id);
CREATE INDEX idx_audits_project_id ON audits(project_id);
CREATE INDEX idx_audits_asset_id ON audits(asset_id);
CREATE INDEX idx_audits_status ON audits(company_id, status);
CREATE INDEX idx_audits_scheduled_at ON audits(company_id, scheduled_at);
CREATE INDEX idx_audits_completed_at ON audits(company_id, completed_at);
CREATE INDEX idx_audits_findings ON audits USING GIN(findings);

-- =============================================================================
-- 7. RFQs (Requests for Quotation)
-- =============================================================================
CREATE TABLE rfqs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    rfq_number      VARCHAR(64),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(32) NOT NULL DEFAULT 'draft',
    due_date        DATE,
    issued_at       TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, rfq_number)
);

CREATE INDEX idx_rfqs_company_id ON rfqs(company_id);
CREATE INDEX idx_rfqs_project_id ON rfqs(project_id);
CREATE INDEX idx_rfqs_status ON rfqs(company_id, status);
CREATE INDEX idx_rfqs_due_date ON rfqs(company_id, due_date);
CREATE INDEX idx_rfqs_created_at ON rfqs(created_at);

-- =============================================================================
-- Optional: RFQ line items (for reporting on RFQ details)
-- =============================================================================
CREATE TABLE rfq_line_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id          UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    line_number     INT NOT NULL,
    description     TEXT,
    quantity        DECIMAL(18, 4),
    unit            VARCHAR(32),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(rfq_id, line_number)
);

CREATE INDEX idx_rfq_line_items_rfq_id ON rfq_line_items(rfq_id);
CREATE INDEX idx_rfq_line_items_company_id ON rfq_line_items(company_id);

-- =============================================================================
-- Trigger: update updated_at on row change
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_companies_updated_at
    BEFORE UPDATE ON companies FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_roles_updated_at
    BEFORE UPDATE ON roles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_projects_updated_at
    BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_assets_updated_at
    BEFORE UPDATE ON assets FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_audits_updated_at
    BEFORE UPDATE ON audits FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_rfqs_updated_at
    BEFORE UPDATE ON rfqs FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_rfq_line_items_updated_at
    BEFORE UPDATE ON rfq_line_items FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- =============================================================================
-- INDEX RECOMMENDATIONS SUMMARY
-- =============================================================================
-- Data isolation: Every tenant-scoped table has idx_<table>_company_id.
-- Reporting: Composite indexes on (company_id, status), (company_id, date columns).
-- Lookups: Unique indexes on (company_id, email), (company_id, code), (company_id, rfq_number).
-- JSONB: GIN indexes on metadata, findings for search/filter.
-- FKs: Indexes on project_id, asset_id, etc. for joins and cascades.
-- =============================================================================

-- =============================================================================
-- FOREIGN KEY RELATIONSHIPS (summary)
-- =============================================================================
-- companies     (root tenant)
--   ^-- roles.company_id
--   ^-- users.company_id
--   ^-- projects.company_id
--   ^-- assets.company_id
--   ^-- audits.company_id
--   ^-- rfqs.company_id
--   ^-- rfq_line_items.company_id
--
-- roles         ^-- users.role_id
-- projects      ^-- assets.project_id, audits.project_id, rfqs.project_id
-- assets        ^-- audits.asset_id
-- users         ^-- projects.created_by, audits.auditor_id, rfqs.created_by
-- rfqs          ^-- rfq_line_items.rfq_id
-- =============================================================================
