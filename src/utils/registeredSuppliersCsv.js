/**
 * Parse CSV for registered suppliers registry (flexible headers, e.g. "Company namy", "contact person").
 */

function parseCsvLine(line) {
  const out = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"' && line[i + 1] === '"') {
      current += '"'
      i += 1
      continue
    }
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      out.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  out.push(current.trim())
  return out
}

function canonicalField(header) {
  const x = String(header || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/#/g, '#')
  const map = {
    '#': 'row_index',
    no: 'row_index',
    'no.': 'row_index',
    num: 'row_index',
    'n°': 'row_index',
    segment: 'segment',
    category: 'segment',
    list: 'segment',
    type: 'segment',
    'company name': 'company_name',
    'company namy': 'company_name',
    company_name: 'company_name',
    industry: 'industry',
    country: 'country',
    'contact person': 'contact_name',
    contact_person: 'contact_name',
    'contact name': 'contact_name',
    contact_name: 'contact_name',
    position: 'position',
    email: 'email',
    phone: 'phone',
    website: 'website',
    source: 'source_ref',
    source_ref: 'source_ref',
  }
  return map[x] || null
}

function trimOrNull(v) {
  const t = String(v ?? '').trim()
  return t === '' ? null : t
}

/**
 * @param {Record<string, string>} o
 * @param {string} [defaultSourceRef]
 * @returns {object | null} payload for insert or null if invalid
 */
export function mapRowToPayload(o, defaultSourceRef) {
  const company_name = String(o.company_name || '').trim()
  if (!company_name) return null
  let rowIndex = null
  if (o.row_index != null && String(o.row_index).trim() !== '') {
    const n = parseInt(String(o.row_index).trim(), 10)
    if (Number.isFinite(n)) rowIndex = n
  }
  const seg = trimOrNull(o.segment)
  const ind = trimOrNull(o.industry)
  const segment =
    seg || (ind && ind.length > 0 ? ind : null) || 'Company list (2025)'
  return {
    segment,
    company_name,
    industry: ind,
    country: trimOrNull(o.country) || 'China',
    contact_name: trimOrNull(o.contact_name),
    position: trimOrNull(o.position),
    email: trimOrNull(o.email)?.toLowerCase() ?? null,
    phone: trimOrNull(o.phone),
    website: trimOrNull(o.website),
    row_index: rowIndex,
    source_ref: trimOrNull(o.source_ref) || defaultSourceRef || null,
    metadata: {},
  }
}

/**
 * @param {string} text - raw CSV
 * @param {string} [defaultSourceRef] - e.g. filename
 * @returns {{ ok: object[], skipped: number }}
 */
export function parseRegisteredSuppliersCsv(text, defaultSourceRef) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return { ok: [], skipped: 0 }

  const rawHeaders = parseCsvLine(lines[0])
  const ok = []
  let skipped = 0

  for (let li = 1; li < lines.length; li += 1) {
    const vals = parseCsvLine(lines[li])
    const o = {}
    rawHeaders.forEach((h, i) => {
      const c = canonicalField(h)
      if (c) o[c] = vals[i] ?? ''
    })
    const payload = mapRowToPayload(o, defaultSourceRef)
    if (payload) ok.push(payload)
    else skipped += 1
  }

  return { ok, skipped }
}
