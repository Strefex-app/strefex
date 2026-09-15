import {
  SOURCING_METRIC_QUESTIONNAIRE_NUMBER_FIELDS,
  SOURCING_METRIC_QUESTIONNAIRE_TEXT_FIELDS,
} from '../utils/sourcingMetrics'

/**
 * Purchasing-facing supplier facts for Profile + superadmin.
 * Platform scores (fit, risk, price index) stay in storage and Compare, not this form.
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
  title = 'Sourcing facts',
  hint = 'What purchasing needs to shortlist a supplier. Leave blank if unknown — Compare shows “—”.',
}) {
  const set = (key, value) => {
    if (typeof onChange === 'function') onChange({ ...(values || {}), [key]: value })
  }

  return (
    <div className={className}>
      {title ? <h3 className="prof-modal-title stx-text-section" style={{ margin: '12px 0 4px' }}>{title}</h3> : null}
      {hint ? <p className="prof-profile-attachments-hint" style={{ marginBottom: 12 }}>{hint}</p> : null}
      <div className={gridClassName}>
        {SOURCING_METRIC_QUESTIONNAIRE_NUMBER_FIELDS.map((f) => (
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
        {SOURCING_METRIC_QUESTIONNAIRE_TEXT_FIELDS.map((f) => (
          <div key={f.key} className={`${groupClassName} full`}>
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
