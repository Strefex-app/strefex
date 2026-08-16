import { useEffect, useRef, useState } from 'react'
import { NUMBER_ENTRY, resultChips } from '../../utils/qualityExcellenceCompute'
import { applyImport, defaultImportTable, parseDelimitedText } from '../../utils/qualityExcellenceImport'
import { focusNewRowFirstField, handleEnterAdvance } from '../../utils/qualityEnterAdvance'
import { readSpreadsheetFirstSheet } from '../../utils/spreadsheet'

function optionLabel(value) {
  return String(value || '').replace(/_/g, ' ')
}

export default function QualityOperatorPad({
  tool,
  draft,
  readOnly,
  onChangeField,
  onChangeRow,
  onAddRow,
  onApplyImport,
}) {
  const spec = NUMBER_ENTRY[tool.id]
  const fileRef = useRef(null)
  const entryRef = useRef(null)
  const focusNewRow = useRef(false)
  const [paste, setPaste] = useState('')
  const [hint, setHint] = useState('')
  const chips = resultChips(tool.id, draft)
  const table = spec?.table ? (tool.tables || []).find((t) => t.key === spec.table) : null
  const rows = table ? (draft.tables?.[table.key] || []) : []
  const columns = table ? table.columns.filter((c) => (spec.columns || []).includes(c.key)) : []
  const fieldDefs = (spec?.fields || [])
    .map((key) => [...(tool.headerFields || []), ...(tool.fields || [])].find((f) => f.key === key))
    .filter(Boolean)

  useEffect(() => {
    if (!focusNewRow.current) return
    focusNewRow.current = false
    focusNewRowFirstField(entryRef.current, columns.length || 1)
  }, [rows.length, columns.length])

  const onEntryKeyDown = (event) => {
    if (readOnly) return
    handleEnterAdvance(event, {
      container: entryRef.current,
      onLast: () => {
        if (!table) return
        focusNewRow.current = true
        onAddRow(table)
      },
    })
  }

  const importRows = async (imported) => {
    const tableKey = defaultImportTable(tool)
    if (!tableKey) {
      setHint('This tool has no data table to fill.')
      return
    }
    const next = applyImport(draft, tool, imported, tableKey)
    onApplyImport(next)
    setHint(`Loaded ${imported.length} row${imported.length === 1 ? '' : 's'}. Formulas updated.`)
  }

  const onFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      if (/\.csv$/i.test(file.name) || file.type.includes('csv')) {
        const text = await file.text()
        await importRows(parseDelimitedText(text).rows)
        return
      }
      const rowsIn = await readSpreadsheetFirstSheet(await file.arrayBuffer())
      await importRows(rowsIn)
    } catch (err) {
      setHint(err.message || 'Could not read file.')
    }
  }

  const onPasteApply = () => {
    const parsed = parseDelimitedText(paste)
    if (!parsed.rows.length) {
      setHint('Paste numbers, CSV, or a SQL result (tab-separated).')
      return
    }
    importRows(parsed.rows)
  }

  if (!spec) return null

  return (
    <section className="qe-pad">
      {chips.length > 0 && (
        <div className="qe-results">
          {chips.map((chip) => (
            <div key={chip.label} className="qe-result">
              <span className="stx-text-caption">{chip.label}</span>
              <strong>{chip.value}</strong>
            </div>
          ))}
        </div>
      )}

      {(fieldDefs.length > 0 || table) && (
        <div ref={entryRef} className="qe-pad__entry" onKeyDown={onEntryKeyDown}>
          {fieldDefs.length > 0 && (
            <div className={`qe-pad__fields qe-pad__fields--${Math.min(fieldDefs.length, 4) || 1}`}>
              {fieldDefs.map((field) => (
                <label key={field.key} className="qe-line">
                  <span className="stx-text-caption">{field.label}</span>
                  {field.type === 'select' ? (
                    <select value={draft.fields?.[field.key] ?? ''} disabled={readOnly || field.computed} onChange={(e) => onChangeField(field.key, e.target.value)}>
                      <option value="">Select…</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>{optionLabel(opt)}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      step="any"
                      value={draft.fields?.[field.key] ?? ''}
                      disabled={readOnly || field.computed}
                      onChange={(e) => onChangeField(field.key, e.target.value)}
                    />
                  )}
                </label>
              ))}
            </div>
          )}

          {table && (
            <div className="qe-pad__grid-wrap">
              <table className="qe-pad__grid">
                <thead>
                  <tr>
                    {columns.map((col) => <th key={col.key} className="stx-text-wrap">{col.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id || index}>
                      {columns.map((col) => (
                        <td key={col.key}>
                          {col.type === 'select' ? (
                            <select value={row[col.key] ?? ''} disabled={readOnly || col.computed} onChange={(e) => onChangeRow(table.key, index, col.key, e.target.value)}>
                              <option value="">—</option>
                              {(col.options || []).map((opt) => (
                                <option key={opt} value={opt}>{optionLabel(opt)}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={col.type === 'number' ? 'number' : 'text'}
                              step="any"
                              value={row[col.key] ?? ''}
                              disabled={readOnly || col.computed}
                              onChange={(e) => onChangeRow(table.key, index, col.key, e.target.value)}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!readOnly && (
                <button type="button" className="qe-btn" onClick={() => onAddRow(table)}>Add row</button>
              )}
            </div>
          )}
        </div>
      )}

      {!readOnly && (
        <details className="qe-import">
          <summary className="stx-text-caption">Paste or upload bulk data</summary>
          <textarea
            className="qe-import__paste"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="Paste Excel / CSV / SQL. Header optional."
          />
          <div className="qe-import__actions">
            <button type="button" className="qe-btn qe-btn--primary" onClick={onPasteApply}>Load paste</button>
            <button type="button" className="qe-btn" onClick={() => fileRef.current?.click()}>Upload Excel / CSV</button>
            <input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv,text/csv" onChange={onFile} />
          </div>
          {hint && <p className="stx-text-caption stx-text-wrap">{hint}</p>}
        </details>
      )}
    </section>
  )
}
