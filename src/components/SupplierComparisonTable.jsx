import SupplierScoreBadge from './SupplierScoreBadge'
import { tenantVisibilityLabel, tenantVisibilityTierFromRow } from '../utils/tenantVisibilityLabel'

export default function SupplierComparisonTable({ rows = [], industryId = 'general' }) {
  if (!rows.length) {
    return <div className="bw-compare-empty">Select suppliers to compare.</div>
  }

  return (
    <div className="stx-fluid-table-wrap bw-compare-table-wrap">
      <table className="stx-fluid-table bw-compare-table">
        <thead>
          <tr>
            <th>Supplier</th>
            <th title="Linked seller account on the platform">Platform</th>
            <th>Evidence</th>
            <th>Standards</th>
            <th>Trace</th>
            <th>PPAP</th>
            <th>Source</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const visTier = tenantVisibilityTierFromRow(r)
            const visLabel = tenantVisibilityLabel(visTier)
            const evidence = r.evidenceScore ?? r.reliabilityScore ?? 0
            return (
              <tr key={r.id || r.supplier_id}>
                <td className="stx-text-wrap">{r.display_name || r.name || 'Supplier'}</td>
                <td className="bw-compare-meta">{visLabel || '—'}</td>
                <td>
                  {evidence > 0 ? (
                    <span className={`bw-rel-score${evidence >= 60 ? ' bw-rel-score--high' : ' bw-rel-score--mid'}`}>
                      {evidence}
                    </span>
                  ) : '—'}
                </td>
                <td className="stx-text-wrap">{r.certificationsText || '—'}</td>
                <td>{r.traceText || '—'}</td>
                <td>{r.ppapText || '—'}</td>
                <td>{r.evidenceSource || '—'}</td>
                <td>
                  <SupplierScoreBadge score={r.overall_score || 0} risk={r.risk_score || 0} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
