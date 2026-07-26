import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DEMO_TENANT_ID,
  matchDemoProfile,
  isDemoModeActive,
  isDemoLoginEnabled,
  verifyDemoAccessCode,
  grantDemoAccessSession,
  isDemoAccessGranted,
  revokeDemoAccessSession,
} from '../config/demoAccount'
import { buildDemoSeedPayload } from '../data/demoAccountSeed'

const TEST_CODE = 'StrefexDemo2026!'

describe('demoAccount', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.stubEnv('VITE_DEMO_ACCESS_CODE', TEST_CODE)
    vi.stubEnv('VITE_DEMO_LOGIN_ENABLED', 'true')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('requires configured access code to enable demo login', () => {
    expect(isDemoLoginEnabled()).toBe(true)
    vi.stubEnv('VITE_DEMO_ACCESS_CODE', '')
    expect(isDemoLoginEnabled()).toBe(false)
  })

  it('matches quick demo email only with valid access code', () => {
    expect(matchDemoProfile('demo@strefex.app', TEST_CODE)).toBe('buyer')
    expect(matchDemoProfile('demo@strefex.app', 'wrong-code')).toBeNull()
  })

  it('matches manufacturer demo email with access code', () => {
    expect(matchDemoProfile('demo.manufacturer@strefex.app', TEST_CODE)).toBe('seller')
  })

  it('rejects unknown credentials even with valid code', () => {
    expect(matchDemoProfile('other@test.com', TEST_CODE)).toBeNull()
  })

  it('tracks demo access grant in sessionStorage', () => {
    expect(isDemoAccessGranted()).toBe(false)
    grantDemoAccessSession()
    expect(isDemoAccessGranted()).toBe(true)
    revokeDemoAccessSession()
    expect(isDemoAccessGranted()).toBe(false)
  })

  it('verifyDemoAccessCode compares exactly', () => {
    expect(verifyDemoAccessCode(TEST_CODE)).toBe(true)
    expect(verifyDemoAccessCode('nope')).toBe(false)
  })

  it('detects demo session from auth storage', () => {
    localStorage.setItem(
      'strefex-auth',
      JSON.stringify({ sessionMode: 'demo', tenant: { id: DEMO_TENANT_ID } }),
    )
    expect(isDemoModeActive()).toBe(true)
  })

  it('builds buyer seed with rfqs and projects', () => {
    const seed = buildDemoSeedPayload('buyer')
    expect(seed['strefex-subscription'].accountType).toBe('buyer')
    expect(seed['strefex-rfq-storage'].state.rfqs.length).toBeGreaterThan(0)
    expect(seed['project-storage'].state.projects.length).toBe(1)
  })
})
