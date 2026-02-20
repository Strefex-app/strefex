# STREFEX B2B Backend

Production-grade **FastAPI** multi-tenant B2B REST API: PostgreSQL, JWT auth, role-based access (Admin, Manager, User), API-first for Bubble and FlutterFlow.

## Design

- **Folder structure, design decisions, auth flow, data isolation**: see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

1. **Python 3.11+** and **PostgreSQL**.
2. Create a DB and set `DATABASE_URL` in `.env` (copy from `.env.example`).
3. Install and run:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. Open **http://localhost:8000/docs** for Swagger UI.

## Migrations

```bash
alembic revision --autogenerate -m "Initial"
alembic upgrade head
```

(Optional) Seed a tenant and admin user via API or a small script using `tenant_repository.create` and `user_repository.create`.

## API

- `POST /api/v1/auth/login` — Login (email, password, optional tenant_slug).
- `GET /api/v1/auth/me` — Current user (Bearer token).
- `GET/POST /api/v1/users` — List/create users (tenant-scoped; Admin).
- `GET/PATCH/DELETE /api/v1/users/{id}` — User CRUD (Admin for write).
- `GET/POST /api/v1/tenants` — List/create tenants (Admin).
- `GET/PATCH /api/v1/tenants/{id}` — Tenant CRUD.

All tenant-scoped data is isolated by `tenant_id` from the JWT.
