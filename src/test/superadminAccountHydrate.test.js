import { describe, expect, it } from 'vitest'
import { mergeCompanySources, pickPrimaryProfile } from '../utils/superadminAccountHydrate'

describe('superadminAccountHydrate', () => {
  it('fills empty cloud scalars from registry and list stub', () => {
    const merged = mergeCompanySources(
      { id: '11111111-1111-4111-8111-111111111111', name: '', email: '', country: '' },
      { name: 'Acme Tools', email: 'plant@acme.test', country: 'Germany', _registryKey: 'plant@acme.test' },
      { company: 'Acme Tools', city: 'Stuttgart', phone: '+49' },
      { full_name: 'Anna Schmidt', email: 'plant@acme.test' },
    )
    expect(merged.name).toBe('Acme Tools')
    expect(merged.email).toBe('plant@acme.test')
    expect(merged.country).toBe('Germany')
    expect(merged.city).toBe('Stuttgart')
    expect(merged.phone).toBe('+49')
    expect(merged._contactName).toBe('Anna Schmidt')
    expect(merged._local).toBe(false)
  })

  it('picks the profile matching account email over an unnamed first row', () => {
    const primary = pickPrimaryProfile([
      { id: 'a', email: 'other@x.test', full_name: '' },
      { id: 'b', email: 'plant@acme.test', full_name: 'Anna Schmidt' },
    ], 'plant@acme.test')
    expect(primary.id).toBe('b')
  })
})
