# Scale roadmap and implementation plan

This document tracks scalability work that can be done **in the repository** without new paid services and without manual third‑party console configuration (no new API keys in vendor dashboards, no CDN/WAF clicks, no plan upgrades).

## Roadmap summary

| Theme | Risk | Mitigation direction |
|--------|------|----------------------|
| Unbounded reads | O(rows) memory and egress | Pagination, default limits, narrower `select()` |
| Cross‑tenant lists | Full table scans under superadmin / `company_id` null | Default cap when `list(null)` has no filters; explicit `limit` or `unbounded: true` where needed |
| Client‑only state | Not a server data plane | Keep using DB for authority; localStorage for cache only (longer term) |
| Realtime | Channel and payload growth | Unsubscribe on unmount; subscribe only to needed scopes |
| Bundle size | Slow first paint | Keep heavy libraries route‑lazy |

## Priority tiers

### P0 — no investment, no vendor manual work (code only) — **in progress**

1. **Profile directory pagination** — `profilesService.listAllWithCompanies` uses bounded `range`; Super Admin merges batches with “Load more”.
2. **Companies list cap** — `companiesService.list` uses a default window (`range`) unless `unbounded: true`.
3. **CRUD `list(null)` without filters** — `createCrudService` applies `DEFAULT_GLOBAL_UNFILTERED_LIST_LIMIT` unless caller passes `limit` or `unbounded: true`.
4. **Explicit limits on large directory pages** — Account directory, platform directory, registered suppliers request a high but finite `limit` until UI pagination exists.

### P1 — code only, broader touch

- ESLint or CI check: warn on `from('…').select` without `limit`/`range` for known large tables.
- Narrow `select()` on hot paths (supplier search, dashboards).
- Realtime audit: ensure cleanup and minimal channel set.

### P2 — needs ops, vendors, or budget (out of “no investment” scope)

- CDN, WAF, rate limiting, Supabase plan/quotas, read replicas, formal load tests in staging.

## Project activities (P0)

| ID | Activity | Status |
|----|-----------|--------|
| P0-1 | Implement `listAllWithCompanies({ limit, offset })` → `{ rows, hasMore }` | Done |
| P0-2 | Super Admin: first page + “Load more profiles” | Done |
| P0-3 | `companiesService.list` default `range` + `unbounded` escape | Done |
| P0-4 | `createCrudService.list` default limit for global unfiltered queries | Done |
| P0-5 | Directory pages: explicit `limit: 15000` on cross‑tenant lists | Done |
| P0-6 | Add DB indexes after query patterns stabilize (migrations in repo) | Backlog |

## Escape hatches (for developers)

- **`createCrudService.list(null, { unbounded: true })`** — use sparingly; prefer an explicit numeric `limit`.
- **`companiesService.list({ unbounded: true })`** — full table read; avoid in production UI without paging.
