# Tenant model deprecation — completed

The legacy `tenants` table and `/api/v1/tenants` routes have been **removed** (phase 7 / migration `003`).

## Source of truth

| Concern | Use |
|---------|-----|
| Model | `Company` (`companies` table) |
| JWT `tenant_id` | Company UUID |
| Registration | `POST /api/v1/auth/register` with `company_name` |
| Login (multi-company) | Optional `tenant_slug` (company slug) |

## Migration `003_drop_tenants_table`

1. Copies any `tenants` rows whose `slug` is not already in `companies` (preserves id).
2. Drops the `tenants` table.

Deploy:

```bash
cd backend && alembic upgrade head
```

## Removed code

- `app/models/tenant.py`
- `app/repositories/tenant.py`
- `app/api/v1/tenants.py`
- `app/schemas/tenant.py`
- Frontend `tenantsApi` in `src/services/api.js`

## API status

| Route | Status |
|-------|--------|
| `/api/v1/tenants/*` | **Removed** — returns 404 |
| `/api/v1/example/*` | Development only (`DEBUG=true`) |

## Naming note

`TenantContext`, JWT claim `tenant_id`, and `TenantInResponse` in auth responses refer to **company** context — naming kept for API compatibility.
