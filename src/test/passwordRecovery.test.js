import { describe, it, expect } from 'vitest'
import { validateNewPassword } from '../utils/passwordPolicy'
import { detectRecoveryFromLocation } from '../utils/authPasswordRecovery'

describe('validateNewPassword', () => {
  it('requires length, uppercase, number, and match', () => {
    expect(validateNewPassword('short', 'short')).toMatch(/8 characters/)
    expect(validateNewPassword('nouppercase1', 'nouppercase1')).toMatch(/uppercase/)
    expect(validateNewPassword('NoNumber', 'NoNumber')).toMatch(/number/)
    expect(validateNewPassword('ValidPass1', 'other')).toMatch(/do not match/)
    expect(validateNewPassword('ValidPass1', 'ValidPass1')).toBeNull()
  })
})

describe('detectRecoveryFromLocation', () => {
  it('detects recovery hash, type query, and reset flag', () => {
    expect(detectRecoveryFromLocation({
      hash: '#access_token=abc&type=recovery',
      search: '',
    })).toBe(true)
    expect(detectRecoveryFromLocation({
      hash: '',
      search: '?type=recovery',
    })).toBe(true)
    expect(detectRecoveryFromLocation({
      hash: '',
      search: '?reset=true',
    })).toBe(true)
    expect(detectRecoveryFromLocation({
      hash: '#type=signup',
      search: '?confirmed=true',
    })).toBe(false)
  })
})
