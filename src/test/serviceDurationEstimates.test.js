import { describe, it, expect } from 'vitest'
import {
  resolveServiceDurationProfile,
  serviceEngagementDays,
  serviceTravelDays,
  serviceCompletionDays,
} from '../utils/serviceDurationEstimates'

describe('serviceDurationEstimates', () => {
  it('uses audit engagement days, not manufacturing lead', () => {
    const p = resolveServiceDurationProfile('audit')
    expect(p.onSite).toBe(3)
    expect(p.schedule + p.onSite + p.report).toBe(22)
    const days = serviceEngagementDays('audit', 'Acme Audit Co')
    expect(days).toBeGreaterThanOrEqual(17)
    expect(days).toBeLessThanOrEqual(27)
  })

  it('treats expediting / TPI as short on-site services', () => {
    const p = resolveServiceDurationProfile('Third-Party Inspection')
    expect(p.onSite).toBe(2)
    expect(serviceEngagementDays('expediting')).toBeLessThan(20)
  })

  it('completion adds travel, not ocean freight', () => {
    const engage = serviceEngagementDays('audit', 'x')
    const travel = serviceTravelDays({ sameRegion: false, distanceKm: 8000, onSiteDays: 3 })
    expect(travel).toBeLessThan(20)
    expect(serviceCompletionDays('audit', { seed: 'x', sameRegion: false, distanceKm: 8000, onSiteDays: 3 }))
      .toBe(engage + travel)
  })

  it('remote-style services can have zero travel', () => {
    expect(serviceTravelDays({ onSiteDays: 0 })).toBe(0)
  })
})
