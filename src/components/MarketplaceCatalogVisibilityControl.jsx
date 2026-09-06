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
        title="Superadmin only. When off, hides seeded marketplace directory suppliers from lists, maps, and match scores. Other accounts see only vendor master, audit registry, and workspace imports."
      >
        {compact ? 'Marketplace catalog' : 'Show marketplace catalog suppliers'}
      </ToggleCheckButton>
      {!compact && (
        <span className="stx-text-caption" style={{ color: 'var(--muted-foreground, #64748b)', maxWidth: 420 }}>
          Off by default. When on, includes the legacy seeded marketplace directory. Leave off to show only registered accounts, vendor master, and workspace imports.
        </span>
      )}
    </div>
  )
}
