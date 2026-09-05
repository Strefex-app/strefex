import { describe, it, expect } from 'vitest'
import { sidebarNavItemVisible } from '../utils/sidebarNav'

const management = { id: 'management', managementNav: true }
const inbox = { id: 'inbox', inboxNav: true }
const sourcing = { id: 'sourcing', sourcingNav: true }
const home = { id: 'home', homeNav: true }
const calendar = { id: 'calendar' }

const allow = {
  showSupplierSideNav: true,
  showBuyerSideNav: true,
  showHomeNav: true,
  showSourcingNav: true,
  showInboxNav: true,
  showManagementNav: true,
  hasRole: () => true,
  hasFeature: () => true,
  previewTimeLeft: null,
}

describe('sidebarNavItemVisible', () => {
  it('gates Management via managementNav', () => {
    expect(sidebarNavItemVisible(management, allow)).toBe(true)
    expect(sidebarNavItemVisible(management, { ...allow, showManagementNav: false })).toBe(false)
  })

  it('gates Inbox via inboxNav', () => {
    expect(sidebarNavItemVisible(inbox, allow)).toBe(true)
    expect(sidebarNavItemVisible(inbox, { ...allow, showInboxNav: false })).toBe(false)
  })

  it('gates Sourcing via sourcingNav', () => {
    expect(sidebarNavItemVisible(sourcing, allow)).toBe(true)
    expect(sidebarNavItemVisible(sourcing, { ...allow, showSourcingNav: false })).toBe(false)
  })

  it('gates Home via homeNav', () => {
    expect(sidebarNavItemVisible(home, allow)).toBe(true)
    expect(sidebarNavItemVisible(home, { ...allow, showHomeNav: false })).toBe(false)
  })

  it('shows utility items without role flags', () => {
    expect(sidebarNavItemVisible(calendar, allow)).toBe(true)
  })
})
