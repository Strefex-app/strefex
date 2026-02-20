# FastAPI Multi-Tenant B2B Backend — Architecture

## 1. Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Settings (env, DB, JWT)
│   ├── database.py             # Async SQLAlchemy engine & session
│   │
│   ├── core/                   # Cross-cutting concerns
│   │   ├── __init__.py
│   │   ├── security.py         # JWT encode/decode, password hashing
│   │   ├── tenant.py           # Tenant context, middleware, isolation
│   │   └── exceptions.py       # HTTP exception handlers
│   │
│   ├── models/                 # SQLAlchemy ORM (shared schema)
│   │   ├── __init__.py
│   │   ├── tenant.py           # Company (tenant)
│   │   ├── user.py             # User, role enum
│   │   └── base.py             # Base model, timestamps
│   │
│   ├── schemas/                # Pydantic request/response
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   └── tenant.py
│   │
│   ├── repositories/           # Data access (optional layer)
│   │   ├── __init__.py
│   │   └── user.py
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py             # Depends(): current_user, tenant, RBAC
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py       # Mounts all v1 routes
│   │       ├── auth.py         # login, refresh, me
│   │       ├── users.py        # CRUD users (scoped by tenant)
│   │       └── tenants.py     # Tenant CRUD (super-admin only)
│   │
│   └── services/               # Business logic
│       ├── __init__.py
│       ├── auth.py
│       └── user.py
│
├── alembic/                    # DB migrations
│   ├── env.py
│   └── versions/
├── tests/
│   ├── conftest.py
│   └── api/
├── docs/
│   └── ARCHITECTURE.md         # This file
├── .env.example
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## 2. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Tenant model** | Row-level (shared DB, `tenant_id` on tables) | Simpler ops, one DB; isolation via `tenant_id` in every query. Suits B2B SaaS at mid scale. |
| **Auth** | JWT (access + optional refresh) | Stateless, works well with Bubble/FlutterFlow; no server-side session store. |
| **RBAC** | Role enum (Admin, Manager, User) per tenant | Clear permissions; easy to extend with permission bits later. |
| **API versioning** | URL prefix `/api/v1` | Stable for clients; v2 can coexist. |
| **Validation** | Pydantic v2 in schemas | Type-safe requests/responses and OpenAPI. |
| **DB access** | Async SQLAlchemy 2.0 + dependency injection | Non-blocking I/O; session per request with tenant scope. |
| **Config** | Pydantic Settings from env | Twelve-factor; `.env` for local, env vars in production. |

---

## 3. Auth Flow

```
┌─────────────┐     POST /api/v1/auth/login      ┌─────────────┐
│   Client    │  (email, password, tenant_slug?) │   FastAPI   │
│ (Bubble/    │ ──────────────────────────────► │   Backend   │
│ FlutterFlow)│                                  │             │
└─────────────┘                                  │  1. Resolve │
       │                                         │     tenant  │
       │                                         │  2. Verify  │
       │    200 { access_token, user, tenant }   │     user    │
       │ ◄──────────────────────────────────────│  3. Issue   │
       │                                         │     JWT     │
       │    401 Invalid credentials              └─────────────┘
       │ ◄──────────────────────────────────────
       │
       │  All subsequent requests:
       │  Authorization: Bearer <access_token>
       │  (Optional: X-Tenant-ID header for tenant hint)
       │
       │  Middleware/dependency:
       │  - Decode JWT → user_id, tenant_id, role
       │  - Set request state: current_user, current_tenant
       │  - Enforce tenant-scoped queries
```

- **Login**: Client sends `email`, `password`. Optionally `tenant_id` or `tenant_slug` when user belongs to multiple tenants (or omitted if 1:1). Server validates, returns JWT containing `sub` (user id), `tenant_id`, `role`, `exp`.
- **Protected routes**: Dependency `get_current_user` decodes JWT, loads user and tenant, injects into route. No session DB.
- **Refresh**: Optional `POST /api/v1/auth/refresh` with refresh token (stored in DB or separate JWT) for long-lived clients.

---

## 4. Data Isolation Strategy

- **Tenant identifier**: Every tenant-scoped table has `tenant_id` (FK to `tenants`). All reads/writes are filtered by `tenant_id`.
- **Source of truth**: `tenant_id` comes from the **JWT** (set at login). Request header `X-Tenant-ID` can be supported for admin-impersonation only; never trust it for normal users.
- **Enforcement**:
  1. **Dependency**: `get_current_tenant()` returns tenant from JWT; `get_current_user()` returns user and ensures user belongs to that tenant.
  2. **Query pattern**: Repositories and services receive `tenant_id: int` and add `.where(Model.tenant_id == tenant_id)` (or equivalent) to all queries.
  3. **Global filters**: Optional SQLAlchemy event or repository base class that auto-adds `tenant_id` filter so new code cannot forget.
- **Super-admin**: A global “platform” role (or flag on user) can list/switch tenants; normal APIs still use `tenant_id` from JWT for the active tenant.
- **Migrations**: Schema includes `tenant_id` and indexes `(tenant_id, ...)` for performance.

---

## 5. RBAC (Admin, Manager, User)

- **Admin (tenant)**: Full CRUD on users and settings inside the tenant; invite users; assign Manager/User.
- **Manager**: Read/write business data (e.g. orders, products); no user management.
- **User**: Read (and limited write) as needed by product.

Implementation: dependency `require_roles(["Admin", "Manager"])` that checks `current_user.role` and returns 403 if not in list. Each route declares required roles.

---

## 6. API-First for Bubble & FlutterFlow

- **REST only**: No GraphQL or WebSockets in scope. JSON request/response.
- **OpenAPI**: FastAPI auto-generates `/openapi.json` and `/docs`; Bubble/FlutterFlow can import for client codegen or manual calls.
- **CORS**: Configure allowed origins for Bubble and FlutterFlow preview/production domains.
- **Idempotency**: Critical mutations (e.g. create order) can accept `Idempotency-Key` header; implement in a later phase if needed.

---

## 7. Stack Summary

- **Runtime**: Python 3.11+
- **Framework**: FastAPI
- **DB**: PostgreSQL, async driver (asyncpg)
- **ORM**: SQLAlchemy 2.0 (async)
- **Auth**: JWT (PyJWT), password hashing (passlib + bcrypt)
- **Config**: Pydantic Settings
- **Migrations**: Alembic

This gives a clean, modular base to add domains (e.g. orders, products, suppliers) under the same tenant and RBAC rules.
