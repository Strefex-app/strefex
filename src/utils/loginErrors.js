/** Detect backend multi-company login errors that need a company slug. */
export function shouldPromptCompanySlug(message) {
  const text = String(message || '').toLowerCase()
  return text.includes('multiple companies') || text.includes('company slug')
}

export function normalizeCompanySlugInput(value) {
  const slug = String(value || '').trim().toLowerCase()
  return slug || null
}
