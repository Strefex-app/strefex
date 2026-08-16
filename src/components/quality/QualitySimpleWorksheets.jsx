import { useState } from 'react'
import { FISHBONE_6M } from '../../utils/qualityExcellenceVisuals'
import { handleEnterAdvance } from '../../utils/qualityEnterAdvance'

function Window({ title, hint, active, children }) {
  return (
    <section className={`qe-window${active ? ' is-active' : ''}`}>
      <header className="qe-window__head">
        <h3 className="stx-text-heading">{title}</h3>
        {hint && <p className="stx-text-caption stx-text-wrap">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

function Line({ label, value, onChange, readOnly, placeholder, type = 'text' }) {
  return (
    <label className="qe-line">
      {label && <span className="stx-text-caption">{label}</span>}
      {type === 'textarea' ? (
        <textarea value={value ?? ''} disabled={readOnly} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          disabled={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  )
}

function EntryGroup({ children, readOnly }) {
  return (
    <div
      onKeyDown={(event) => {
        if (readOnly) return
        handleEnterAdvance(event, { container: event.currentTarget })
      }}
    >
      {children}
    </div>
  )
}

export function FiveWhysWindows({ rows = [], fields, onChangeRow, onChangeField, readOnly }) {
  return (
    <EntryGroup readOnly={readOnly}>
    <div className="qe-windows qe-windows--stack">
      {(rows || []).map((row, index) => (
        <Window key={row.id || index} title={row.step || `Why ${index}`} hint={row.question}>
          <Line label="Answer (evidence-based)" value={row.answer} readOnly={readOnly} placeholder="What did you observe?" onChange={(v) => onChangeRow(index, 'answer', v)} />
          <Line label="Evidence source" value={row.evidence} readOnly={readOnly} placeholder="Photo, scrap, timestamp…" onChange={(v) => onChangeRow(index, 'evidence', v)} />
        </Window>
      ))}
      <Window title="Lock the cause">
        <Line label="Systemic root cause" type="textarea" value={fields.rootCause} readOnly={readOnly} onChange={(v) => onChangeField('rootCause', v)} />
        <Line label="Corrective action" type="textarea" value={fields.correctiveAction} readOnly={readOnly} onChange={(v) => onChangeField('correctiveAction', v)} />
      </Window>
    </div>
    </EntryGroup>
  )
}

export function FishboneWindows({
  rows = [],
  activeCategory,
  onSelectCategory,
  onChangeRow,
  onAddCause,
  readOnly,
}) {
  const [drafts, setDrafts] = useState({})
  return (
    <div className="qe-windows qe-windows--6m">
      {FISHBONE_6M.map((cat) => {
        const causes = rows
          .map((row, index) => ({ row, index }))
          .filter(({ row }) => (row.category || '') === cat.key)
        return (
          <Window
            key={cat.key}
            title={cat.short}
            hint="Type one cause, then add. Keep it short."
            active={activeCategory === cat.key}
          >
            <div
              className="qe-window__body"
              onClick={() => onSelectCategory?.(cat.key)}
              onKeyDown={(event) => {
                if (readOnly) return
                if (event.target.placeholder === 'Add a cause…') return
                handleEnterAdvance(event, { container: event.currentTarget })
              }}
            >
              {causes.map(({ row, index }) => (
                <div key={row.id || index} className="qe-cause-line">
                  <input
                    value={row.cause ?? ''}
                    disabled={readOnly}
                    placeholder="Potential cause"
                    onChange={(e) => onChangeRow(index, 'cause', e.target.value)}
                    onFocus={() => onSelectCategory?.(cat.key)}
                  />
                  <select
                    value={row.status || 'open'}
                    disabled={readOnly}
                    onChange={(e) => onChangeRow(index, 'status', e.target.value)}
                  >
                    <option value="open">open</option>
                    <option value="confirmed">confirmed</option>
                    <option value="ruled_out">ruled out</option>
                  </select>
                </div>
              ))}
              {!readOnly && (
                <div className="qe-cause-add">
                  <input
                    value={drafts[cat.key] || ''}
                    placeholder="Add a cause…"
                    onChange={(e) => setDrafts((d) => ({ ...d, [cat.key]: e.target.value }))}
                    onFocus={() => onSelectCategory?.(cat.key)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' || !drafts[cat.key]?.trim()) return
                      e.preventDefault()
                      onAddCause(cat.key, drafts[cat.key].trim())
                      setDrafts((d) => ({ ...d, [cat.key]: '' }))
                    }}
                  />
                  <button
                    type="button"
                    className="qe-btn qe-btn--primary"
                    onClick={() => {
                      if (!drafts[cat.key]?.trim()) return
                      onAddCause(cat.key, drafts[cat.key].trim())
                      setDrafts((d) => ({ ...d, [cat.key]: '' }))
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </Window>
        )
      })}
    </div>
  )
}

export function PdcaWindows({ fields, onChangeField, readOnly }) {
  return (
    <EntryGroup readOnly={readOnly}>
    <div className="qe-windows qe-windows--4">
      <Window title="Plan" hint="Baseline, hypothesis, prediction">
        <Line label="Baseline" value={fields.baseline} readOnly={readOnly} onChange={(v) => onChangeField('baseline', v)} />
        <Line label="Hypothesis" type="textarea" value={fields.hypothesis} readOnly={readOnly} onChange={(v) => onChangeField('hypothesis', v)} />
        <Line label="Prediction" value={fields.prediction} readOnly={readOnly} onChange={(v) => onChangeField('prediction', v)} />
      </Window>
      <Window title="Do" hint="Pilot only">
        <Line label="Pilot scope" value={fields.pilotScope} readOnly={readOnly} onChange={(v) => onChangeField('pilotScope', v)} />
        <Line label="Execution notes" type="textarea" value={fields.doNotes} readOnly={readOnly} onChange={(v) => onChangeField('doNotes', v)} />
      </Window>
      <Window title="Check" hint="Actual vs prediction">
        <Line label="Result" type="textarea" value={fields.checkResult} readOnly={readOnly} onChange={(v) => onChangeField('checkResult', v)} />
      </Window>
      <Window title="Act" hint="Standardise or repeat">
        <label className="qe-line">
          <span className="stx-text-caption">Decision</span>
          <select value={fields.actDecision || ''} disabled={readOnly} onChange={(e) => onChangeField('actDecision', e.target.value)}>
            <option value="">Select…</option>
            <option value="standardise">standardise</option>
            <option value="revise_and_repeat">revise and repeat</option>
            <option value="pending">pending</option>
          </select>
        </label>
        <Line label="Documents updated" value={fields.documentsUpdated} readOnly={readOnly} onChange={(v) => onChangeField('documentsUpdated', v)} />
      </Window>
    </div>
    </EntryGroup>
  )
}

export function EightDWindows({ disciplines = [], isIsNot = [], onChangeRow, readOnly }) {
  return (
    <EntryGroup readOnly={readOnly}>
    <div className="qe-windows qe-windows--stack">
      <div className="qe-windows qe-windows--3">
        {disciplines.map((row, index) => (
          <Window key={row.id || index} title={`${row.code} ${row.discipline}`}>
            <Line label="Evidence / output" type="textarea" value={row.output} readOnly={readOnly} onChange={(v) => onChangeRow('disciplines', index, 'output', v)} />
            <Line label="Owner" value={row.owner} readOnly={readOnly} onChange={(v) => onChangeRow('disciplines', index, 'owner', v)} />
            <label className="qe-line">
              <span className="stx-text-caption">Status</span>
              <select value={row.status || 'open'} disabled={readOnly} onChange={(e) => onChangeRow('disciplines', index, 'status', e.target.value)}>
                <option value="open">open</option>
                <option value="in_progress">in progress</option>
                <option value="verified">verified</option>
                <option value="closed">closed</option>
              </select>
            </label>
          </Window>
        ))}
      </div>
      <div className="qe-windows qe-windows--2">
        {isIsNot.map((row, index) => (
          <Window key={row.id || index} title={row.dimension || `IS / IS NOT ${index + 1}`}>
            <Line label="IS" value={row.is} readOnly={readOnly} placeholder="What the problem is" onChange={(v) => onChangeRow('isIsNot', index, 'is', v)} />
            <Line label="IS NOT" value={row.isNot} readOnly={readOnly} placeholder="What it is not" onChange={(v) => onChangeRow('isIsNot', index, 'isNot', v)} />
          </Window>
        ))}
      </div>
    </div>
    </EntryGroup>
  )
}

export function A3Windows({ fields, rows = [], onChangeField, onChangeRow, readOnly }) {
  return (
    <EntryGroup readOnly={readOnly}>
    <div className="qe-windows qe-windows--2">
      <Window title="Left — define">
        <Line label="Background" type="textarea" value={fields.background} readOnly={readOnly} onChange={(v) => onChangeField('background', v)} />
        <Line label="Current condition" type="textarea" value={fields.currentCondition} readOnly={readOnly} onChange={(v) => onChangeField('currentCondition', v)} />
        <Line label="Goal" value={fields.goal} readOnly={readOnly} onChange={(v) => onChangeField('goal', v)} />
        <Line label="Root cause" type="textarea" value={fields.rootCause} readOnly={readOnly} onChange={(v) => onChangeField('rootCause', v)} />
      </Window>
      <Window title="Right — act">
        {rows.map((row, index) => (
          <Line
            key={row.id || index}
            label={`Action ${index + 1}`}
            value={row.action}
            readOnly={readOnly}
            onChange={(v) => onChangeRow(index, 'action', v)}
          />
        ))}
        <Line label="Results" type="textarea" value={fields.results} readOnly={readOnly} onChange={(v) => onChangeField('results', v)} />
        <Line label="Next steps" type="textarea" value={fields.nextSteps} readOnly={readOnly} onChange={(v) => onChangeField('nextSteps', v)} />
      </Window>
    </div>
    </EntryGroup>
  )
}

export function hasSimpleWindows(toolId) {
  return ['t1-5-whys', 't2-ishikawa', 't3-pdca', 't4-8d', 't5-a3'].includes(toolId)
}
