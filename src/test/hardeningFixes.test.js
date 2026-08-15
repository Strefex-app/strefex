import { describe, expect, it } from 'vitest'
import { DEFAULT_GLOBAL_LIST_LIMIT, resolveCrudListLimit } from '../utils/crudListLimit'
import { checkRateLimit } from '../../api/_lib/rateLimit.js'
import {
  configuredSuperadminEmail,
  isSuperadminEmail,
  validateSuperadminCredentials,
  canAssignSuperadmin,
} from '../services/superadminAuth'

describe('resolveCrudListLimit', () => {
  it('caps lists that omit limit, including filtered cross-tenant calls', () => {
    expect(resolveCrudListLimit({})).toBe(DEFAULT_GLOBAL_LIST_LIMIT)
    expect(resolveCrudListLimit({ filters: [['status', 'eq', 'open']] })).toBe(2000)
  })

  it('honors explicit limit and unbounded', () => {
    expect(resolveCrudListLimit({ limit: 50 })).toBe(50)
    expect(resolveCrudListLimit({ unbounded: true })).toBe(null)
  })
})

describe('checkRateLimit', () => {
  it('blocks after the max calls in the window', () => {
    const key = `test-${Date.now()}`
    expect(checkRateLimit({ key, windowMs: 60_000, max: 2 }).allowed).toBe(true)
    expect(checkRateLimit({ key, windowMs: 60_000, max: 2 }).allowed).toBe(true)
    expect(checkRateLimit({ key, windowMs: 60_000, max: 2 }).allowed).toBe(false)
  })
})

describe('superadminAuth', () => {
  it('matches configured superadmin email in development', () => {
    expect(isSuperadminEmail('strefex@strfgroup.ru')).toBe(true)
    expect(isSuperadminEmail('other@example.com')).toBe(false)
  })

  it('does not ship a default superadmin email in production builds', () => {
    const prod = { PROD: true }
    expect(configuredSuperadminEmail(prod)).toBe('')
    expect(isSuperadminEmail('strefex@strfgroup.ru', prod)).toBe(false)
    expect(isSuperadminEmail('strefex@strfgroup.ru', { PROD: true, VITE_SA_EMAIL: 'ops@strefex.app' })).toBe(false)
    expect(isSuperadminEmail('ops@strefex.app', { PROD: true, VITE_SA_EMAIL: 'ops@strefex.app' })).toBe(true)
  })

  it('never validates passwords on the client', () => {
    expect(validateSuperadminCredentials('strefex@strfgroup.ru', 'any-password')).toBe(false)
  })

  it('only superadmin can assign superadmin', () => {
    expect(canAssignSuperadmin('superadmin')).toBe(true)
    expect(canAssignSuperadmin('admin')).toBe(false)
  })
})
