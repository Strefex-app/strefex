/**
 * Estimated calendar durations for Network services (audits, expediting, etc.).
 * Not manufacturing lead time and not freight transit.
 *
 * totalDays ≈ schedule (booking / prep) + onSite + report / handoff.
 */

export const SERVICE_DURATION_PROFILES = {
  audit: { schedule: 14, onSite: 3, report: 5, label: 'Supplier / process audit' },
  'supplier-audit': { schedule: 14, onSite: 3, report: 5, label: 'Supplier audit' },
  qcinsp: { schedule: 5, onSite: 2, report: 2, label: 'Pre-shipment inspection' },
  inspection: { schedule: 5, onSite: 2, report: 2, label: 'Expediting / TPI' },
  expediting: { schedule: 5, onSite: 2, report: 2, label: 'Expediting' },
  'production-follow-up': { schedule: 7, onSite: 5, report: 2, label: 'Production follow-up' },
  'production-followup': { schedule: 7, onSite: 5, report: 2, label: 'Production follow-up' },
  'trial-run': { schedule: 10, onSite: 5, report: 3, label: 'Trial run' },
  'equipment-acceptance': { schedule: 14, onSite: 4, report: 5, label: 'Equipment acceptance' },
  'shipment-acceptance': { schedule: 3, onSite: 1, report: 2, label: 'Shipment acceptance' },
  'buy-off': { schedule: 7, onSite: 2, report: 3, label: 'Buy-off' },
  apqp: { schedule: 7, onSite: 0, report: 10, label: 'APQP cycle' },
  engineering: { schedule: 5, onSite: 0, report: 12, label: 'Engineering package' },
  industrialisation: { schedule: 14, onSite: 15, report: 5, label: 'Industrialisation' },
  industrialization: { schedule: 14, onSite: 15, report: 5, label: 'Industrialisation' },
  logistics: { schedule: 3, onSite: 0, report: 7, label: 'Logistics advisory' },
  testing: { schedule: 14, onSite: 10, report: 10, label: 'Testing / homologation' },
  default: { schedule: 7, onSite: 3, report: 5, label: 'Service engagement' },
}

export function resolveServiceDurationProfile(categoryIdOrName = '') {
  const raw = String(categoryIdOrName || '').trim()
  const key = raw.toLowerCase().replace(/\s+/g, '-')
  if (SERVICE_DURATION_PROFILES[key]) return SERVICE_DURATION_PROFILES[key]
  if (SERVICE_DURATION_PROFILES[raw]) return SERVICE_DURATION_PROFILES[raw]
  // fuzzy
  if (/audit/.test(key)) return SERVICE_DURATION_PROFILES.audit
  if (/expedit|tpi|inspection|qcinsp/.test(key)) return SERVICE_DURATION_PROFILES.inspection
  if (/follow.?up|followup/.test(key)) return SERVICE_DURATION_PROFILES['production-follow-up']
  if (/accept/.test(key)) return SERVICE_DURATION_PROFILES['equipment-acceptance']
  if (/apqp|ppap|programme|program/.test(key)) return SERVICE_DURATION_PROFILES.apqp
  return SERVICE_DURATION_PROFILES.default
}

export function serviceEngagementDays(categoryIdOrName, seed = '') {
  const p = resolveServiceDurationProfile(categoryIdOrName)
  const base = p.schedule + p.onSite + p.report
  const s = String(seed || categoryIdOrName || 'x')
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const f = ((h >>> 0) / 4294967295) * 0.4 - 0.2
  return Math.max(3, Math.round(base * (1 + f)))
}

/** Personnel travel days to site — not ocean freight. */
export function serviceTravelDays({ sameRegion = true, distanceKm = 1000, onSiteDays = 1 } = {}) {
  if (!onSiteDays) return 0
  if (sameRegion) return Math.max(0, Math.round(distanceKm / 700))
  return Math.max(2, Math.round(distanceKm / 7000) + 2)
}

export function serviceCompletionDays(categoryIdOrName, opts = {}) {
  const engagement = serviceEngagementDays(categoryIdOrName, opts.seed)
  const travel = serviceTravelDays(opts)
  return engagement + travel
}
