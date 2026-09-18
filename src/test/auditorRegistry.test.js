import { describe, expect, it } from 'vitest'
import {
  ensureAuditorRegistrationNumbers,
  mergeAuditorLists,
  nextAuditorRegistrationNumber,
} from '../utils/auditorRegistry'

describe('auditorRegistry', () => {
  const year = new Date().getFullYear()

  it('issues sequential STREFEX registration numbers by year', () => {
    expect(nextAuditorRegistrationNumber([], year)).toBe(`SX-AUD-${year}-001`)
    expect(nextAuditorRegistrationNumber([
      { auditorCode: `SX-AUD-${year}-001` },
      { auditorCode: `SX-AUD-${year}-004` },
    ], year)).toBe(`SX-AUD-${year}-005`)
  })

  it('fills missing numbers and merges platform auditors without duplicating email', () => {
    const merged = mergeAuditorLists(
      [{ id: 'local', name: 'Ada', email: 'ada@strefex.com', auditorCode: `SX-AUD-${year}-001`, certifications: ['IATF'] }],
      [
        { id: 'company_profile_1', name: 'Ada West', email: 'ada@strefex.com', source: 'supabase_profiles' },
        { id: 'company_profile_2', name: 'Bo', email: 'bo@strefex.com', source: 'supabase_profiles' },
      ],
    )
    expect(merged).toHaveLength(2)
    expect(merged[0]).toMatchObject({
      id: 'local',
      email: 'ada@strefex.com',
      auditorCode: `SX-AUD-${year}-001`,
      certifications: ['IATF'],
    })
    expect(merged[1]).toMatchObject({
      email: 'bo@strefex.com',
      auditorCode: `SX-AUD-${year}-002`,
    })
  })

  it('assigns numbers to an existing panel that has none', () => {
    const rows = ensureAuditorRegistrationNumbers([
      { id: 'a', email: 'a@x.com' },
      { id: 'b', email: 'b@x.com' },
    ])
    expect(rows.map((r) => r.auditorCode)).toEqual([`SX-AUD-${year}-001`, `SX-AUD-${year}-002`])
  })
})
