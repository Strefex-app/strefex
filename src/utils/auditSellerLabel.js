function normalizeAuditEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function looksLikeEmailLabel(name, email) {
  const n = String(name || '').trim().toLowerCase()
  const e = normalizeAuditEmail(email)
  if (!n) return true
  if (n.includes('@')) return true
  if (e && n === e.split('@')[0]) return true
  return false
}

function firstCompanyField(row) {
  if (!row || typeof row !== 'object') return ''
  const md = row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  const coMd = row.companyMetadata && typeof row.companyMetadata === 'object' ? row.companyMetadata : {}
  return [
    row.companyName,
    row.company_name,
    md.company_name,
    md.companyName,
    coMd.company_name,
    row.company,
    row.name,
  ]
    .map((v) => String(v || '').trim())
    .find(Boolean) || ''
}

/** Company / supplier name for pool and Sellers — never prefer a bare email. */
export function sellerCompanyName(row) {
  const email = row?.email || row?.sellerEmail
  const raw = firstCompanyField(row)
  if (raw && !looksLikeEmailLabel(raw, email)) return raw
  const contact = String(row?.contact || row?.full_name || row?.fullName || '').trim()
  if (contact && !looksLikeEmailLabel(contact, email)) return contact
  if (raw) return raw
  return email ? String(email).split('@')[0] : 'Seller'
}

export function pickSellerCompanyName(prev, next) {
  const email = next?.email || prev?.email
  const a = String(prev?.name || '').trim()
  const b = String(next?.name || firstCompanyField(next) || '').trim()
  const aWeak = looksLikeEmailLabel(a, email)
  const bWeak = looksLikeEmailLabel(b, email)
  if (!aWeak && a) return a
  if (!bWeak && b) return b
  return sellerCompanyName({ ...prev, ...next, name: b || a, email })
}

export function auditDaysForStandard(name) {
  const s = String(name || '')
  if (/IATF|VDA\s*6\.3|AS9100|EN 9100/i.test(s)) return 3
  if (/13485|MDR|Nadcap|3834|special process/i.test(s)) return 2
  return 1
}

export function defaultSellerStandard(supplier) {
  const certs = Array.isArray(supplier?.certifications) ? supplier.certifications : []
  const first = certs.map((c) => (typeof c === 'string' ? c : c?.name)).find(Boolean)
  if (first) return String(first)
  const industry = String(supplier?.industry || '')
  if (/auto/i.test(industry)) return 'IATF 16949:2016'
  if (/aero/i.test(industry)) return 'AS9100D / EN 9100'
  if (/medical/i.test(industry)) return 'ISO 13485:2016'
  return 'ISO 9001:2015'
}
