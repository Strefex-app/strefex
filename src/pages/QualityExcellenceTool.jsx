import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import QualityToolVisuals from '../components/quality/QualityToolVisuals'
import QualityOperatorPad from '../components/quality/QualityOperatorPad'
import QualityToolTraining from '../components/quality/QualityToolTraining'
import {
  A3Windows,
  EightDWindows,
  FishboneWindows,
  FiveWhysWindows,
  PdcaWindows,
  hasSimpleWindows,
} from '../components/quality/QualitySimpleWorksheets'
import {
  QUALITY_RECORD_STATUSES,
  getQualityTool,
} from '../data/qualityExcellenceCatalog'
import useQualityExcellenceStore from '../store/qualityExcellenceStore'
import useIatfControlStore from '../store/iatfControlStore'
import { NUMBER_ENTRY, computeQualityRecord, summarizeQualityRecord } from '../utils/qualityExcellenceCompute'
import { focusNewRowFirstField, handleEnterAdvance } from '../utils/qualityEnterAdvance'
import './QualityExcellence.css'
import '../styles/app-page.css'
import '../styles/managementShell.css'

const HUB = '/management/ops/quality-excellence'
const IDENTITY_KEYS = ['title', 'owner', 'status', 'process']

function optionLabel(value) {
  const status = QUALITY_RECORD_STATUSES.find((s) => s.id === value)
  if (status) return status.label
  return String(value || '').replace(/_/g, ' ')
}

function FieldControl({ field, value, onChange, readOnly, id }) {
  const disabled = readOnly || field.computed
  const common = {
    id,
    value: value ?? '',
    disabled,
    onChange: (e) => onChange(field.key, e.target.value),
  }
  if (field.type === 'textarea') {
    return <textarea {...common} placeholder={field.placeholder || ''} />
  }
  if (field.type === 'select') {
    return (
      <select {...common}>
        <option value="">Select…</option>
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>{optionLabel(opt)}</option>
        ))}
      </select>
    )
  }
  return (
    <input
      {...common}
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      placeholder={field.placeholder || ''}
      step={field.type === 'number' ? 'any' : undefined}
    />
  )
}

function FieldGrid({ fields, values, onChange, readOnly, prefix }) {
  return (
    <div className="qe-form">
      {fields.map((field) => (
        <label key={field.key} className={`qe-field${field.full ? ' qe-field--full' : ''}`} htmlFor={`${prefix}-${field.key}`}>
          <span className="stx-text-caption">{field.label}{field.computed ? ' (auto)' : ''}</span>
          <FieldControl
            id={`${prefix}-${field.key}`}
            field={field}
            value={values?.[field.key]}
            onChange={onChange}
            readOnly={readOnly}
          />
        </label>
      ))}
    </div>
  )
}

function IatfMasterFields({ draft, readOnly, onChange, onChangeMany }) {
  const parts = useIatfControlStore((s) => s.parts)
  const processes = useIatfControlStore((s) => s.processes)
  if (!parts.length && !processes.length) return null

  const setPart = (partId) => {
    const part = parts.find((row) => row.id === partId)
    const patch = { partId }
    if (part?.processId) {
      patch.processId = part.processId
      const prc = processes.find((row) => row.id === part.processId)
      if (prc?.name) patch.process = prc.name
    }
    if (onChangeMany) onChangeMany(patch)
    else onChange('partId', partId)
  }
  const setProcess = (processId) => {
    const prc = processes.find((row) => row.id === processId)
    onChangeMany?.({ processId, ...(prc?.name ? { process: prc.name } : {}) })
  }

  return (
    <>
      <label className="qe-line">
        <span className="stx-text-caption">Part (IATF master)</span>
        <select
          id="qe-id-partId"
          value={draft.fields?.partId || ''}
          disabled={readOnly}
          onChange={(e) => setPart(e.target.value)}
        >
          <option value="">Select…</option>
          {parts.map((part) => (
            <option key={part.id} value={part.id}>{part.partNumber || part.name}</option>
          ))}
        </select>
      </label>
      <label className="qe-line">
        <span className="stx-text-caption">Process (IATF master)</span>
        <select
          id="qe-id-processId"
          value={draft.fields?.processId || ''}
          disabled={readOnly}
          onChange={(e) => setProcess(e.target.value)}
        >
          <option value="">Select…</option>
          {processes.map((prc) => (
            <option key={prc.id} value={prc.id}>{prc.name}</option>
          ))}
        </select>
      </label>
    </>
  )
}

function WorksheetTable({ table, rows, onChangeRow, onAddRow, onRemoveRow, readOnly }) {
  const wrapRef = useRef(null)
  const focusNewRow = useRef(false)
  const editableCols = (table.columns || []).filter((col) => !col.computed).length

  useEffect(() => {
    if (!focusNewRow.current) return
    focusNewRow.current = false
    focusNewRowFirstField(wrapRef.current, editableCols || 1)
  }, [rows?.length, editableCols])

  return (
    <section className="qe-table-section">
      <div className="qe-toolbar">
        <h3 className="stx-text-heading">{table.label}</h3>
        {!readOnly && <button type="button" className="qe-btn" onClick={onAddRow}>Add row</button>}
      </div>
      <div
        className="qe-table-wrap"
        ref={wrapRef}
        onKeyDown={(event) => {
          if (readOnly) return
          handleEnterAdvance(event, {
            container: wrapRef.current,
            onLast: () => {
              focusNewRow.current = true
              onAddRow()
            },
          })
        }}
      >
        <table className="qe-table">
          <thead>
            <tr>
              {table.columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              {!readOnly && <th> </th>}
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row, index) => (
              <tr key={row.id || index}>
                {table.columns.map((col) => (
                  <td key={col.key}>
                    <FieldControl
                      id={`qe-${table.key}-${index}-${col.key}`}
                      field={col}
                      value={row[col.key]}
                      readOnly={readOnly}
                      onChange={(key, value) => onChangeRow(index, key, value)}
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td>
                    <button type="button" className="qe-btn qe-btn--danger" onClick={() => onRemoveRow(index)}>Remove</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function RecordEditor({ tool, record, readOnly }) {
  const navigate = useNavigate()
  const updateRecord = useQualityExcellenceStore((s) => s.updateRecord)
  const deleteRecord = useQualityExcellenceStore((s) => s.deleteRecord)
  const [draft, setDraft] = useState(() => computeQualityRecord(tool.id, record))
  const [saved, setSaved] = useState(true)
  const [activeCategory, setActiveCategory] = useState('Man / People')
  const saveTimer = useRef(null)

  useEffect(() => {
    setDraft(computeQualityRecord(tool.id, record))
    setSaved(true)
  }, [record.id, tool.id])

  const persist = (next) => {
    const computed = computeQualityRecord(tool.id, next)
    updateRecord(record.id, {
      title: computed.fields?.title,
      status: computed.fields?.status,
      fields: computed.fields,
      tables: computed.tables,
    })
    setDraft(computed)
    setSaved(true)
  }

  const queueSave = (next) => {
    const computed = computeQualityRecord(tool.id, next)
    setDraft(computed)
    setSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist(computed), 500)
  }

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const setField = (key, value) => {
    queueSave({ ...draft, fields: { ...draft.fields, [key]: value } })
  }

  const setFields = (patch) => {
    queueSave({ ...draft, fields: { ...draft.fields, ...patch } })
  }

  const setTableCell = (tableKey, index, key, value) => {
    const rows = [...(draft.tables?.[tableKey] || [])]
    rows[index] = { ...rows[index], [key]: value }
    queueSave({ ...draft, tables: { ...draft.tables, [tableKey]: rows } })
  }

  const addRow = (table, seed = {}) => {
    const blank = { id: `row-${Date.now()}` }
    table.columns.forEach((col) => { blank[col.key] = '' })
    Object.assign(blank, seed)
    queueSave({
      ...draft,
      tables: { ...draft.tables, [table.key]: [...(draft.tables?.[table.key] || []), blank] },
    })
  }

  const removeRow = (tableKey, index) => {
    queueSave({
      ...draft,
      tables: { ...draft.tables, [tableKey]: (draft.tables?.[tableKey] || []).filter((_, i) => i !== index) },
    })
  }

  const identity = (tool.headerFields || []).filter((f) => IDENTITY_KEYS.includes(f.key))
  const extraHeader = (tool.headerFields || []).filter((f) => !IDENTITY_KEYS.includes(f.key))
  const hasPad = Boolean(NUMBER_ENTRY[tool.id])
  const hasWindows = hasSimpleWindows(tool.id)
  const workMode = hasPad ? 'with-pad' : hasWindows ? 'windows' : 'solo'

  return (
    <div className="qe-fit">
      <div
        className="qe-id-strip"
        onKeyDown={(event) => handleEnterAdvance(event, { container: event.currentTarget })}
      >
        {identity.map((field) => (
          <label key={field.key} className="qe-line">
            <span className="stx-text-caption">{field.label}</span>
            <FieldControl
              id={`qe-id-${field.key}`}
              field={field}
              value={draft.fields?.[field.key]}
              onChange={setField}
              readOnly={readOnly}
            />
          </label>
        ))}
        <IatfMasterFields draft={draft} readOnly={readOnly} onChange={setField} onChangeMany={setFields} />
      </div>

      <div className={`qe-work qe-work--${workMode}`}>
        <div className="qe-work__main">
          <QualityToolVisuals
            toolId={tool.id}
            draft={draft}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
        </div>

        {tool.id === 't1-5-whys' && (
          <div className="qe-work__side">
            <FiveWhysWindows
              rows={draft.tables.chain}
              fields={draft.fields}
              readOnly={readOnly}
              onChangeRow={(index, key, value) => setTableCell('chain', index, key, value)}
              onChangeField={setField}
            />
          </div>
        )}
        {tool.id === 't2-ishikawa' && (
          <div className="qe-work__side">
            <FishboneWindows
              rows={draft.tables.causes}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              readOnly={readOnly}
              onChangeRow={(index, key, value) => setTableCell('causes', index, key, value)}
              onAddCause={(category, cause) => addRow(tool.tables[0], { category, cause, status: 'open' })}
            />
          </div>
        )}
        {tool.id === 't3-pdca' && (
          <div className="qe-work__side">
            <PdcaWindows fields={draft.fields} readOnly={readOnly} onChangeField={setField} />
          </div>
        )}
        {tool.id === 't4-8d' && (
          <div className="qe-work__side">
            <EightDWindows
              disciplines={draft.tables.disciplines}
              isIsNot={draft.tables.isIsNot}
              readOnly={readOnly}
              onChangeRow={setTableCell}
            />
          </div>
        )}
        {tool.id === 't5-a3' && (
          <div className="qe-work__side">
            <A3Windows
              fields={draft.fields}
              rows={draft.tables.countermeasures}
              readOnly={readOnly}
              onChangeField={setField}
              onChangeRow={(index, key, value) => setTableCell('countermeasures', index, key, value)}
            />
          </div>
        )}

        {hasPad && (
          <QualityOperatorPad
            tool={tool}
            draft={draft}
            readOnly={readOnly}
            onChangeField={setField}
            onChangeRow={setTableCell}
            onAddRow={addRow}
            onApplyImport={(next) => queueSave(next)}
          />
        )}
      </div>

      <details className="qe-details">
        <summary className="stx-text-caption">More fields / full worksheet</summary>
        {extraHeader.length > 0 && (
          <FieldGrid fields={extraHeader} values={draft.fields} onChange={setField} readOnly={readOnly} prefix="qe-h" />
        )}
        {(tool.fields || []).length > 0 && (
          <FieldGrid fields={tool.fields} values={draft.fields} onChange={setField} readOnly={readOnly} prefix="qe-f" />
        )}
        {(tool.tables || []).map((table) => (
          <WorksheetTable
            key={table.key}
            table={table}
            rows={draft.tables?.[table.key] || []}
            readOnly={readOnly}
            onChangeRow={(index, key, value) => setTableCell(table.key, index, key, value)}
            onAddRow={() => addRow(table)}
            onRemoveRow={(index) => removeRow(table.key, index)}
          />
        ))}
      </details>

      <div className="qe-actions qe-actions--sticky">
        <button type="button" className="qe-btn" onClick={() => navigate(`${HUB}/${tool.id}`)}>Records</button>
        {!readOnly && (
          <>
            <button type="button" className="qe-btn qe-btn--primary" onClick={() => persist(draft)}>
              {saved ? 'Saved' : 'Save now'}
            </button>
            <button type="button" className="qe-btn qe-btn--danger" onClick={() => {
              if (!window.confirm('Delete this quality record?')) return
              deleteRecord(record.id)
              navigate(`${HUB}/${tool.id}`)
            }}>Delete</button>
          </>
        )}
        <span className="stx-text-caption">{saved ? 'Auto-saved' : 'Saving…'}</span>
      </div>
    </div>
  )
}

export default function QualityExcellenceTool() {
  const { toolId, recordId } = useParams()
  const navigate = useNavigate()
  const tool = getQualityTool(toolId)
  const records = useQualityExcellenceStore((s) => s.records)
  const createRecord = useQualityExcellenceStore((s) => s.createRecord)
  const canEdit = useQualityExcellenceStore((s) => s.canEdit)
  const list = useMemo(
    () => useQualityExcellenceStore.getState().listByTool(toolId),
    [records, toolId],
  )
  const record = useMemo(
    () => (recordId ? useQualityExcellenceStore.getState().getById(recordId) : null),
    [records, recordId],
  )
  const readOnly = !canEdit()

  if (!tool) return <Navigate to={HUB} replace />
  if (recordId && recordId !== 'new' && !record) return <Navigate to={`${HUB}/${tool.id}`} replace />

  const startNew = () => {
    const created = createRecord(tool.id)
    if (created) navigate(`${HUB}/${tool.id}/${created.id}`)
  }

  return (
    <AppLayout>
      <div className="qe-page qe-page--tool">
        <header className="qe-tool-head">
          <div className="qe-tool-head__copy">
            <p className="stx-text-caption">{tool.number} · <span className="qe-tag">{tool.tagLabel}</span></p>
            <h1 className="app-page-title">{tool.shortName}</h1>
          </div>
          {!record && !readOnly && (
            <button type="button" className="qe-btn qe-btn--primary" onClick={startNew}>New record</button>
          )}
        </header>

        {record ? (
          <RecordEditor tool={tool} record={record} readOnly={readOnly} />
        ) : (
          <>
            <QualityToolTraining tool={tool} />
            <div className="qe-list">
              {list.length === 0 && (
                <p className="stx-text-small">No records yet. Read the training above, then create a record — numbers calculate as you type or paste.</p>
              )}
              {list.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="qe-list__card"
                  onClick={() => navigate(`${HUB}/${tool.id}/${row.id}`)}
                >
                  <div className="qe-card__meta">
                    <span>{optionLabel(row.status || row.fields?.status)}</span>
                    <span>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '—'}</span>
                  </div>
                  <strong className="stx-text-wrap">{row.title || row.fields?.title || `${tool.number} record`}</strong>
                  <p className="stx-text-caption stx-text-wrap">{summarizeQualityRecord(tool.id, row)}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
