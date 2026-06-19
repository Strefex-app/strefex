import { describe, expect, it } from 'vitest'
import { normalizeCompanySlugInput, shouldPromptCompanySlug } from '../utils/loginErrors'

describe('loginErrors', () => {
  it('detects multi-company backend messages', () => {
    expect(shouldPromptCompanySlug('Multiple companies found. Sign in with company slug (acme, beta).')).toBe(true)
    expect(shouldPromptCompanySlug('Invalid credentials')).toBe(false)
  })

  it('normalizes company slug input', () => {
    expect(normalizeCompanySlugInput('  Acme-Corp  ')).toBe('acme-corp')
    expect(normalizeCompanySlugInput('   ')).toBe(null)
    expect(normalizeCompanySlugInput('')).toBe(null)
  })
})
