import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearDeprecatedLocalStorageOnce,
  keyMatchesDeprecated,
  FLAG_KEY,
  LEGACY_FLAG_KEYS_TO_REMOVE,
} from '../utils/clearDeprecatedLocalStorageOnce'

describe('clearDeprecatedLocalStorageOnce', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('removes fin-market-portfolio keys and sets flag', () => {
    localStorage.setItem('fin-market-portfolio-cache-v2::acme.com', '{}')
    localStorage.setItem('fin-market-portfolio-user-u1::acme.com', '{}')
    localStorage.setItem('strefex-other::acme.com', '1')
    clearDeprecatedLocalStorageOnce()
    expect(localStorage.getItem('fin-market-portfolio-cache-v2::acme.com')).toBeNull()
    expect(localStorage.getItem('fin-market-portfolio-user-u1::acme.com')).toBeNull()
    expect(localStorage.getItem('strefex-other::acme.com')).toBe('1')
    expect(localStorage.getItem(FLAG_KEY)).toBe('1')
  })

  it('is a no-op when flag already set', () => {
    localStorage.setItem(FLAG_KEY, '1')
    localStorage.setItem('fin-market-portfolio-cache-v2::x', 'keep')
    clearDeprecatedLocalStorageOnce()
    expect(localStorage.getItem('fin-market-portfolio-cache-v2::x')).toBe('keep')
  })

  it('drops legacy fin-market cleanup flag', () => {
    localStorage.setItem(LEGACY_FLAG_KEYS_TO_REMOVE[0], '1')
    clearDeprecatedLocalStorageOnce()
    expect(localStorage.getItem(LEGACY_FLAG_KEYS_TO_REMOVE[0])).toBeNull()
  })
})

describe('keyMatchesDeprecated', () => {
  it('matches portfolio keys only', () => {
    expect(keyMatchesDeprecated('fin-market-portfolio-cache-v2::guest')).toBe(true)
    expect(keyMatchesDeprecated('strefex-rfq-storage::acme.com')).toBe(false)
  })
})
