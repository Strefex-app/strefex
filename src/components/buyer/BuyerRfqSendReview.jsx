import '../../pages/ExecutiveSummary.css'

export default function BuyerRfqSendReview({
  draft,
  categoryLabel = '',
  supplierRows = [],
  onBack,
  onSend,
  sending = false,
}) {
  if (!draft) {
    return (
      <div className="bw-rfq-empty">
        <p>Create an RFQ first, then review and send it to selected suppliers.</p>
        <button type="button" className="app-page-btn-primary" onClick={onBack}>
          Create RFQ
        </button>
      </div>
    )
  }

  const selected = supplierRows.filter((row) => draft.supplierIds.includes(row.id))

  return (
    <div className="bw-rfq-send-review">
      <div className="exec-form-group">
        <label>RFQ title</label>
        <p className="bw-rfq-send-review__value stx-text-wrap">{draft.title}</p>
      </div>
      {categoryLabel && (
        <div className="exec-form-group">
          <label>Category</label>
          <p className="bw-rfq-send-review__value">{categoryLabel}</p>
        </div>
      )}
      {draft.description && (
        <div className="exec-form-group">
          <label>Description</label>
          <p className="bw-rfq-send-review__value stx-text-wrap">{draft.description}</p>
        </div>
      )}
      {draft.deadline && (
        <div className="exec-form-group">
          <label>Response deadline</label>
          <p className="bw-rfq-send-review__value">{draft.deadline}</p>
        </div>
      )}
      <div className="exec-form-group">
        <label>Requirements</label>
        <p className="bw-rfq-send-review__value">
          Qty {draft.requirements?.quantity ?? 1}
          {' · '}
          Max lead {draft.requirements?.maxLeadTime ?? '—'}d
          {' · '}
          Max price index {draft.requirements?.maxPrice ?? '—'}
          {' · '}
          Min rating {draft.requirements?.minRating ?? '—'}
          {draft.requirements?.maxRisk != null ? ` · Max risk ${draft.requirements.maxRisk}%` : ''}
        </p>
      </div>
      <div className="exec-form-group">
        <label>Suppliers to invite ({selected.length})</label>
        <div className="exec-matched-suppliers">
          {selected.map((row) => (
            <div key={row.id} className="exec-matched-item">
              <span className="matched-name stx-text-wrap">{row.name}</span>
              {row.matchScore != null && (
                <span className="matched-score">{row.matchScore}%</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="bw-rfq-send-review__actions">
        <button type="button" className="app-page-btn-outline" onClick={onBack} disabled={sending}>
          ← Edit RFQ
        </button>
        <button type="button" className="app-page-btn-primary" onClick={onSend} disabled={sending || selected.length === 0}>
          {sending ? 'Sending…' : `Send RFQ (${selected.length})`}
        </button>
      </div>
    </div>
  )
}
