import {
  SOURCING_METRIC_NUMBER_FIELDS,
  SOURCING_METRIC_TEXT_FIELDS,
} from '../utils/sourcingMetrics'

/**
 * Shared inputs for seller Profile + superadmin account detail.
 * `values` / `onChange` use the flat sourcing-metrics form shape.
 */
export default function SourcingMetricsFields({
  values = {},
  onChange,
  disabled = false,
  className = '',
  inputClassName = 'prof-form-input',
  labelClassName = 'prof-form-label',
  groupClassName = 'prof-form-group',
  gridClassName = 'prof-form-grid',
  title = 'Sourcing metrics',
  hint = 'Used in Intelligent Sourcing lists and Compare. Leave blank when unknown — compare shows “—”.',
}) {
  const set = (key, value) => {
    if (typeof onChange === 'function') onChange({ ...(values || {}), [key]: value })
  }

  return (
    <div className={className}>
      {title ? <h3 className="prof-modal-title" style={{ fontSize: 'var(--text-section)', margin: '12px 0 4px' }}>{title}</h3> : null}
      {hint ? <p className="prof-profile-attachments-hint" style={{ marginBottom: 12 }}>{hint}</p> : null}
      <div className={gridClassName}>
        {SOURCING_METRIC_NUMBER_FIELDS.map((f) => (
          <div key={f.key} className={groupClassName}>
            <label className={labelClassName} htmlFor={`stx-metric-${f.key}`}>{f.label}</label>
            <input
              id={`stx-metric-${f.key}`}
              className={inputClassName}
              type="number"
              inputMode="decimal"
              min={f.min}
              max={f.max}
              step={f.step}
              value={values[f.key] ?? ''}
              onChange={(e) => set(f.key, e.target.value)}
              disabled={disabled}
              placeholder="—"
              title={f.hint}
            />
          </div>
        ))}
        {SOURCING_METRIC_TEXT_FIELDS.map((f) => (
          <div key={f.key} className={`${groupClassName}${f.key === 'certificationsText' || f.key === 'languages' ? ' full' : ''}`}>
            <label className={labelClassName} htmlFor={`stx-metric-${f.key}`}>{f.label}</label>
            <input
              id={`stx-metric-${f.key}`}
              className={inputClassName}
              type="text"
              value={values[f.key] ?? ''}
              onChange={(e) => set(f.key, e.target.value)}
              disabled={disabled}
              placeholder={f.placeholder || '—'}
              title={f.hint}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
