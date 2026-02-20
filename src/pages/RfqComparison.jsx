import { useParams, useNavigate } from 'react-router-dom'
import useRfqStore from '../store/rfqStore'
import AppLayout from '../components/AppLayout'
import './RfqComparison.css'

/* ── Star rating renderer ─────────────────────────────────── */
function Stars({ value }) {
  const full = Math.floor(value || 0)
  const half = (value || 0) - full >= 0.25
  return (
    <span className="rc-stars" title={`${value ?? '–'} / 5`}>
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < full ? '#f5a623' : i === full && half ? 'url(#halfGrad)' : 'none'} stroke="#f5a623" strokeWidth="2">
          <defs><linearGradient id="halfGrad"><stop offset="50%" stopColor="#f5a623"/><stop offset="50%" stopColor="transparent"/></linearGradient></defs>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
      <span className="rc-star-val">{value?.toFixed(1) ?? '–'}</span>
    </span>
  )
}

export default function RfqComparison() {
  const { rfqId } = useParams()
  const navigate = useNavigate()
  const rfq = useRfqStore((s) => s.getRfqById)(rfqId)

  if (!rfq) {
    return (
      <AppLayout>
        <div className="rc-page">
          <div className="rc-empty">
            <h2>RFQ Not Found</h2>
            <p>The requested RFQ could not be found.</p>
            <button type="button" className="rc-btn rc-btn-primary" onClick={() => navigate(-1)}>
              ← Back
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const responses = rfq.sellerResponses || []
  const hasResponses = responses.length > 0

  // Find best values for highlighting
  const bestPrice = hasResponses ? Math.min(...responses.map(r => r.price || Infinity)) : null
  const bestLead = hasResponses ? Math.min(...responses.map(r => r.leadTime || Infinity)) : null
  const bestRating = hasResponses ? Math.max(...responses.map(r => r.rating || 0)) : null

  return (
    <AppLayout>
      <div className="rc-page">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="rc-header">
          <a href="#" className="rc-back" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            ← Back
          </a>
          <div>
            <h1 className="rc-title">RFQ Comparison</h1>
            <p className="rc-subtitle">{rfq.title}</p>
          </div>
        </div>

        {/* ── RFQ Summary ─────────────────────────────────── */}
        <div className="rc-summary-card">
          <div className="rc-summary-grid">
            <div><strong>Industry:</strong> {rfq.industryId}</div>
            <div><strong>Category:</strong> {rfq.categoryId}</div>
            <div><strong>Sent:</strong> {rfq.sentAt || '–'}</div>
            <div><strong>Due:</strong> {rfq.dueDate}</div>
            {rfq.requirements?.quantity && <div><strong>Quantity:</strong> {rfq.requirements.quantity}</div>}
            {rfq.requirements?.maxLeadTime && <div><strong>Max Lead Time:</strong> {rfq.requirements.maxLeadTime} days</div>}
            {rfq.requirements?.maxPrice && <div><strong>Max Budget:</strong> ${rfq.requirements.maxPrice}k</div>}
            <div><strong>Suppliers Invited:</strong> {rfq.suppliers?.length || 0}</div>
            <div><strong>Responses:</strong> {responses.length}</div>
          </div>
        </div>

        {/* ── Comparison Table ─────────────────────────────── */}
        {!hasResponses ? (
          <div className="rc-no-responses">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#ccc" strokeWidth="2"/>
            </svg>
            <h3>No Responses Yet</h3>
            <p>Sellers have not responded to this RFQ yet. Check back later.</p>
          </div>
        ) : (
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th className="rc-th-sticky">Criteria</th>
                  {responses.map((r) => (
                    <th key={r.sellerId}>
                      <div className="rc-seller-header">
                        <span className="rc-seller-name">{r.sellerName}</span>
                        <span className="rc-seller-email">{r.sellerEmail}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Price */}
                <tr>
                  <td className="rc-th-sticky rc-criteria">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Price
                  </td>
                  {responses.map((r) => (
                    <td key={r.sellerId} className={r.price === bestPrice ? 'rc-best' : ''}>
                      <span className="rc-cell-value">${r.price?.toLocaleString()}</span>
                      {r.price === bestPrice && <span className="rc-best-badge">Best</span>}
                    </td>
                  ))}
                </tr>

                {/* Lead Time */}
                <tr>
                  <td className="rc-th-sticky rc-criteria">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Lead Time
                  </td>
                  {responses.map((r) => (
                    <td key={r.sellerId} className={r.leadTime === bestLead ? 'rc-best' : ''}>
                      <span className="rc-cell-value">{r.leadTime} days</span>
                      {r.leadTime === bestLead && <span className="rc-best-badge">Fastest</span>}
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr>
                  <td className="rc-th-sticky rc-criteria">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="2"/></svg>
                    Rating
                  </td>
                  {responses.map((r) => (
                    <td key={r.sellerId} className={r.rating === bestRating ? 'rc-best' : ''}>
                      <Stars value={r.rating} />
                      {r.rating === bestRating && <span className="rc-best-badge">Top</span>}
                    </td>
                  ))}
                </tr>

                {/* Certifications */}
                <tr>
                  <td className="rc-th-sticky rc-criteria">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2"/></svg>
                    Certifications
                  </td>
                  {responses.map((r) => (
                    <td key={r.sellerId}>
                      <div className="rc-cert-list">
                        {(r.certifications || []).map((c, i) => (
                          <span key={i} className="rc-cert-badge">{c}</span>
                        ))}
                        {(!r.certifications || r.certifications.length === 0) && <span className="rc-na">–</span>}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Capacity */}
                <tr>
                  <td className="rc-th-sticky rc-criteria">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2" stroke="currentColor" strokeWidth="2"/></svg>
                    Capacity
                  </td>
                  {responses.map((r) => (
                    <td key={r.sellerId}>
                      <span className={`rc-capacity ${r.capacity === 'Available' ? 'available' : 'limited'}`}>
                        {r.capacity || '–'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Warranty */}
                <tr>
                  <td className="rc-th-sticky rc-criteria">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Warranty
                  </td>
                  {responses.map((r) => (
                    <td key={r.sellerId}>{r.warranty || '–'}</td>
                  ))}
                </tr>

                {/* Responded At */}
                <tr>
                  <td className="rc-th-sticky rc-criteria">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Response Date
                  </td>
                  {responses.map((r) => (
                    <td key={r.sellerId}>{r.respondedAt || '–'}</td>
                  ))}
                </tr>

                {/* Notes */}
                <tr>
                  <td className="rc-th-sticky rc-criteria">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2"/></svg>
                    Notes
                  </td>
                  {responses.map((r) => (
                    <td key={r.sellerId} className="rc-notes-cell">{r.notes || '–'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
