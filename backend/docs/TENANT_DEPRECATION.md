# Tenant model deprecation

The legacy `tenants` table and `/api/v1/tenants` routes are **deprecated**.

## Use instead

- **Model:** `Company` (`companies` table)
- **JWT tenant_id:** company UUID
- **Registration:** `company_name` → company slug
- **Login:** optional `tenant_slug` (company slug)

## API status

| Route | Production (`DEBUG=false`) | Development |
|-------|--------------------------|-------------|
| `/api/v1/tenants/*` | **Disabled** | Available (legacy) |
| `/api/v1/example/*` | **Disabled** | Available (demo) |

## Migration plan

1. Stop writing to `tenants` (done for new registrations).
2. Migrate any remaining `tenants` rows to `companies` if needed.
3. Drop `tenants` table in a future Alembic migration after data audit.
