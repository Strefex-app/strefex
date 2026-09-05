import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useRfqStore from '../store/rfqStore'
import useIatfControlStore from '../store/iatfControlStore'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import { tenantKey } from '../utils/tenantStorage'
import { awardRfqToProject } from '../utils/awardRfqToProject'
import {
  assessBidAgainstAsk,
  comparisonBests,
  labelOf,
  QUALITY_LEVELS,
  FEASIBILITY_LEVELS,
  CAPACITY_STATUSES,
  summarizeRfqAsk,
} from '../utils/standardRfqSchema'
import './RfqComparison.css'

function money(n, currency = 'USD') {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return `${currency} ${Number(n).toLocaleString()}`
}

export default function RfqComparison() {
  const { rfqId } = useParams()
  const navigate = useNavigate()
  const rfq = useRfqStore((s) => s.getRfqById)(rfqId)
  const awards = useIatfControlStore((s) => s.awards) || []
  const [awardNote, setAwardNote] = useState('')
  const role = useAuthStore((s) => s.role)
  const isSuperAdmin = role === 'superadmin'
  const isPreviewSession = (() => {
    try {
      const exp = localStorage.getItem(tenantKey('strefex-preview-expires'))
      return exp && Date.now() < Number(exp)
    } catch {
      return false
    }
  })()
  const canSeeNames = isSuperAdmin && !isPreviewSession

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
  const bests = comparisonBests(responses)
  const ask = summarizeRfqAsk(rfq)
  const req = rfq.requirements || {}
  const award = awards.find((row) => row.rfqId === rfq.id)
  const alreadyAwarded = rfq.status === 'awarded' || Boolean(award)
  const currency = ask.currency || rfq.currency || 'USD'

  const handleAward = (sellerId) => {
    const result = awardRfqToProject({ rfqId: rfq.id, sellerId })
    if (!result.ok) {
      setAwardNote(result.error || 'Could not award this RFQ.')
      return
    }
    setAwardNote(result.already
      ? 'This RFQ is already bound to a project.'
      : (result.poId
        ? 'Awarded. Project, quotation, PO, and contract draft were created.'
        : 'Awarded. A project binder was created for this RFQ.'))
  }

  return (
    <AppLayout>
      <div className="rc-page">
        <div className="rc-header">
          <a href="#" className="rc-back" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            ← Back
          </a>
          <div className="rc-header-main">
            <h1 className="rc-title">Quote comparison</h1>
            <p className="rc-subtitle">
              {rfq.title}
              <span className="rc-rfq-id">{rfq.buyerRefDisplay || rfq.id}</span>
            </p>
            <p className="rc-request-link stx-text-small">
              Request {rfq.buyerRefDisplay || rfq.id}
              {rfq.id && rfq.buyerRefDisplay ? ` · ${rfq.id}` : ''}
              {' · '}
              side-by-side manufacturer quotations for this RFQ
            </p>
          </div>
          <div className="rc-header-meta">
            <span className={`rc-status rc-status--${rfq.status}`}>{rfq.status}</span>
            <span className="rc-deadline">Deadline: {rfq.deadline || rfq.dueDate || '—'}</span>
          </div>
        </div>

        <div className="rc-summary">
          <div className="rc-summary-item">
            <span className="rc-summary-label">Type</span>
            <span className="rc-summary-value">{ask.rfqTypeLabel}</span>
          </div>
          <div className="rc-summary-item">
            <span className="rc-summary-label">Item</span>
            <span className="rc-summary-value">{ask.itemName}</span>
          </div>
          <div className="rc-summary-item">
            <span className="rc-summary-label">Qty / unit</span>
            <span className="rc-summary-value">{ask.quantity} {ask.unit}</span>
          </div>
          <div className="rc-summary-item">
            <span className="rc-summary-label">Target unit</span>
            <span className="rc-summary-value">
              {ask.targetUnitPrice != null ? money(ask.targetUnitPrice, ask.currency) : 'Open'}
            </span>
          </div>
          <div className="rc-summary-item">
            <span className="rc-summary-label">Quality ask</span>
            <span className="rc-summary-value">{ask.qualityLevelLabel}</span>
          </div>
          <div className="rc-summary-item">
            <span className="rc-summary-label">Quotes</span>
            <span className="rc-summary-value">{responses.length} / {(rfq.selectedSellers || rfq.suppliers || []).length}</span>
          </div>
        </div>

        {awardNote ? <p className="rc-award-note" role="status">{awardNote}</p> : null}
        {alreadyAwarded ? (
          <p className="rc-award-note" role="status">
            Awarded
            {award?.sellerId ? ` · seller ${award.sellerId}` : ''}
            {award?.projectId ? (
              <>
                {' · '}
                <button type="button" className="rc-linkish" onClick={() => navigate(`/management/ops/projects/project/${award.projectId}`)}>
                  Open project
                </button>
              </>
            ) : null}
          </p>
        ) : null}

        {!hasResponses ? (
          <div className="rc-empty-responses">
            <div className="rc-empty-icon">📭</div>
            <h3>No quotes yet</h3>
            <p>Quotes appear here as plants submit feasibility, quality level, and cost breakdown.</p>
          </div>
        ) : (
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th className="rc-th-sticky">Criteria</th>
                  {responses.map((r, i) => (
                    <th key={r.sellerId || i} className="rc-th-seller">
                      <div className="rc-seller-name">{canSeeNames ? (r.sellerName || r.sellerId) : `Plant ${i + 1}`}</div>
                      {canSeeNames ? <div className="rc-seller-id">{r.sellerId}</div> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="rc-td-label">Unit price</td>
                  {responses.map((r, i) => (
                    <td key={i} className={`rc-td-val${r.unitPrice === bests.bestUnitPrice ? ' rc-best' : ''}`}>
                      <strong>{money(r.unitPrice, currency)}</strong>
                      {r.unitPrice === bests.bestUnitPrice ? <span className="rc-best-badge">Best</span> : null}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Material</td>
                  {responses.map((r, i) => (
                    <td key={i} className={`rc-td-val${r.materialCost === bests.bestMaterial ? ' rc-best' : ''}`}>
                      {money(r.materialCost, currency)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Operations</td>
                  {responses.map((r, i) => (
                    <td key={i} className={`rc-td-val${r.operationsCost === bests.bestOps ? ' rc-best' : ''}`}>
                      {money(r.operationsCost, currency)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Flexible / other</td>
                  {responses.map((r, i) => (
                    <td key={i} className={`rc-td-val${r.flexibleCost === bests.bestFlex ? ' rc-best' : ''}`}>
                      {money(r.flexibleCost, currency)}
                      {r.costNotes ? <div className="rc-cell-note">{r.costNotes}</div> : null}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Total quoted</td>
                  {responses.map((r, i) => (
                    <td key={i} className={`rc-td-val${r.price === bests.bestTotal ? ' rc-best' : ''}`}>
                      <strong>{money(r.price, currency)}</strong>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Lead time (days)</td>
                  {responses.map((r, i) => (
                    <td key={i} className={`rc-td-val${r.leadTime === bests.bestLead ? ' rc-best' : ''}`}>
                      {r.leadTime ?? '—'}
                      {r.leadTime === bests.bestLead ? <span className="rc-best-badge">Fastest</span> : null}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Feasibility</td>
                  {responses.map((r, i) => (
                    <td key={i} className="rc-td-val">
                      <span className={`rc-pill rc-pill--${r.feasibility || 'unknown'}`}>
                        {labelOf(FEASIBILITY_LEVELS, r.feasibility)}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Quality level</td>
                  {responses.map((r, i) => (
                    <td key={i} className="rc-td-val">
                      {labelOf(QUALITY_LEVELS, r.qualityLevel)}
                      {r.ppapLevelOffered ? <div className="rc-cell-note">PPAP {r.ppapLevelOffered}</div> : null}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Capacity</td>
                  {responses.map((r, i) => (
                    <td key={i} className="rc-td-val">
                      {labelOf(CAPACITY_STATUSES, r.capacityStatus)}
                      {r.monthlyCapacity != null ? (
                        <div className="rc-cell-note">{r.monthlyCapacity}/mo</div>
                      ) : null}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Incoterms</td>
                  {responses.map((r, i) => (
                    <td key={i} className="rc-td-val">{r.incotermsOffer || '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Payment terms</td>
                  {responses.map((r, i) => (
                    <td key={i} className="rc-td-val">{r.paymentTerms || '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Warranty</td>
                  {responses.map((r, i) => (
                    <td key={i} className="rc-td-val">{r.warranty || '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">MOQ</td>
                  {responses.map((r, i) => (
                    <td key={i} className="rc-td-val">{r.moq ?? '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Ask alignment</td>
                  {responses.map((r, i) => {
                    const gaps = assessBidAgainstAsk(r, req)
                    return (
                      <td key={i} className="rc-td-val">
                        {gaps.length === 0 ? (
                          <span className="rc-gap-ok">Aligned</span>
                        ) : (
                          <div className="rc-gap-list">
                            {gaps.map((gap) => (
                              <span key={gap.id} className="rc-gap-chip">{gap.label}</span>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
                <tr>
                  <td className="rc-td-label">Certifications</td>
                  {responses.map((r, i) => (
                    <td key={i} className="rc-td-val">
                      {r.certConfirm ? (
                        <span className="rc-cert-yes">Confirmed</span>
                      ) : (
                        <span className="rc-cert-no">Not confirmed</span>
                      )}
                      {(r.certifications || []).length > 0 ? (
                        <div className="rc-certs">
                          {r.certifications.map((c) => (
                            <span key={c} className="rc-cert-chip">{c}</span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="rc-td-label">Notes</td>
                  {responses.map((r, i) => (
                    <td key={i} className="rc-td-val rc-td-notes">{r.notes || '—'}</td>
                  ))}
                </tr>
                <tr className="rc-action-row">
                  <td className="rc-td-label">Action</td>
                  {responses.map((r, i) => (
                    <td key={i} className="rc-td-val">
                      <button
                        type="button"
                        className="rc-btn rc-btn-award"
                        disabled={alreadyAwarded || r.feasibility === 'not_feasible'}
                        onClick={() => handleAward(r.sellerId)}
                      >
                        {alreadyAwarded ? 'Awarded' : r.feasibility === 'not_feasible' ? 'Not feasible' : 'Award & bind'}
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="rc-legend">
          <span className="rc-legend-item"><span className="rc-best-swatch" /> Best value in row</span>
          <span className="rc-legend-item">Award creates Project · Quotation · PO · Contract draft in Company</span>
        </div>
      </div>
    </AppLayout>
  )
}
