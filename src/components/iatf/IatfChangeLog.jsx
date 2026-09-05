import IatfField from './IatfField'

export default function IatfChangeLog({ entries = [], empty = 'No changes recorded yet.' }) {
  if (!entries.length) {
    return <p className="stx-text-caption">{empty}</p>
  }
  return (
    <ol className="iatf-log">
      {entries.map((entry) => (
        <li key={entry.id} className="iatf-log__item">
          <div className="iatf-log__head">
            <strong>{entry.action}</strong>
            <span className="stx-text-caption">
              {entry.at ? new Date(entry.at).toLocaleString() : ''}
              {entry.actor ? ` · ${entry.actor}` : ''}
            </span>
          </div>
          {entry.entityLabel ? (
            <p className="stx-text-caption stx-text-wrap">{entry.entityLabel}</p>
          ) : null}
          {entry.reason ? (
            <p className="stx-text-caption stx-text-wrap">Reason: {entry.reason}</p>
          ) : null}
          {(entry.changes || []).length > 0 && (
            <ul className="iatf-log__changes">
              {entry.changes.map((change) => (
                <li key={`${entry.id}-${change.field}`} className="stx-text-caption stx-text-wrap">
                  {change.field}: {change.oldValue || '—'} → {change.newValue || '—'}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}

export function IatfEditDialog({
  title,
  fields = [],
  values,
  onChange,
  reason,
  onReason,
  requireReason,
  onSave,
  onClose,
  children,
}) {
  return (
    <div className="iatf-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="iatf-dialog app-page-card"
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="stx-text-heading">{title}</h2>
        <div className="iatf-form-grid">
          {fields.map((field) => (
            <IatfField key={field.key} label={field.label}>
              {field.type === 'select' ? (
                <select
                  value={values[field.key] ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                >
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={values[field.key] ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
              )}
            </IatfField>
          ))}
          <IatfField label={requireReason ? 'Reason for change (required)' : 'Reason for change'}>
            <input
              value={reason}
              onChange={(e) => onReason(e.target.value)}
              placeholder="IATF 7.5.3 / 8.5.6 — why this record changed"
            />
          </IatfField>
        </div>
        {children}
        <div className="iatf-dialog__actions">
          <button type="button" className="qe-btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="app-page-btn-primary"
            disabled={requireReason && !String(reason || '').trim()}
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
