import { ToggleCheckButton } from './ToggleCheckButton'
import { useAuthStore } from '../store/authStore'
import { useMarketplaceCatalogVisibilityStore } from '../store/marketplaceCatalogVisibilityStore'

/**
 * Superadmin-only: include vs hide seeded marketplace catalog rows (static directory)
 * in industry supplier lists, executive summaries, and related metrics.
 */
export function MarketplaceCatalogVisibilityControl({
  className = '',
  compact = false,
}) {
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const show = useMarketplaceCatalogVisibilityStore((s) => s.showMarketplaceCatalog)
  const setShow = useMarketplaceCatalogVisibilityStore((s) => s.setShowMarketplaceCatalog)

  if (!isSuperAdmin) return null

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 6 : 10,
        flexWrap: 'wrap',
        minWidth: 0,
      }}
    >
      <ToggleCheckButton
        checked={show}
        onChange={setShow}
        compact={compact}
        aria-label={show ? 'Marketplace catalog suppliers shown' : 'Marketplace catalog suppliers hidden'}
        title="Superadmin system-update / demo catalog mode. When off (default on live), hides seeded marketplace and sourcing canvas demo sellers. Other accounts only see registered / imported sellers."
      >
        {compact ? 'Marketplace catalog' : 'Show marketplace catalog suppliers'}
      </ToggleCheckButton>
      {!compact && (
        <span className="stx-text-caption" style={{ color: 'var(--muted-foreground, #64748b)', maxWidth: 420 }}>
          Off on live by default. Turn on only for localhost testing or system-update demos — never leave on for production tenants.
        </span>
      )}
    </div>
  )
}
