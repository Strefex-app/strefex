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

(Optional) Create a company and admin via `POST /api/v1/auth/register` with `company_name`.

## API

- `POST /api/v1/auth/login` — Login (email, password, optional tenant_slug).
- `POST /api/v1/auth/register` — Register (requires `company_name`; creator becomes admin).
- `POST /api/v1/auth/verify-email` — Confirm email with token from verification link.
- `POST /api/v1/auth/resend-verification` — Resend verification (rate-limited).
- `POST /api/v1/auth/refresh` — Rotate httpOnly session cookies.
- `POST /api/v1/auth/logout` — Clear auth cookies.
- `GET /api/v1/auth/me` — Current user (Bearer token or cookie).
- `GET/POST /api/v1/users` — List/create users (company-scoped; Admin).
- `GET/PATCH/DELETE /api/v1/users/{id}` — User CRUD (Admin for write).
- `GET/POST /api/v1/projects`, `/assets`, `/billing/*` — Company-scoped modules.

Optional: set `REDIS_URL` for shared rate limits; `REQUIRE_EMAIL_VERIFICATION=true` after SMTP is configured.

**Go-live checklist:** see [docs/DEPLOYMENT_AUDIT.md](../docs/DEPLOYMENT_AUDIT.md).

All tenant-scoped data is isolated by `tenant_id` (company UUID) from the JWT.
