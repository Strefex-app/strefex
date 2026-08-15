/**
 * Lazy-loaded spreadsheet helpers — ExcelJS (maintained) instead of SheetJS xlsx.
 */
const MAX_SPREADSHEET_BYTES = 5 * 1024 * 1024

function cellText(value) {
  if (value == null || value === '') return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text
    if (value.result != null) return String(value.result)
    if (Array.isArray(value.richText)) return value.richText.map((t) => t.text || '').join('')
    if (value.hyperlink && value.text) return String(value.text)
  }
  return String(value)
}

export async function readSpreadsheetFirstSheet(arrayBuffer) {
  if (!arrayBuffer) return []
  const bytes = arrayBuffer.byteLength ?? arrayBuffer.length ?? 0
  if (bytes > MAX_SPREADSHEET_BYTES) {
    throw new Error('Spreadsheet is too large (max 5 MB).')
  }
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(arrayBuffer)
  const sheet = wb.worksheets[0]
  if (!sheet) return []

  const headers = []
  const rows = []
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = []
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      values[colNumber - 1] = cellText(cell.value)
    })
    if (rowNumber === 1) {
      values.forEach((v, i) => {
        headers[i] = String(v || '').trim() || `col${i + 1}`
      })
      return
    }
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? ''
    })
    rows.push(obj)
  })
  return rows
}

export async function writeJsonRowsToExcel(filename, rows, sheetName = 'Sheet1') {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(String(sheetName || 'Sheet1').slice(0, 31) || 'Sheet1')
  const list = Array.isArray(rows) ? rows : []
  if (list.length === 0) {
    ws.addRow(['(empty)'])
  } else {
    const headers = Object.keys(list[0])
    ws.addRow(headers)
    list.forEach((row) => {
      ws.addRow(headers.map((h) => (row[h] == null ? '' : row[h])))
    })
  }
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  a.click()
  URL.revokeObjectURL(a.href)
}
