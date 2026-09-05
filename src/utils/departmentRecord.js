/**
 * Stable department records: { id, name }.
 * HR may still persist legacy string names — normalize on read.
 */

export function makeDepartmentId(name) {
  const slug = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug ? `dept-${slug}` : `dept-${Date.now().toString(36)}`
}

export function normalizeDepartment(entry) {
  if (!entry) return null
  if (typeof entry === 'string') {
    const name = entry.trim()
    if (!name) return null
    return { id: makeDepartmentId(name), name }
  }
  const name = String(entry.name || '').trim()
  if (!name) return null
  return {
    id: entry.id || makeDepartmentId(name),
    name,
  }
}

export function normalizeDepartmentList(list = []) {
  const byId = new Map()
  ;(list || []).forEach((raw) => {
    const row = normalizeDepartment(raw)
    if (!row) return
    if (!byId.has(row.id)) byId.set(row.id, row)
  })
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function departmentNames(list = []) {
  return normalizeDepartmentList(list).map((row) => row.name)
}

export function findDepartment(list = [], key) {
  const q = String(key || '').trim().toLowerCase()
  if (!q) return null
  return normalizeDepartmentList(list).find(
    (row) => row.id.toLowerCase() === q || row.name.toLowerCase() === q || makeDepartmentId(row.name) === q,
  ) || null
}
