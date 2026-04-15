import {
  isSupabaseConfigured,
  companiesService,
} from './supabaseService'

const DEFAULT_CRUD_PAGE = 1000
const DEFAULT_COMPANY_PAGE = 2500
const DEFAULT_MAX_ROWS = 100_000

/**
 * Cross-tenant `list(null, …)` in pages; merges to the same logical result as one large limit.
 * Deduplicates by `id` when present (stable sort still required for correctness).
 */
export async function fetchGlobalCrudListPaged(service, listOptions, { pageSize = DEFAULT_CRUD_PAGE, maxRows = DEFAULT_MAX_ROWS } = {}) {
  if (!isSupabaseConfigured) return []
  const ps = Math.min(Math.max(Number(pageSize) || DEFAULT_CRUD_PAGE, 1), 2000)
  const cap = Math.min(Math.max(Number(maxRows) || DEFAULT_MAX_ROWS, 1), 250_000)
  const out = []
  const seenIds = new Set()
  let offset = 0

  while (out.length < cap) {
    const batch = await service.list(null, { ...listOptions, limit: ps, offset })
    const rows = Array.isArray(batch) ? batch : []
    for (const row of rows) {
      const id = row?.id
      if (id != null && id !== '') {
        if (seenIds.has(id)) continue
        seenIds.add(id)
      }
      out.push(row)
      if (out.length >= cap) break
    }
    if (rows.length < ps) break
    offset += ps
  }
  return out
}

export async function fetchCompaniesListPaged({ pageSize = DEFAULT_COMPANY_PAGE, maxRows = DEFAULT_MAX_ROWS } = {}) {
  if (!isSupabaseConfigured) return []
  const ps = Math.min(Math.max(Number(pageSize) || DEFAULT_COMPANY_PAGE, 1), 5000)
  const cap = Math.min(Math.max(Number(maxRows) || DEFAULT_MAX_ROWS, 1), 100_000)
  const out = []
  const seenIds = new Set()
  let offset = 0

  while (out.length < cap) {
    const batch = await companiesService.list({ limit: ps, offset })
    const rows = Array.isArray(batch) ? batch : []
    for (const row of rows) {
      const id = row?.id
      if (id != null && id !== '') {
        if (seenIds.has(id)) continue
        seenIds.add(id)
      }
      out.push(row)
      if (out.length >= cap) break
    }
    if (rows.length < ps) break
    offset += ps
  }
  return out
}
