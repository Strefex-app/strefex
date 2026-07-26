import SupplierScoreBadge from './SupplierScoreBadge'
import { tenantVisibilityLabel, tenantVisibilityTierFromRow } from '../utils/tenantVisibilityLabel'

export default function SupplierCard({
  supplier,
  onSelect,
  onShortlist,
  compareLabel = 'Compare',
  shortlistLabel = 'Shortlist',
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
