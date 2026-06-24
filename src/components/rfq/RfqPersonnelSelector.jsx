import { resolvePersonnelRates } from '../../utils/rfqEquipmentCost'

export default function RfqPersonnelSelector({
  personnelRegionId,
  personnelRoleIds = [],
  personnelRegions = [],
  personnelRoles = [],
  onRegionChange,
  onRoleToggle,
}) {
  const region = personnelRegions.find((r) => r.id === personnelRegionId) || null
  const regionRoles = personnelRoles.filter((r) => r.regionId === personnelRegionId)
  const selectedRoles = regionRoles.filter((r) => personnelRoleIds.includes(r.id))
  const rates = resolvePersonnelRates({ region, roles: selectedRoles })

  return (
    <div className="rfqi-equipment">
      <div className="rfqi-form-grid" style={{ marginBottom: 12 }}>
        <div>
          <div className="rfqi-label">Personnel region</div>
          <select
            className="rfqi-inp"
            value={personnelRegionId || ''}
            onChange={(e) => onRegionChange?.(e.target.value)}
          >
            {personnelRegions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · overhead {r.overheadPct}%
              </option>
            ))}
          </select>
        </div>
      </div>

      {regionRoles.length > 0 && (
        <>
          <div className="rfqi-label" style={{ marginBottom: 8 }}>
            Roles included in quote
          </div>
          <div className="rfqi-peri-grid">
            {regionRoles.map((r) => {
              const on = personnelRoleIds.includes(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`rfqi-peri-card ${on ? 'rfqi-peri-card--on' : ''}`}
                  onClick={() => onRoleToggle?.(r.id)}
                >
                  <strong>{r.name}</strong>
                  <span className="rfqi-muted">€{r.rateEURh}/h</span>
                  <span className="rfqi-muted stx-text-caption">
                    {r.cycleShare > 0 ? `cycle ${Math.round(r.cycleShare * 100)}%` : ''}
                    {r.setupHours > 0 ? ` · setup ${r.setupHours}h` : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="rfqi-rate-breakdown">
        <div className="rfqi-summary-row">
          <span className="rfqi-muted">Cycle labour rate</span>
          <span>€{rates.cycleLabourRateEUR.toFixed(2)}/h</span>
        </div>
        <div className="rfqi-summary-row">
          <span className="rfqi-muted">Setup labour (job)</span>
          <span>€{rates.setupLabourEUR.toFixed(2)}</span>
        </div>
        <div className="rfqi-summary-row">
          <span className="rfqi-muted">Overhead</span>
          <span>{rates.overheadPct}% on direct labour</span>
        </div>
      </div>
    </div>
  )
}

export function RfqThreeBucketSummary({ buckets, unitPrice }) {
  if (!buckets) return null
  const total = buckets.material + buckets.process + buckets.personnel
  const rows = [
    { label: 'Material cost', value: buckets.material, color: '#4fc3f7' },
    { label: 'Process cost', value: buckets.process, color: '#00d4ff' },
    { label: 'Personnel cost', value: buckets.personnel, color: '#b060ff' },
  ]
  return (
    <div className="rfqi-bucket-summary">
      {rows.map(({ label, value, color }) => {
        const pct = Math.round((value / Math.max(total, 1e-9)) * 100)
        return (
          <div key={label} className="rfqi-cost-bar">
            <span style={{ width: 100, flexShrink: 0 }}>{label}</span>
            <div className="rfqi-cost-bar-track">
              <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color }} />
            </div>
            <span style={{ width: 72, textAlign: 'right' }}>€{value.toFixed(4)}</span>
          </div>
        )
      })}
      {unitPrice != null && (
        <div className="rfqi-summary-row" style={{ marginTop: 10, fontWeight: 600 }}>
          <span>Unit price</span>
          <span className="rfqi-price-cell">€{unitPrice.toFixed(4)}</span>
        </div>
      )}
    </div>
  )
}
