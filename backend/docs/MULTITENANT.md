# Multi-Tenant Data Isolation

Every query is scoped to `company_id` (tenant). Cross-company access is prevented at the application layer and can be reinforced with optional row-level security (RLS) in PostgreSQL.

---

## 1. Query Patterns

### Rule: Never query without `company_id`

- **List**: filter by `company_id` from JWT (CurrentTenant).
- **Read**: filter by both resource `id` and `company_id`.
- **Create**: set `company_id` from JWT; never accept it from the request body.
- **Update / Delete**: load resource by `id` + `company_id`; then update or delete. Never allow changing `company_id` (no cross-tenant move).

### Repository pattern

```python
# List: always pass company_id
async def list_by_company(
    self, session: AsyncSession, company_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> Sequence[Project]:
    result = await session.execute(
        select(Project)
        .where(Project.company_id == company_id)
        .offset(skip).limit(limit).order_by(Project.created_at.desc())
    )
    return result.scalars().all()

# Read: id + company_id
async def get_by_id(
    self, session: AsyncSession, project_id: uuid.UUID, company_id: uuid.UUID
) -> Project | None:
    result = await session.execute(
        select(Project).where(
            Project.id == project_id,
            Project.company_id == company_id,
        )
    )
    return result.scalar_one_or_none()

# Create: company_id from caller (tenant context)
async def create(
    self, session: AsyncSession, company_id: uuid.UUID, name: str, ...
) -> Project:
    project = Project(company_id=company_id, name=name, ...)
    session.add(project)
    await session.flush()
    await session.refresh(project)
    return project

# Update: never accept company_id in kwargs
async def update(self, session: AsyncSession, project: Project, **kwargs) -> Project:
    kwargs.pop("company_id", None)  # prevent cross-tenant move
    for key, value in kwargs.items():
        if hasattr(project, key):
            setattr(project, key, value)
    await session.flush()
    await session.refresh(project)
    return project
```

---

## 2. Dependency Examples

### `CurrentTenant` and `CompanyId`

- **`CurrentTenant`**: full tenant context (tenant_id, tenant_slug, role) from JWT.
- **`CompanyId`**: only the current company UUID. Use it so every endpoint explicitly receives `company_id` for scoping.

```python
from app.api.deps import CurrentUser, CurrentTenant, CompanyId, get_db

# List: scope by company_id from JWT
@router.get("", response_model=list[ProjectRead])
async def list_projects(
    company_id: CompanyId,  # from JWT, not from query/body
    db: AsyncSession = Depends(get_db),
):
    projects = await project_service.list(db, company_id, skip=0, limit=100)
    return [ProjectRead.model_validate(p) for p in projects]

# Read: get by id + company_id
@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID,
    company_id: CompanyId,
    db: AsyncSession = Depends(get_db),
):
    project = await project_service.get_by_id(db, project_id, company_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectRead.model_validate(project)

# Create: company_id and created_by from context only
@router.post("", response_model=ProjectRead, status_code=201)
async def create_project(
    data: ProjectCreate,  # no company_id in schema
    current_user: CurrentUser,
    company_id: CompanyId,
    db: AsyncSession = Depends(get_db),
):
    project = await project_service.create(
        db,
        company_id=company_id,
        created_by=current_user.id,
        name=data.name,
        ...
    )
    return ProjectRead.model_validate(project)

# Update: only if resource belongs to current company
@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    company_id: CompanyId,
    db: AsyncSession = Depends(get_db),
):
    project = await project_service.get_by_id(db, project_id, company_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    assert_same_company(project.company_id, company_id, "Project")
    project = await project_service.update(db, project, **data.model_dump(exclude_unset=True))
    return ProjectRead.model_validate(project)
```

### `assert_same_company`

Use after loading a resource by id (e.g. when you loaded without company filter, or for extra safety):

```python
from app.core.multitenant import assert_same_company

# Returns 404 (not 403) so we don't leak that the resource exists in another tenant
assert_same_company(resource.company_id, company_id, "Project")
```

---

## 3. Security Explanation

- **Company ID from JWT only**: `company_id` is taken from the validated JWT (CurrentTenant / CompanyId). It is never read from query parameters, path, or body. This prevents a user from listing or acting on another company’s data by sending a different `company_id`.

- **Read by id + company_id**: Single-resource reads use both resource id and `company_id`. If the row exists but belongs to another company, the query returns nothing and the API returns 404. We do not return 403 so we avoid revealing that the resource exists in another tenant.

- **Create**: New rows always get `company_id` (and optionally `created_by`) from the current user’s context. Request bodies must not contain `company_id`.

- **Update/Delete**: Only rows that belong to the current company are loaded. The service layer strips `company_id` from update payloads so a client cannot move a resource to another tenant.

- **No cross-tenant APIs**: There are no endpoints that accept `company_id` as input to switch context. Tenant context is fixed per request by the JWT.

---

## 4. Optional: Row-Level Security (RLS)

Application-level scoping is required. RLS in PostgreSQL can add a second layer so that even raw SQL or a misconfigured query cannot return another tenant’s rows.

### Strategy

1. Enable RLS on every tenant-scoped table.
2. Create a policy that restricts rows to the current tenant.
3. Set the “current tenant” in the session (e.g. via `SET LOCAL app.current_company_id = '<uuid>'`) at the start of each request, after validating the JWT.

### Example (PostgreSQL)

```sql
-- Enable RLS on tenant-scoped tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users   ENABLE ROW LEVEL SECURITY;
-- ... same for assets, audits, rfqs, etc.

-- Use a session variable set by the app (e.g. in middleware or dependency)
-- Example: SET LOCAL app.current_company_id = current_setting('app.current_company_id', true);

CREATE POLICY tenant_isolation ON projects
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY tenant_isolation ON users
  USING (company_id = current_setting('app.current_company_id', true)::uuid);
```

### Setting the session variable (FastAPI)

In a dependency or middleware that runs after JWT validation:

```python
from sqlalchemy import text

async def set_tenant_context(session: AsyncSession, company_id: uuid.UUID) -> None:
    await session.execute(
        text("SET LOCAL app.current_company_id = :cid"),
        {"cid": str(company_id)}
    )
```

Call `set_tenant_context(db, tenant.tenant_id)` at the start of each request (e.g. in a dependency that provides the DB session or right after `get_current_tenant`). Ensure every request that touches the DB uses a session that has this set.

### Notes

- RLS is optional; the application already enforces isolation with the patterns above.
- RLS adds defense-in-depth and protects against mistakes (e.g. a query without `company_id`).
- Tables that are not tenant-scoped (e.g. global lookup tables) typically do not have RLS or have a separate policy (e.g. `USING (true)` for read-only reference data).

---

## 5. File Reference

| Purpose | File |
|--------|------|
| Tenant context | `app/core/tenant.py` |
| Company ID dependency, type aliases | `app/api/deps.py` |
| Assert same company | `app/core/multitenant.py` |
| Project repo (list/get/create/update) | `app/repositories/project.py` |
| Project API (list/read/create/update) | `app/api/v1/projects.py` |
| User repo/service/API (same patterns) | `app/repositories/user.py`, `app/services/user.py`, `app/api/v1/users.py` |
