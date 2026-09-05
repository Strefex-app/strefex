import { Link } from 'react-router-dom'
import { IATF_CONTROL_PATH } from '../../data/iatfControlCatalog'
import { analyzeRfqEvidenceGaps } from '../../utils/rfqEvidenceGaps'

export default function RfqEvidenceGapPanel({
  rfq,
  certificates = [],
  parts = [],
  lots = [],
  publishedCard = null,
}) {
  if (!rfq) return null
  const analysis = analyzeRfqEvidenceGaps({
    rfq,
    certificates,
    parts,
    lots,
    publishedCard,
  })
  if (!analysis.checks.length) return null

  return (
    <div className={`sd-evidence-gap${analysis.isReady ? ' sd-evidence-gap--ready' : ''}`}>
      <div className="sd-evidence-gap__head">
        <strong>
          Plant evidence vs this RFQ · {analysis.onFileCount}/{analysis.checks.length} on file
        </strong>
        <span>{analysis.readyPercent}% ready</span>
      </div>
      <ul className="sd-evidence-gap__list">
        {analysis.checks.map((check) => (
          <li key={check.id} className={`sd-evidence-gap__item sd-evidence-gap__item--${check.status}`}>
            <span className="sd-evidence-gap__status">
              {check.status === 'on_file' ? '✓' : check.status === 'partial' ? '~' : check.status === 'manual' ? '•' : '!'}
            </span>
            <span className="min-width-0">
              <span className="sd-evidence-gap__label">{check.label}</span>
              <span className="sd-evidence-gap__hint stx-text-wrap">{check.hint}</span>
            </span>
          </li>
        ))}
      </ul>
      {analysis.gapCount > 0 && (
        <Link className="sd-link-btn" to={`${IATF_CONTROL_PATH}?tab=run&run=certificates`}>
          Fix gaps in Plant QMS →
        </Link>
      )}
    </div>
  )
}
