# Bubble API Connector – Example Requests & Responses

Base URL: `https://your-api.com/api/v1`  
All endpoints require: `Authorization: Bearer <JWT>`  
Data is **company-scoped** (tenant from JWT). UUIDs in JSON are strings.

---

## Projects

### List projects (paginated, filterable)

**Request**

```http
GET /api/v1/projects?page=1&per_page=20&status=active&q=alpha
Authorization: Bearer <token>
```

| Query   | Type   | Description                    |
|---------|--------|--------------------------------|
| `page`  | int    | Page number (1-based), default 1 |
| `per_page` | int | Items per page (1–100), default 20 |
| `status`   | string | Filter by status (e.g. draft, active) |
| `q`        | string | Search by name or code             |

**Response (200)**

```json
{
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "company_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "name": "Alpha Project",
      "code": "PRJ-001",
      "description": "First project",
      "status": "active",
      "start_date": "2025-01-01",
      "end_date": "2025-12-31",
      "created_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-02-01T14:30:00Z"
    }
  ],
  "count": 1,
  "page": 1,
  "per_page": 20
}
```

---

### Get one project

**Request**

```http
GET /api/v1/projects/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Response (200)**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "name": "Alpha Project",
  "code": "PRJ-001",
  "description": "First project",
  "status": "active",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "created_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-02-01T14:30:00Z"
}
```

**Response (404)** – not found or different company

```json
{
  "detail": "Project not found"
}
```

---

### Create project

**Request**

```http
POST /api/v1/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Project",
  "code": "PRJ-002",
  "description": "Optional description",
  "status": "draft",
  "start_date": "2025-03-01",
  "end_date": "2025-06-30"
}
```

**Response (201)**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "company_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "name": "New Project",
  "code": "PRJ-002",
  "description": "Optional description",
  "status": "draft",
  "start_date": "2025-03-01",
  "end_date": "2025-06-30",
  "created_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "created_at": "2025-02-02T12:00:00Z",
  "updated_at": "2025-02-02T12:00:00Z"
}
```

Note: `company_id` and `created_by` are set from the JWT; do not send them in the body.

---

### Update project (PATCH)

**Request**

```http
PATCH /api/v1/projects/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "active",
  "name": "Alpha Project (Updated)"
}
```

**Response (200)** – full project object (same shape as Get one project).

---

### Delete project

**Request**

```http
DELETE /api/v1/projects/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Response (204)** – no body.

---

## Assets

### List assets (paginated, filterable)

**Request**

```http
GET /api/v1/assets?page=1&per_page=20&project_id=550e8400-e29b-41d4-a716-446655440000&status=active&asset_type=machine&q=pump
Authorization: Bearer <token>
```

| Query        | Type   | Description                          |
|--------------|--------|--------------------------------------|
| `page`       | int    | Page number (1-based), default 1     |
| `per_page`   | int    | Items per page (1–100), default 20   |
| `project_id` | UUID   | Filter by project id                 |
| `status`     | string | Filter by status (e.g. active)       |
| `asset_type` | string | Filter by asset type                 |
| `q`          | string | Search by name, serial_number, type  |

**Response (200)**

```json
{
  "results": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "company_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "project_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Pump Unit A",
      "asset_type": "machine",
      "serial_number": "SN-12345",
      "location": "Building 1",
      "status": "active",
      "metadata": { "warranty_until": "2026-01-01" },
      "created_at": "2025-01-20T09:00:00Z",
      "updated_at": "2025-02-01T11:00:00Z"
    }
  ],
  "count": 1,
  "page": 1,
  "per_page": 20
}
```

---

### Get one asset

**Request**

```http
GET /api/v1/assets/770e8400-e29b-41d4-a716-446655440002
Authorization: Bearer <token>
```

**Response (200)**

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "company_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Pump Unit A",
  "asset_type": "machine",
  "serial_number": "SN-12345",
  "location": "Building 1",
  "status": "active",
  "metadata": { "warranty_until": "2026-01-01" },
  "created_at": "2025-01-20T09:00:00Z",
  "updated_at": "2025-02-01T11:00:00Z"
}
```

---

### Create asset

**Request**

```http
POST /api/v1/assets
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Conveyor B",
  "asset_type": "machine",
  "serial_number": "SN-67890",
  "location": "Building 2",
  "status": "active",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": { "install_date": "2025-02-01" }
}
```

**Response (201)** – full asset object (same shape as Get one asset).

Note: `company_id` is set from the JWT. `project_id` is optional (assign asset to a project).

---

### Update asset (PATCH)

**Request**

```http
PATCH /api/v1/assets/770e8400-e29b-41d4-a716-446655440002
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "inactive",
  "location": "Warehouse"
}
```

**Response (200)** – full asset object.

---

### Delete asset

**Request**

```http
DELETE /api/v1/assets/770e8400-e29b-41d4-a716-446655440002
Authorization: Bearer <token>
```

**Response (204)** – no body.

---

## Bubble API Connector tips

- **List endpoints** always return `{ "results": [...], "count": N, "page": p, "per_page": pp }`. Use `count` for total matching items and `results` for the current page.
- **Single resource** (GET one, POST, PATCH) returns the object directly; no wrapper key.
- **UUIDs** are strings in JSON (e.g. `"id": "550e8400-e29b-41d4-a716-446655440000"`).
- **Dates/timestamps** are ISO 8601 (e.g. `"2025-02-02T12:00:00Z"`).
- **Errors** use `{ "detail": "message" }` or `{ "detail": [...] }` for validation errors (422).
- **Auth**: Set header `Authorization: Bearer <your_jwt>` in the Connector; get the JWT from your login endpoint (`POST /api/v1/auth/login`).
