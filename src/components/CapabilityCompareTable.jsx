import SupplierScoreBadge from './SupplierScoreBadge'
import { tenantVisibilityLabel, tenantVisibilityTierFromRow } from '../utils/tenantVisibilityLabel'

/**
 * Pre-RFQ capability compare — shared columns for Discover / Buyer Workspace / Executive Summary.
 */
export default function CapabilityCompareTable({
  rows = [],
  industryId: _industryId = 'general',
  canSeeDetails = true,
  maskName,
}) {
  if (!rows.length) {
    return <div className="bw-compare-empty">Select suppliers to compare.</div>
  }

  const displayName = (row, index) => {
    if (canSeeDetails) return row.name
    return maskName ? maskName(row, index) : `Supplier #${String(index + 1).padStart(2, '0')}`
  }

  return (
    <div className="stx-fluid-table-wrap bw-compare-table-wrap">
      <table className="stx-fluid-table bw-compare-table cap-compare-table">
        <thead>
          <tr>
            <th>Supplier</th>
            <th>Location</th>
            <th>Capacity</th>
            <th>Lead</th>
            <th>Delivery</th>
            <th>Price index</th>
            <th>Standards</th>
            <th>Evidence</th>
            <th>PPAP</th>
            <th>Trace</th>
            <th>Platform</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const visTier = tenantVisibilityTierFromRow(row)
            const visLabel = tenantVisibilityLabel(visTier)
            const evidence = row.evidenceScore ?? 0
            return (
              <tr key={row.id || index}>
                <td className="stx-text-wrap">{displayName(row, index)}</td>
                <td className="stx-text-wrap">{row.location || '—'}</td>
                <td>
                  {row.capacityPct != null ? `${row.capacityPct}%` : '—'}
                </td>
                <td>{row.leadTimeDays != null ? `${row.leadTimeDays}d` : '—'}</td>
                <td>{row.deliveryDays != null ? `${row.deliveryDays}d` : '—'}</td>
                <td>
                  {row.priceIndex != null ? (
                    <span
                      className="cap-compare-price-index"
                      data-tier={
                        row.priceIndex <= 100 ? 'good' : row.priceIndex <= 110 ? 'mid' : 'high'
                      }
                    >
                      {row.priceIndex}
                    </span>
                  ) : '—'}
                </td>
                <td className="stx-text-wrap">{canSeeDetails ? row.certificationsText : '—'}</td>
                <td>
                  {evidence > 0 ? (
                    <span className={`bw-rel-score${evidence >= 60 ? ' bw-rel-score--high' : ' bw-rel-score--mid'}`}>
                      {evidence}
                    </span>
                  ) : '—'}
                </td>
                <td>{row.ppapText || '—'}</td>
                <td>{row.traceText || '—'}</td>
                <td className="bw-compare-meta">{visLabel || row.evidenceSource || '—'}</td>
                <td>
                  <SupplierScoreBadge score={row.score || 0} risk={row.risk || 0} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
