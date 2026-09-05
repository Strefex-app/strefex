import { Link } from 'react-router-dom'
import { analyzeRfqEvidenceGaps } from '../../utils/rfqEvidenceGaps'
import useIatfControlStore from '../../store/iatfControlStore'
import { IATF_CONTROL_PATH } from '../../data/iatfControlCatalog'

export default function RfqEvidenceHints({ rfq }) {
  const certificates = useIatfControlStore((s) => s.certificates)
  const parts = useIatfControlStore((s) => s.parts)
  const lots = useIatfControlStore((s) => s.lots)
  const publishedCard = useIatfControlStore((s) => s.publishedCard)

  const analysis = analyzeRfqEvidenceGaps({
    rfq,
    certificates,
    parts,
    lots,
    publishedCard,
  })

  if (!analysis.checks.length) return null

  return (
    <div className={`rfq-evidence-hints${analysis.isReady ? ' rfq-evidence-hints--ready' : ''}`}>
      <div className="rfq-evidence-hints__head">
        <strong>Plant evidence vs RFQ asks</strong>
        <span className="rfq-evidence-hints__pct">{analysis.readyPercent}% on file</span>
      </div>
      <ul className="rfq-evidence-hints__list">
        {analysis.checks.map((check) => (
          <li key={check.id} className={`rfq-evidence-hints__item rfq-evidence-hints__item--${check.status}`}>
            <span className="rfq-evidence-hints__label">{check.label}</span>
            <span className="rfq-evidence-hints__status">
              {check.status === 'on_file' ? 'On file' : check.status === 'partial' ? 'Partial' : check.status === 'manual' ? 'Confirm' : 'Gap'}
            </span>
            {check.hint && <span className="stx-text-caption stx-text-wrap">{check.hint}</span>}
          </li>
        ))}
      </ul>
      {analysis.gapCount > 0 && (
        <div className="rfq-evidence-hints__actions">
          <Link className="qe-btn" to={`${IATF_CONTROL_PATH}?tab=run&run=certificates`}>
            Certificate vault
          </Link>
          <Link className="qe-btn" to={`${IATF_CONTROL_PATH}?tab=masters`}>
            Part masters
          </Link>
        </div>
      )}
    </div>
  )
}
