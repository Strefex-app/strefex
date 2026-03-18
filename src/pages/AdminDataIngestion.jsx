import { useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout'
import supplierIngestionService from '../services/supplierIngestionService'

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

function parseCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row = {}
    headers.forEach((h, index) => {
      row[h] = values[index] ?? ''
    })
    return row
  })
  return { headers, rows }
}

const REQUIRED_COLUMNS = ['legal_name', 'display_name']

export default function AdminDataIngestion() {
  const [filename, setFilename] = useState('')
  const [rawRows, setRawRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ queued: 0, processed: 0, failed: 0 })

  const validation = useMemo(() => {
    const missingColumns = REQUIRED_COLUMNS.filter((col) => !rawRows.some((row) => Object.prototype.hasOwnProperty.call(row, col)))
    const rowIssues = rawRows.map((row, idx) => {
      const missing = REQUIRED_COLUMNS.filter((col) => !String(row[col] || '').trim())
      return { index: idx + 1, missing }
    }).filter((item) => item.missing.length > 0)
    return { missingColumns, rowIssues }
  }, [rawRows])

  const onFileChange = async (e) => {
    setError('')
    setFeedback('')
    const file = e.target.files?.[0]
    if (!file) return
    setFilename(file.name)
    try {
      const text = await file.text()
      const parsed = parseCsv(text)
      setRawRows(parsed.rows)
      setStats({ queued: parsed.rows.length, processed: 0, failed: 0 })
    } catch (err) {
      setError(err?.message || 'Failed to parse CSV file.')
    }
  }

  const onImport = async () => {
    setError('')
    setFeedback('')
    if (validation.missingColumns.length > 0) {
      setError(`Missing required columns: ${validation.missingColumns.join(', ')}`)
      return
    }
    setImporting(true)
    let processed = 0
    let failed = 0
    try {
      for (const row of rawRows) {
        try {
          const queued = await supplierIngestionService.ingestRawSupplierData({
            sourceName: `csv:${filename || 'upload'}`,
            sourceType: 'import',
            rawJson: row,
          })
          await supplierIngestionService.processRawRecord(queued.id)
          processed += 1
        } catch {
          failed += 1
        }
      }
      setStats({ queued: rawRows.length, processed, failed })
      setFeedback(`Import completed. Processed: ${processed}, Failed: ${failed}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <AppLayout>
      <div className="app-page" style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div className="app-page-card">
          <h2 className="app-page-title">Admin CSV Upload Tool</h2>
          <p className="app-page-subtitle">Upload supplier datasets, preview records, validate fields, and import into structured schema.</p>
          {feedback && <p style={{ color: '#067647' }}>{feedback}</p>}
          {error && <p style={{ color: '#b42318' }}>{error}</p>}
          <input type="file" accept=".csv,text/csv" onChange={onFileChange} />
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Validation</h3>
          <div>Rows queued: {stats.queued}</div>
          <div>Rows processed: {stats.processed}</div>
          <div>Rows failed: {stats.failed}</div>
          {validation.missingColumns.length > 0 && (
            <p style={{ color: '#b42318' }}>Missing required columns: {validation.missingColumns.join(', ')}</p>
          )}
          {validation.rowIssues.length > 0 && (
            <p style={{ color: '#b42318' }}>Rows with missing required values: {validation.rowIssues.length}</p>
          )}
          <button type="button" className="app-page-btn-primary" disabled={importing || rawRows.length === 0} onClick={onImport}>
            {importing ? 'Importing...' : 'Import Dataset'}
          </button>
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Preview</h3>
          {rawRows.length === 0 ? (
            <p className="app-page-subtitle">No rows loaded.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr>
                    {Object.keys(rawRows[0] || {}).map((k) => (
                      <th key={k} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e4e7ec' }}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 25).map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(rawRows[0] || {}).map((k) => (
                        <td key={k} style={{ padding: 8, borderBottom: '1px solid #f2f4f7' }}>{row[k]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
