import SupplierScoreBadge from './SupplierScoreBadge'
import { tenantVisibilityLabel, tenantVisibilityTierFromRow } from '../utils/tenantVisibilityLabel'
import { reliabilityBadgesForCard, matchesIndustryPrimaryStandard } from '../utils/buyerSourcingReliability'

export default function SupplierCard({
  supplier,
  industryId = 'general',
  onSelect,
  onShortlist,
  onRequestEvidence,
  evidenceRequestPending = false,
  compareLabel = 'Compare',
  shortlistLabel = 'Shortlist',
  requestEvidenceLabel = 'Request evidence',
  hideShortlist = false,
  masked = false,
  displayNameOverride,
  disableShortlist = false,
  maskedHint = 'Details available on Standard plan and above',
}) {
  if (!supplier) return null
  const completeness = Number(supplier.profile_completeness || 0)
  const boosted = !masked && completeness >= 80
  const visTier = tenantVisibilityTierFromRow(supplier)
  const visLabel = tenantVisibilityLabel(visTier)
  const displayName = displayNameOverride
    || supplier.display_name
    || supplier.displayName
    || supplier.legal_name
    || 'Supplier'
  const badges = supplier.reliabilityBadges?.length
    ? supplier.reliabilityBadges
    : reliabilityBadgesForCard(supplier.reliabilityCard, industryId)
  const hasPrimary = matchesIndustryPrimaryStandard(supplier.reliabilityCard, industryId)
  const showEvidenceRequest = !masked && onRequestEvidence && !hasPrimary

  return (
    <div
      className={`bw-supplier-card${masked ? ' bw-supplier-card--masked' : ''}${boosted ? ' bw-supplier-card--boosted' : ''}`}
    >
      <div className="bw-supplier-card__head">
        <div className="bw-supplier-card__text min-width-0">
          <div className="bw-supplier-card__name stx-text-wrap">{displayName}</div>
          {!masked && (
            <>
              <div className="bw-supplier-card__meta stx-text-wrap">
                {supplier.country || 'Unknown country'} · {supplier.industry || 'General'}
              </div>
              <div className="bw-supplier-card__completeness">
                Profile completeness: {completeness}%
              </div>
              {visLabel && (
                <div className={`bw-supplier-card__vis bw-supplier-card__vis--${visTier || 'default'}`}>
                  {visLabel}
                </div>
              )}
            </>
          )}
          {masked && (
            <div className="bw-supplier-card__meta bw-supplier-card__meta--anon stx-text-wrap">
              {maskedHint}
            </div>
          )}
        </div>
        {!masked && (
          <SupplierScoreBadge
            score={supplier.overall_score || supplier.overallScore || 0}
            risk={supplier.risk_score || supplier.riskScore || 0}
          />
        )}
      </div>
      {!masked && supplier.description && (
        <div className="bw-supplier-card__desc stx-text-wrap">{supplier.description}</div>
      )}
      {!masked && supplier.reliabilityScore > 0 && (
        <div className="bw-rel-score-row">
          <span
            className={`bw-rel-score${
              supplier.reliabilityScore >= 60 ? ' bw-rel-score--high' : ' bw-rel-score--mid'
            }`}
          >
            Reliability {supplier.reliabilityScore}
          </span>
          {supplier.reliabilityPublished && (
            <span className="bw-rel-source">Published</span>
          )}
          {!supplier.reliabilityPublished && supplier.reliabilityCard?.source === 'directory' && (
            <span className="bw-rel-source">Directory</span>
          )}
        </div>
      )}
      {!masked && (badges.length > 0 || supplier.reliabilityCard) && (
        <div className="bw-rel-chips">
          {badges.map((badge) => (
            <span
              key={badge.id}
              className={`bw-rel-chip${badge.primary ? ' bw-rel-chip--iatf' : ''}`}
            >
              {badge.label}
            </span>
          ))}
          {supplier.reliabilityCard?.traceMethod && supplier.reliabilityCard.traceMethod !== 'none' && (
            <span className="bw-rel-chip">Trace: {supplier.reliabilityCard.traceMethod}</span>
          )}
          {supplier.reliabilityCard?.ppapLevels?.length > 0 && (
            <span className="bw-rel-chip">PPAP L{supplier.reliabilityCard.ppapLevels.join('/')}</span>
          )}
        </div>
      )}
      {masked && (
        <div className="bw-supplier-card__blur-placeholder" aria-hidden="true">
          <span className="bw-supplier-card__blur-line" />
          <span className="bw-supplier-card__blur-line bw-supplier-card__blur-line--short" />
        </div>
      )}
      <div className="bw-supplier-card__actions">
        <button type="button" className="app-page-btn-outline" onClick={() => onSelect?.(supplier)}>
          {compareLabel}
        </button>
        {showEvidenceRequest && (
          <button
            type="button"
            className="app-page-btn-outline"
            disabled={evidenceRequestPending}
            onClick={() => onRequestEvidence?.(supplier)}
          >
            {evidenceRequestPending ? 'Requested' : requestEvidenceLabel}
          </button>
        )}
        {!hideShortlist && (
          <button
            type="button"
            className="app-page-btn-primary"
            disabled={disableShortlist}
            onClick={() => onShortlist?.(supplier)}
          >
            {shortlistLabel}
          </button>
        )}
      </div>
    </div>
  )
}
