/**
 * Export helpers for Buyer directory (superadmin) — CSV, Excel, PDF.
 * PDF uses html2canvas so Cyrillic / Unicode render correctly.
 */

export const DIRECTORY_EXPORT_HEADERS = [
  'segment',
  'company_name',
  'country',
  'contact_name',
  'position',
  'email',
  'phone',
  'website',
  'source_ref',
]

export function rowToExportObject(r) {
  return {
    segment: r.segment ?? '',
    company_name: r.company_name ?? '',
    country: r.country ?? '',
    contact_name: r.contact_name ?? '',
    position: r.position ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    website: r.website ?? '',
    source_ref: r.source_ref ?? '',
  }
}

export function downloadCsv(filename, rows) {
  const headers = DIRECTORY_EXPORT_HEADERS
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
  const XLSX = await import('xlsx')
  const data = rows.map((r) => rowToExportObject(r))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Directory')
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

/**
 * @param {Array<object>} rows
 * @param {string} [title]
 */
export async function exportPdf(rows, title = 'Buyer directory') {
  const wrap = document.createElement('div')
  wrap.setAttribute('data-buyer-dir-pdf', '1')
  wrap.style.cssText =
    'position:fixed;left:-12000px;top:0;width:1100px;background:#fff;padding:16px;color:#111;font-family:system-ui,Segoe UI,Roboto,sans-serif;'

  const h1 = document.createElement('h1')
  h1.textContent = title
  h1.style.cssText = 'font-size:18px;margin:0 0 10px;font-weight:700'
  wrap.appendChild(h1)

  const meta = document.createElement('div')
  meta.textContent = `Generated: ${new Date().toLocaleString()} · Rows: ${rows.length}`
  meta.style.cssText = 'font-size:10px;color:#666;margin-bottom:10px'
  wrap.appendChild(meta)

  const table = document.createElement('table')
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:10px'
  const headLabels = ['Segment', 'Company', 'Country', 'Contact', 'Role', 'Email', 'Phone', 'Website', 'Source']
  const thead = document.createElement('thead')
  const hr = document.createElement('tr')
  hr.style.cssText = 'background:#f3f4f6;border-bottom:2px solid #ccc'
  headLabels.forEach((label) => {
    const th = document.createElement('th')
    th.textContent = label
    th.style.cssText = 'text-align:left;padding:6px 8px;border:1px solid #e5e7eb;font-weight:600'
    hr.appendChild(th)
  })
  thead.appendChild(hr)
  table.appendChild(thead)

  const tbody = document.createElement('tbody')
  rows.forEach((r, i) => {
    const o = rowToExportObject(r)
    const tr = document.createElement('tr')
    tr.style.background = i % 2 ? '#fafafa' : '#fff'
    DIRECTORY_EXPORT_HEADERS.forEach((key) => {
      const td = document.createElement('td')
      td.textContent = o[key] != null ? String(o[key]) : ''
      td.style.cssText = 'padding:5px 8px;border:1px solid #eee;vertical-align:top;word-break:break-word;max-width:200px'
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
      scale: 1.35,
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

    pdf.save('buyer-directory.pdf')
  } finally {
    document.body.removeChild(wrap)
  }
}
