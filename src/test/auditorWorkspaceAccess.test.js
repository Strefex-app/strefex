import { describe, expect, it } from 'vitest'
import {
  auditorLandingPath,
  auditorSafeRedirect,
  isSourcingSurfacePath,
} from '../utils/auditorWorkspaceAccess'
import { shouldShowSourcingInNav } from '../utils/networkRoles'

describe('auditor workspace access', () => {
  it('treats Home and Sourcing as seller-network surfaces', () => {
    expect(isSourcingSurfacePath('/sourcing')).toBe(true)
    expect(isSourcingSurfacePath('/main-menu')).toBe(true)
    expect(isSourcingSurfacePath('/product-hub/automotive')).toBe(true)
    expect(isSourcingSurfacePath('/equipment-hub')).toBe(true)
    expect(isSourcingSurfacePath('/industry/automotive/equipment')).toBe(true)
    expect(isSourcingSurfacePath('/management/auditors/calendar')).toBe(false)
  })

  it('redirects auditors off sourcing and hides the nav item', () => {
    expect(auditorSafeRedirect('auditor_external', '/sourcing')).toBe(auditorLandingPath())
    expect(auditorSafeRedirect('auditor_internal', '/product-hub')).toBe(auditorLandingPath())
    expect(auditorSafeRedirect('auditor_external', '/management/auditors')).toBe(null)
    expect(shouldShowSourcingInNav({
      accountType: 'auditor',
      accountTypes: ['auditor'],
      role: 'auditor_external',
    })).toBe(false)
  })

  it('keeps buyers on sourcing', () => {
    expect(auditorSafeRedirect('user', '/sourcing')).toBe(null)
    expect(shouldShowSourcingInNav({
      accountType: 'buyer',
      accountTypes: ['buyer'],
      role: 'user',
    })).toBe(true)
  })
})
