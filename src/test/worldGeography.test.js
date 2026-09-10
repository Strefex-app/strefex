import { describe, expect, it } from 'vitest'
import { asFeatureCollection, getWorldGeographyUrl } from '../utils/worldGeography'

describe('worldGeography', () => {
  it('points at the static Natural Earth GeoJSON', () => {
    expect(getWorldGeographyUrl()).toMatch(/ne_110m_admin_0_countries\.geojson$/)
  })

  it('accepts a FeatureCollection and rejects other JSON', () => {
    expect(asFeatureCollection({ type: 'FeatureCollection', features: [] })).toEqual({
      type: 'FeatureCollection',
      features: [],
    })
    expect(asFeatureCollection({ type: 'Topology', objects: {} })).toBeNull()
    expect(asFeatureCollection(null)).toBeNull()
  })
})
