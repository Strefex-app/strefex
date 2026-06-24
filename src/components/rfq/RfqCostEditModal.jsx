import { useEffect, useState } from 'react'

function Field({ label, children }) {
  return (
    <div>
      <div className="rfqi-label">{label}</div>
      {children}
    </div>
  )
}

export default function RfqCostEditModal({ open, title, fields, initial, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(initial || {})

  useEffect(() => {
    if (open) setForm(initial || {})
  }, [open, initial])

  if (!open) return null

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave?.(form)
  }

  return (
    <div className="rfqi-modal-overlay" onClick={onClose}>
      <div className="rfqi-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="rfqi-modal-header">
          <h3 className="app-page-title" style={{ margin: 0, fontSize: 'var(--text-heading, 16px)' }}>
            {title}
          </h3>
          <button type="button" className="rfqi-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="rfqi-modal-form">
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === 'select' ? (
                <select className="rfqi-inp" value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                  {(f.options || []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="rfqi-inp"
                  type={f.type || 'text'}
                  step={f.step}
                  value={form[f.key] ?? ''}
                  onChange={(e) =>
                    set(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)
                  }
                  required={f.required}
                />
              )}
            </Field>
          ))}
          <div className="rfqi-modal-actions">
            {onDelete && initial?.id && (
              <button type="button" className="app-page-action rfqi-modal-delete" onClick={() => onDelete(form.id)}>
                Delete
              </button>
            )}
            <button type="button" className="app-page-action" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="app-page-btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export const MATERIAL_FIELDS = [
  { key: 'id', label: 'ID', required: true },
  { key: 'cat', label: 'Category', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'grade', label: 'Grade' },
  { key: 'density', label: 'Density (g/cm³)', type: 'number', step: 0.01 },
  { key: 'price', label: 'Price €/kg', type: 'number', step: 0.01, required: true },
  { key: 'scrapPct', label: 'Scrap %', type: 'number', step: 1 },
]

export const MACHINE_FIELDS = [
  { key: 'id', label: 'ID', required: true },
  { key: 'processId', label: 'Process ID', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'tonnage', label: 'Tonnage', type: 'number' },
  { key: 'machineRateEUR', label: 'Machine rate €/h', type: 'number', step: 0.01, required: true },
  { key: 'energyKwh', label: 'Energy kWh/h', type: 'number', step: 0.1 },
  { key: 'setupTimeH', label: 'Setup time (h)', type: 'number', step: 0.1 },
  { key: 'cycleTimeFactor', label: 'Cycle factor', type: 'number', step: 0.01 },
  { key: 'defaultEnergyTariffId', label: 'Default energy tariff ID' },
  { key: 'defaultPersonnelRegionId', label: 'Default personnel region ID' },
]

export const PERIPHERAL_FIELDS = [
  { key: 'id', label: 'ID', required: true },
  { key: 'processId', label: 'Process ID', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'rateEUR', label: 'Rate €/h', type: 'number', step: 0.01, required: true },
  { key: 'notes', label: 'Notes' },
]

export const ENERGY_TARIFF_FIELDS = [
  { key: 'id', label: 'ID', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'region', label: 'Region' },
  { key: 'energyEURkWh', label: 'Energy €/kWh', type: 'number', step: 0.001, required: true },
]

export const PERSONNEL_REGION_FIELDS = [
  { key: 'id', label: 'ID', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'region', label: 'Region' },
  { key: 'overheadPct', label: 'Overhead %', type: 'number', step: 1, required: true },
]

export const PERSONNEL_ROLE_FIELDS = [
  { key: 'id', label: 'ID', required: true },
  { key: 'regionId', label: 'Region ID', required: true },
  { key: 'roleKey', label: 'Role key', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'rateEURh', label: 'Rate €/h', type: 'number', step: 0.01, required: true },
  { key: 'cycleShare', label: 'Cycle share (0–1)', type: 'number', step: 0.01 },
  { key: 'setupHours', label: 'Setup hours / job', type: 'number', step: 0.1 },
]
