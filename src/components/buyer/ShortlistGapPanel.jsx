import { analyzeShortlistGap } from '../../utils/shortlistGapAnalysis'

export default function ShortlistGapPanel({
  suppliers = [],
  industryId = 'general',
  onRequestEvidence,
  requestLabel = 'Request evidence',
}) {
  const gap = analyzeShortlistGap(suppliers, industryId)
  if (!gap.total) return null

  return (
    <div className={`bw-gap-panel${gap.isReadyForRfq ? ' bw-gap-panel--ready' : ''}`} role="status">
      <div className="bw-gap-panel__head">
        <span className="bw-gap-panel__title">
          {gap.withPrimary} of {gap.total} shortlisted with {gap.primaryStandardLabel} on file
        </span>
        <span className="bw-gap-panel__pct">{gap.readyPercent}% evidence-ready</span>
      </div>
      {!gap.isReadyForRfq && gap.gapSuppliers.length > 0 && (
        <ul className="bw-gap-panel__list">
          {gap.gapSuppliers.slice(0, 5).map((row) => (
            <li key={row.id} className="bw-gap-panel__item">
              <span className="stx-text-wrap">{row.name}</span>
              {onRequestEvidence && (
                <button
                  type="button"
                  className="app-page-btn-outline bw-gap-panel__btn"
                  onClick={() => onRequestEvidence(row.id)}
                >
                  {requestLabel}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {gap.isReadyForRfq && (
        <p className="stx-text-caption bw-gap-panel__ready">
          Shortlist meets your industry primary standard — ready to send RFQ.
        </p>
      )}
    </div>
  )
}
