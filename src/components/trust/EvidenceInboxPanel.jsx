import { Link } from 'react-router-dom'
import useEvidenceRequestStore from '../../store/evidenceRequestStore'
import { IATF_CONTROL_PATH } from '../../data/iatfControlCatalog'

export default function EvidenceInboxPanel({ supplierId = '', compact = false }) {
  const requests = useEvidenceRequestStore((s) => s.listOpenForSupplier(supplierId))
  const markFulfilled = useEvidenceRequestStore((s) => s.markFulfilled)

  if (!requests.length) {
    if (compact) return null
    return (
      <div className="trust-inbox trust-inbox--empty">
        <p className="stx-text-caption">No open evidence requests from buyers.</p>
      </div>
    )
  }

  return (
    <div className="trust-inbox">
      <div className="trust-inbox__head">
        <h3 className="stx-text-heading">Buyer evidence requests</h3>
        <span className="trust-inbox__count">{requests.length} open</span>
      </div>
      <ul className="trust-inbox__list">
        {requests.map((row) => (
          <li key={row.id} className="trust-inbox__item">
            <div className="trust-inbox__meta min-width-0">
              <strong className="stx-text-wrap">{row.standardLabel}</strong>
              <span className="stx-text-caption stx-text-wrap">
                {row.buyerCompany || row.buyerEmail || 'Buyer'}
                {row.dueDate ? ` · due ${row.dueDate}` : ''}
              </span>
              {row.note && <span className="stx-text-caption stx-text-wrap">{row.note}</span>}
            </div>
            <div className="trust-inbox__actions">
              <Link className="qe-btn" to={`${IATF_CONTROL_PATH}?tab=run&run=certificates`}>
                Upload cert
              </Link>
              <button
                type="button"
                className="app-page-btn-outline"
                onClick={() => markFulfilled(row.id)}
              >
                Mark fulfilled
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
