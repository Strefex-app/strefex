import { NUMBER_ENTRY } from './qualityExcellenceCompute'

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function parseDelimitedText(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '').trim()
  if (!raw) return { headers: [], rows: [] }
  const lines = raw.split(/\r?\n/).filter((line) => line.trim())
  const first = lines[0]
  const delim = first.includes('\t') ? '\t' : first.includes(';') ? ';' : ','
  const cells = lines.map((line) => line.split(delim).map((cell) => cell.trim().replace(/^"|"$/g, '')))
  const headerish = cells[0].some((cell) => /[a-zA-Z]/.test(cell) && Number.isNaN(Number(cell.replace(',', '.'))))
  if (headerish) {
    const headers = cells[0].map((h, i) => h || `col${i + 1}`)
    const rows = cells.slice(1).map((vals) => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
      return obj
    })
    return { headers, rows }
  }
  const values = cells.flat().filter((cell) => cell !== '')
  return {
    headers: ['value'],
    rows: values.map((value) => ({ value })),
  }
}

function aliasMap(columns = []) {
  const map = {
    value: ['value', 'reading', 'measurement', 'x', 'xbar', 'result', 'data', 'amount', 'minutes', 'count', 'cost'],
    reading: ['reading', 'value', 'measurement', 'x', 'data'],
    count: ['count', 'qty', 'quantity', 'n'],
    cost: ['cost', 'amount', 'usd', 'eur'],
    name: ['name', 'item', 'defect', 'cause', 'kpi'],
    sample: ['sample', 'date', 'subgroup', 'id'],
    severity: ['severity', 's'],
    occurrence: ['occurrence', 'o', 'occ'],
    detection: ['detection', 'd', 'det'],
    failuremode: ['failuremode', 'mode', 'fm'],
    item: ['item', 'step', 'process'],
    tolerance: ['tolerance', 'tol'],
    component: ['component', 'part', 'ctq'],
    response: ['response', 'y', 'result'],
    run: ['run', 'trial'],
    settings: ['settings', 'factors'],
    minutes: ['minutes', 'min', 'time'],
    type: ['type', 'internalexternal'],
    check: ['check', 'question'],
    result: ['result', 'passfail'],
    target: ['target', 'goal'],
    actual: ['actual', 'now'],
    ppm: ['ppm'],
    ppk: ['ppk'],
    complaints: ['complaints', 'nc'],
    supplier: ['supplier', 'vendor'],
    currentcost: ['currentcost', 'current'],
    simplifiedcost: ['simplifiedcost', 'simplified'],
    bucket: ['bucket', 'category'],
    amount: ['amount', 'cost', 'value'],
    gauge: ['gauge', 'gag', 'instrument'],
    ctq: ['ctq', 'characteristic'],
    inspection: ['inspection', 'check'],
    action: ['action', 'decision'],
    usl: ['usl'],
    lsl: ['lsl'],
    ev: ['ev', 'equipment'],
    av: ['av', 'appraiser'],
    pv: ['pv', 'partvariation'],
  }
  const out = {}
  columns.forEach((col) => {
    const key = col.key
    out[norm(key)] = key
    out[norm(col.label)] = key
    ;(map[norm(key)] || []).forEach((alias) => { out[alias] = key })
  })
  return out
}

export function mapImportedRows(importedRows, columns) {
  const aliases = aliasMap(columns)
  const keys = columns.map((c) => c.key)
  return (importedRows || []).map((row, i) => {
    const mapped = { id: `imp-${Date.now()}-${i}` }
    keys.forEach((key) => { mapped[key] = '' })
    Object.entries(row || {}).forEach(([header, value]) => {
      const target = aliases[norm(header)]
      if (target) mapped[target] = value
    })
    if (keys.includes('reading') && !mapped.reading && row.value != null) mapped.reading = row.value
    if (keys.includes('value') && !mapped.value && (row.reading != null || row.value != null)) {
      mapped.value = row.value ?? row.reading
    }
    return mapped
  }).filter((row) => keys.some((key) => String(row[key] || '').trim() !== ''))
}

export function applyImport(record, tool, importedRows, tableKey) {
  const table = (tool.tables || []).find((t) => t.key === tableKey)
    || (tool.tables || [])[0]
  if (!table) return record
  const mapped = mapImportedRows(importedRows, table.columns)
  return {
    ...record,
    tables: {
      ...(record.tables || {}),
      [table.key]: mapped.length ? mapped : (record.tables?.[table.key] || []),
    },
  }
}

export function defaultImportTable(tool) {
  return NUMBER_ENTRY[tool.id]?.table || tool.tables?.[0]?.key || null
}
