export const DEFAULT_GLOBAL_LIST_LIMIT = 2000

/**
 * Default cap for Supabase CRUD lists so admin/filter queries cannot load the
 * whole table. Pass `unbounded: true` or an explicit `limit` to override.
 */
export function resolveCrudListLimit(options = {}) {
  if (options.unbounded) return null
  if (options.limit !== undefined && options.limit !== false) {
    const n = Number(options.limit)
    return Number.isFinite(n) ? Math.max(1, n) : DEFAULT_GLOBAL_LIST_LIMIT
  }
  return DEFAULT_GLOBAL_LIST_LIMIT
}
