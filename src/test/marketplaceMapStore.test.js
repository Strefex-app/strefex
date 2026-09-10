import { describe, expect, it } from 'vitest'
import useMarketplaceMapStore, { mapSurfaceFromPath } from '../store/marketplaceMapStore'

describe('marketplaceMapStore', () => {
  it('uses the shared overlay on Home and People HR, not Sourcing', () => {
    expect(mapSurfaceFromPath('/main-menu')).toBe('home')
    expect(mapSurfaceFromPath('/sourcing')).toBe('none')
    expect(mapSurfaceFromPath('/management/people')).toBe('hr')
    expect(mapSurfaceFromPath('/management/people/hr-space')).toBe('none')
  })

  it('keeps Home RFQ pins and HR plant pins on separate surfaces', () => {
    useMarketplaceMapStore.setState({
      surface: 'none',
      home: { locations: [], plantLocation: null, lanes: null, metric: 'risk', selectedId: null, slot: null, showLane: true },
      hr: { locations: [], plantLocation: null, lanes: null, metric: 'risk', selectedId: null, slot: null, showLane: false },
    })
    useMarketplaceMapStore.getState().setHomeView({
      locations: [{ id: 'rfq-1', name: 'Quote plant', coordinates: [9, 48] }],
    })
    useMarketplaceMapStore.getState().setHrView({
      locations: [{ id: 'plant-muc', name: 'Munich plant', coordinates: [11.58, 48.14] }],
      showLane: false,
    })
    useMarketplaceMapStore.getState().setSurface('home')
    expect(useMarketplaceMapStore.getState().home.locations[0].id).toBe('rfq-1')
    expect(useMarketplaceMapStore.getState().hr.locations[0].id).toBe('plant-muc')
    useMarketplaceMapStore.getState().setSurface('hr')
    expect(useMarketplaceMapStore.getState().surface).toBe('hr')
  })
})
