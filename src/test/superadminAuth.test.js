import { describe, expect, it } from 'vitest'
import {
  isSuperadminEmail,
  validateSuperadminCredentials,
  canAssignSuperadmin,
} from '../services/superadminAuth'

describe('superadminAuth', () => {
  it('matches configured superadmin email', () => {
    expect(isSuperadminEmail('strefex@strfgroup.ru')).toBe(true)
    expect(isSuperadminEmail('other@example.com')).toBe(false)
  })

  it('never validates passwords on the client', () => {
    expect(validateSuperadminCredentials('strefex@strfgroup.ru', 'any-password')).toBe(false)
  })

  it('only superadmin can assign superadmin', () => {
    expect(canAssignSuperadmin('superadmin')).toBe(true)
    expect(canAssignSuperadmin('admin')).toBe(false)
  })
})
