import { describe, it, expect } from 'vitest'
import { getNetworkHomeClusters } from '../data/networkHomeClusters'

describe('Network home clusters', () => {
  it('shows Sourcing + Executive Summary for buyers and home dashboard for manufacturers', () => {
    const buyer = getNetworkHomeClusters({ accountTypes: ['buyer'] }).map((c) => c.id)
    expect(buyer).toContain('intelligent-sourcing')
    expect(buyer).toContain('executive-summary')
    expect(buyer).not.toContain('home-dashboard')

    const seller = getNetworkHomeClusters({ accountTypes: ['seller'] }).map((c) => c.id)
    expect(seller).toContain('home-dashboard')
    expect(seller).not.toContain('executive-summary')
    expect(seller).not.toContain('intelligent-sourcing')
  })

  it('always includes directory clusters', () => {
    const ids = getNetworkHomeClusters({ accountTypes: ['buyer'] }).map((c) => c.id)
    expect(ids).toEqual(expect.arrayContaining(['products', 'equipment', 'services']))
  })
})
