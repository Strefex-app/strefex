/** Program / project / procurement numbering helpers (tenant-scoped sequences). */

export function currentYear() {
  return new Date().getFullYear()
}

export function formatProgramNumber(year, seq) {
  return `PGM-${year}-${String(seq).padStart(3, '0')}`
}

export function formatProjectNumber(programNumber, seq) {
  return `${programNumber}-P${String(seq).padStart(2, '0')}`
}

/** Standalone project number (no program parent). */
export function formatStandaloneProjectNumber(year, seq) {
  return `PRJ-${year}-${String(seq).padStart(3, '0')}`
}

export function standaloneProjectNumberPattern(year) {
  return new RegExp(`^PRJ-${year}-(\\d+)$`)
}

export function formatOpportunityNumber(year, seq) {
  return `OPP-${year}-${String(seq).padStart(3, '0')}`
}

/** User-facing RFQ number — paired with OPP on the same record. */
export function formatRfqNumber(year, seq) {
  return `RFQ-${year}-${String(seq).padStart(3, '0')}`
}

export function rfqNumberPattern(year) {
  return new RegExp(`^RFQ-${year}-(\\d+)$`)
}

export function formatQuotationNumber(year, seq) {
  return `QUO-${year}-${String(seq).padStart(3, '0')}`
}

export function formatPONumber(year, seq) {
  return `PO-${year}-${String(seq).padStart(4, '0')}`
}

export function nextSeqFromNumbers(items, pattern, year, field) {
  let max = 0
  const re = pattern(year)
  ;(items || []).forEach((item) => {
    const num =
      item[field] ||
      item.opportunityNumber ||
      item.quotationNumber ||
      item.programNumber ||
      item.id ||
      ''
    const m = typeof num === 'string' ? num.match(re) : null
    if (m) max = Math.max(max, parseInt(m[1], 10))
  })
  return max + 1
}

export function programNumberPattern(year) {
  return new RegExp(`^PGM-${year}-(\\d+)$`)
}

export function opportunityNumberPattern(year) {
  return new RegExp(`^OPP-${year}-(\\d+)$`)
}

export function quotationNumberPattern(year) {
  return new RegExp(`^QUO-${year}-(\\d+)$`)
}

export function poNumberPattern(year) {
  return new RegExp(`^PO-${year}-(\\d+)$`)
}

/** Human-readable chain for headers and tooltips. */
export function formatReferenceChain(parts) {
  return parts.filter(Boolean).join(' → ')
}
