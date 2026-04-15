/** Label for supplier discovery UI (matches search RPC tenant_visibility_tier). */
export function tenantVisibilityLabel(tier) {
  const t = String(tier || '').toLowerCase()
  if (t === 'verified') return 'Verified tenant'
  if (t === 'premium') return 'Premium RFQ profile'
  if (t === 'standard') return 'Standard tenant profile'
  return null
}

export function tenantVisibilityTierFromRow(row) {
  if (!row || typeof row !== 'object') return null
  return row.tenant_visibility_tier || row.tenantVisibilityTier || null
}
