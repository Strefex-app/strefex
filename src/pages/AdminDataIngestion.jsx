import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import supplierIngestionService from '../services/supplierIngestionService'
import '../styles/app-page.css'
import './SuperAdminDashboard.css'
import './AdminHubPages.css'

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
  const navigate = useNavigate()
  const [filename, setFilename] = useState('')
  const [rawRows, setRawRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ queued: 0, processed: 0, failed: 0 })

  const validation = useMemo(() => {
    const keys = rawRows.length > 0 ? Object.keys(rawRows[0]) : []
    const missingColumns = REQUIRED_COLUMNS.filter((col) => !keys.includes(col))
    const rowIssues = rawRows
      .map((row, idx) => {
        const missing = REQUIRED_COLUMNS.filter((col) => !String(row[col] || '').trim())
        return { index: idx + 1, missing }
      })
      .filter((item) => item.missing.length > 0)
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
      setFeedback(`Import completed. Processed: ${processed}, failed: ${failed}`)
    } finally {
      setImporting(false)
    }
  }

  const previewKeys = rawRows[0] ? Object.keys(rawRows[0]) : []

  return (
    <AppLayout>
      <div className="sad-page">
        <button type="button" className="app-page-back-link" onClick={() => navigate('/hub/governance')}>
          ← Admin
        </button>

        <div className="sad-header">
          <div>
            <h1 className="sad-title">Data pipeline import</h1>
            <p className="sad-subtitle">
              Upload supplier CSV datasets into the raw ingestion queue — separate from directory XLSX imports. Required
              columns: <strong>legal_name</strong>, <strong>display_name</strong>.
            </p>
          </div>
          <span className="sad-badge-super">Super Admin</span>
        </div>

        <div className="sad-kpis">
          <div className="sad-kpi">
            <div className="sad-kpi-icon orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <span className="sad-kpi-value">{stats.queued}</span>
            <span className="sad-kpi-label">Rows queued</span>
          </div>
          <div className="sad-kpi">
            <div className="sad-kpi-icon green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <span className="sad-kpi-value">{stats.processed}</span>
            <span className="sad-kpi-label">Processed</span>
          </div>
          <div className="sad-kpi">
            <div className="sad-kpi-icon rose">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <span className="sad-kpi-value">{stats.failed}</span>
            <span className="sad-kpi-label">Failed</span>
          </div>
        </div>

        {feedback ? (
          <div className="app-page-alert app-page-alert--success" role="status">
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="app-page-alert app-page-alert--error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="sad-widget" style={{ marginBottom: 16 }}>
          <h2 className="sad-widget-title">Upload CSV</h2>
          <p className="sad-subtitle" style={{ margin: '0 0 12px' }}>
            Choose a file to parse and preview. Import runs row-by-row through the ingestion service.
          </p>
          <div className="ahp-form-row">
            <input className="ahp-file-input" type="file" accept=".csv,text/csv" onChange={onFileChange} />
          </div>
        </div>

        <div className="sad-widget" style={{ marginBottom: 16 }}>
          <h2 className="sad-widget-title">Validation</h2>
          {validation.missingColumns.length > 0 && (
            <p style={{ color: 'var(--danger)', margin: '0 0 8px', fontSize: 14 }}>
              Missing required columns: {validation.missingColumns.join(', ')}
            </p>
          )}
          {validation.rowIssues.length > 0 && (
            <p style={{ color: 'var(--danger)', margin: '0 0 8px', fontSize: 14 }}>
              Rows with missing required values: {validation.rowIssues.length}
            </p>
          )}
          {validation.missingColumns.length === 0 && validation.rowIssues.length === 0 && rawRows.length > 0 && (
            <p style={{ color: 'var(--color-muted)', margin: '0 0 12px', fontSize: 14 }}>Ready to import.</p>
          )}
          <button
            type="button"
            className="ahp-btn-primary"
            disabled={importing || rawRows.length === 0}
            onClick={onImport}
          >
            {importing ? 'Importing…' : 'Import dataset'}
          </button>
        </div>

        <div className="sad-widget">
          <h2 className="sad-widget-title">Preview (first 25 rows)</h2>
          {rawRows.length === 0 ? (
            <div className="ahp-empty">No rows loaded. Select a CSV file above.</div>
          ) : (
            <div className="ahp-table-wrap">
              <table className="ahp-table">
                <thead>
                  <tr>
                    {previewKeys.map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 25).map((row, idx) => (
                    <tr key={idx}>
                      {previewKeys.map((k) => (
                        <td key={k}>{row[k]}</td>
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
