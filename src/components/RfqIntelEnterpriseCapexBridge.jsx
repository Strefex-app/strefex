import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useEnterpriseStore from '../store/enterpriseStore'
import { useRfqIntelligenceStore } from '../store/rfqIntelligenceStore'
import { rfqIntelligenceUrl } from '../constants/rfqPaths'

/** Surfaces RFQ Intelligence calculator tooling + aggregates rough monthly variable load on CAPEX. */
export default function RfqIntelEnterpriseCapexBridge({ accentColor = '#34495e' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const addCapex = useEnterpriseStore((s) => s.addCapex)
  const variableCosts = useEnterpriseStore((s) => s.variableCosts || [])
  const directCosts = useEnterpriseStore((s) => s.directCosts || [])
  const lastCalculator = useRfqIntelligenceStore((s) => s.lastCalculatorSnapshot)
  const lastToolingEUR = useRfqIntelligenceStore((s) => s.lastToolingEUR)

  useEffect(() => {
    if (searchParams.get('fromRfqCalc') !== '1') return
    const raw = searchParams.get('tooling')
    const amt = raw != null && raw !== '' ? Number(raw) : NaN
    if (!Number.isFinite(amt) || amt <= 0) {
      const next = new URLSearchParams(searchParams)
      next.delete('fromRfqCalc')
      next.delete('tooling')
      setSearchParams(next, { replace: true })
      return
    }

    addCapex({
      name: `RFQ Intelligence — tooling budget`,
      category: 'Equipment',
      amount: amt,
      usefulLife: 5,
      yearAcquired: new Date().getFullYear(),
      description:
        `Imported from RFQ Intelligence calculator. Unit economics snapshot: €${lastCalculator?.unitPrice?.toFixed?.(4) ?? '—'} / unit @ margin.`,
    })
    const next = new URLSearchParams(searchParams)
    next.delete('fromRfqCalc')
    next.delete('tooling')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, addCapex, lastCalculator])

  const vcSum = useMemo(
    () => variableCosts.reduce((s, row) => s + Number(row.unitCost || 0), 0),
    [variableCosts],
  )

  const directMaterialAvg = useMemo(
    () =>
      directCosts.length
        ? directCosts.reduce((s, row) => s + Number(row.costPerUnit || 0), 0) / directCosts.length
        : 0,
    [directCosts],
  )

  const applyStoredTooling = () => {
    if (!(lastToolingEUR > 0)) return
    addCapex({
      name: 'RFQ Intelligence — last quote tooling package',
      category: 'Equipment',
      amount: lastToolingEUR,
      usefulLife: 7,
      yearAcquired: new Date().getFullYear(),
      description: 'Captured from RFQ Intelligence wizard tooling estimate.',
    })
  }

  return (
    <div className="cost-page-card cost-page-rfq-integration">
      <div className="cost-page-rfq-integration-head" style={{ borderLeftColor: accentColor }}>
        <h3 className="cost-page-rfq-integration-title">RFQ Intelligence ↔ cost connection</h3>
        <p className="cost-page-rfq-integration-sub">
          Link calculator / quote tooling into CAPEX alongside enterprise variable direct signals.
        </p>
      </div>
      <div className="cost-page-rfq-integration-grid">
        <div className="cost-page-rfq-stat">
          <div className="cost-page-rfq-stat-label">Last calculator unit price</div>
          <div className="cost-page-rfq-stat-value">
            €{lastCalculator?.unitPrice != null ? lastCalculator.unitPrice.toFixed(4) : '—'} / unit
            {lastCalculator?.process ? ` · ${lastCalculator.process} · ${lastCalculator.material}` : ''}
          </div>
        </div>
        <div className="cost-page-rfq-stat">
          <div className="cost-page-rfq-stat-label">Rolling variable cost index (stored enterprise model)</div>
          <div className="cost-page-rfq-stat-value">
            Σ variable unit €{vcSum.toFixed(2)}
            {directMaterialAvg > 0 ? ` · Avg recorded direct materials €${directMaterialAvg.toFixed(2)}` : ''}
          </div>
        </div>
      </div>
      <div className="cost-page-rfq-actions">
        <button
          type="button"
          className="cost-page-add-btn"
          style={{ background: accentColor }}
          disabled={!(lastToolingEUR > 0)}
          onClick={applyStoredTooling}
        >
          Apply last quote tooling €{Math.round(lastToolingEUR)} to CAPEX
        </button>
        <button
          type="button"
          className="cost-page-rfq-btn-secondary"
          onClick={() => navigate(rfqIntelligenceUrl('tab=calculator'))}
        >
          Open RFQ calculator
        </button>
      </div>
    </div>
  )
}
