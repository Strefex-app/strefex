/**
 * Parse XLSX/CSV sheet rows into buyer-directory-shaped contact objects.
 * Used for registered suppliers import (same columns as buyer directory).
 */

export function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function pickCell(row, keys) {
  const map = {}
  Object.keys(row).forEach((k) => {
    map[normalizeHeader(k)] = row[k]
  })
  for (const key of keys) {
    const v = map[normalizeHeader(key)]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

/**
 * @param {object[]} jsonRows - from XLSX.utils.sheet_to_json
 * @param {{ defaultSegment?: string, defaultCountry?: string, defaultSourceRef?: string }} opts
 */
export function parseDirectorySpreadsheetRows(jsonRows, opts = {}) {
  const defaultSegment = opts.defaultSegment || 'Company list (2025)'
  const defaultCountry = opts.defaultCountry || 'Russia'
  const defaultSourceRef = opts.defaultSourceRef || ''

  return (jsonRows || []).map((row) => {
    const segment =
      pickCell(row, ['segment', 'category', 'list', 'type', 'sheet']) || defaultSegment
    const company_name =
      pickCell(row, ['company', 'company name', 'organization', 'supplier', 'customer', 'name']) ||
      pickCell(row, ['company_name'])
    const industry = pickCell(row, ['industry', 'sector', 'branch'])
    return {
      segment,
      company_name,
      country: pickCell(row, ['country', 'nation']) || defaultCountry,
      contact_name: pickCell(row, ['contact', 'contact name', 'contact person', 'person', 'full name']),
      position: pickCell(row, ['position', 'title', 'role']),
      email: pickCell(row, ['email', 'e-mail', 'mail']),
      phone: pickCell(row, ['phone', 'tel', 'mobile']),
      website: pickCell(row, ['website', 'url', 'web']),
      industry: industry || null,
      row_index: (() => {
        const raw = pickCell(row, ['#', 'no', 'no.', 'num', 'row', 'index'])
        if (!raw) return null
        const n = parseInt(String(raw).replace(/\D/g, ''), 10)
        return Number.isFinite(n) ? n : null
      })(),
      source_ref: pickCell(row, ['source', 'source_ref', 'notes']) || defaultSourceRef || null,
    }
  })
}
