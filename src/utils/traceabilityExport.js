/**
 * Export traceability register rows to CSV for audit and offline review.
 */

const HEADERS = [
  'Project',
  'Project name',
  'Opportunity',
  'Opportunity title',
  'Quotation',
  'Supplier',
  'Vendor master #',
  'Vendor quote ref',
  'Amount',
  'Currency',
  'Quote status',
  'PO',
  'PO status',
]

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function traceRowsToCsv(rows = []) {
  const lines = [HEADERS.map(csvEscape).join(',')]
  rows.forEach((row) => {
    lines.push(
      [
        row.projectNumber,
        row.projectName,
        row.opportunityNumber,
        row.opportunityTitle,
        row.quotationNumber,
        row.supplier,
        row.vendorNumber,
        row.supplierQuotationRef,
        row.amount,
        row.currency,
        row.quoteStatus,
        row.poNumber,
        row.poStatus,
      ].map(csvEscape).join(','),
    )
  })
  return lines.join('\n')
}

export function downloadTraceCsv(rows, filename = 'procurement-traceability.csv') {
  const csv = traceRowsToCsv(rows)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
