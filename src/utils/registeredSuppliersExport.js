/**
 * Export helpers — registered suppliers registry (superadmin).
 */
import { writeJsonRowsToExcel } from './spreadsheet'

export const REGISTERED_SUPPLIERS_EXPORT_HEADERS = [
  'segment',
  'company_name',
  'industry',
  'country',
  'contact_name',
  'position',
  'email',
  'phone',
  'website',
  'row_index',
  'source_ref',
  'registry_source',
]

export function rowToExportObject(r) {
  return {
    segment: r.segment ?? '',
    company_name: r.company_name ?? '',
    industry: r.industry ?? '',
    country: r.country ?? '',
    contact_name: r.contact_name ?? '',
    position: r.position ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    website: r.website ?? '',
    row_index: r.row_index != null ? String(r.row_index) : '',
    source_ref: r.source_ref ?? '',
    registry_source: r.registry_source ?? '',
  }
}

export function downloadCsv(filename, rows) {
  const headers = REGISTERED_SUPPLIERS_EXPORT_HEADERS
  const esc = (v) => {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(',')]
  rows.forEach((r) => {
    const o = rowToExportObject(r)
    lines.push(headers.map((h) => esc(o[h])).join(','))
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportExcel(filename, rows) {
  const data = rows.map((r) => rowToExportObject(r))
  await writeJsonRowsToExcel(filename, data, 'Suppliers')
}

export async function exportPdf(rows, title = 'Registered suppliers') {
  const wrap = document.createElement('div')
  wrap.setAttribute('data-reg-suppliers-pdf', '1')
  wrap.style.cssText =
    "position:fixed;left:-12000px;top:0;width:1200px;background:#fff;padding:16px;color:#111;font-family:'Quattrocento Sans',Candara,Calibri,'Segoe UI',Roboto,sans-serif;"

  const h1 = document.createElement('h1')
  h1.textContent = title
  h1.style.cssText = 'font-size:18px;margin:0 0 10px;font-weight:700'
  wrap.appendChild(h1)

  const meta = document.createElement('div')
  meta.textContent = `Generated: ${new Date().toLocaleString()} · Rows: ${rows.length}`
  meta.style.cssText = 'font-size:10px;color:#666;margin-bottom:10px'
  wrap.appendChild(meta)

  const table = document.createElement('table')
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:9px'
  const headLabels = ['Segment', 'Company', 'Industry', 'Country', 'Contact', 'Role', 'Email', 'Phone', 'Web', '#', 'Source']
  const thead = document.createElement('thead')
  const hr = document.createElement('tr')
  hr.style.cssText = 'background:#f3f4f6;border-bottom:2px solid #ccc'
  headLabels.forEach((label) => {
    const th = document.createElement('th')
    th.textContent = label
    th.style.cssText = 'text-align:left;padding:5px 6px;border:1px solid #e5e7eb;font-weight:600'
    hr.appendChild(th)
  })
  thead.appendChild(hr)
  table.appendChild(thead)

  const tbody = document.createElement('tbody')
  rows.forEach((r, i) => {
    const o = rowToExportObject(r)
    const tr = document.createElement('tr')
    tr.style.background = i % 2 ? '#fafafa' : '#fff'
    const keys = ['segment', 'company_name', 'industry', 'country', 'contact_name', 'position', 'email', 'phone', 'website', 'row_index', 'source_ref']
    keys.forEach((key) => {
      const td = document.createElement('td')
      td.textContent = o[key] != null ? String(o[key]) : ''
      td.style.cssText = 'padding:4px 6px;border:1px solid #eee;vertical-align:top;word-break:break-word;max-width:180px'
      tr.appendChild(td)
    })
    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  wrap.appendChild(table)

  document.body.appendChild(wrap)

  try {
    const html2canvas = (await import('html2canvas')).default
    const { default: jsPDF } = await import('jspdf')

    const canvas = await html2canvas(wrap, {
      scale: 1.25,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 8
    const imgW = pageW - 2 * margin
    const totalH = (canvas.height / canvas.width) * imgW
    const pageInnerH = pageH - 2 * margin

    if (totalH <= pageInnerH) {
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      pdf.addImage(imgData, 'JPEG', margin, margin, imgW, totalH)
    } else {
      let yPx = 0
      let first = true
      while (yPx < canvas.height) {
        if (!first) pdf.addPage()
        first = false
        const slicePx = Math.min(
          Math.max(1, Math.floor((pageInnerH / totalH) * canvas.height) || 1),
          canvas.height - yPx,
        )
        const c2 = document.createElement('canvas')
        c2.width = canvas.width
        c2.height = slicePx
        c2.getContext('2d').drawImage(canvas, 0, yPx, canvas.width, slicePx, 0, 0, canvas.width, slicePx)
        const sliceData = c2.toDataURL('image/jpeg', 0.92)
        const sliceHmm = (slicePx / canvas.height) * totalH
        pdf.addImage(sliceData, 'JPEG', margin, margin, imgW, sliceHmm)
        yPx += slicePx
      }
    }

    pdf.save('registered-suppliers.pdf')
  } finally {
    document.body.removeChild(wrap)
  }
}
