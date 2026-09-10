const viteBase = import.meta.env.BASE_URL || '/'
const GEOJSON_URL = `${viteBase.endsWith('/') ? viteBase : `${viteBase}/`}geo/ne_110m_admin_0_countries.geojson`
const ATLAS_URL = '/intelligent-sourcing/assets/5d9e267c-1cbb-4f8a-85f6-b043d1245fab.json'

let cachedLand = null
let landPromise = null

export function asFeatureCollection(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (Array.isArray(raw.features)) return raw
  return null
}

/**
 * One shared land geography for Home, HR, and any other WorldMap.
 * Prefers the static GeoJSON, then the sourcing atlas if that request fails.
 */
export function loadWorldGeography() {
  if (cachedLand) return Promise.resolve(cachedLand)
  if (landPromise) return landPromise
  landPromise = fetch(GEOJSON_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`geojson ${r.status}`)
      return r.json()
    })
    .then((geo) => {
      const land = asFeatureCollection(geo)
      if (!land) throw new Error('geojson shape')
      return land
    })
    .catch(() => fetch(ATLAS_URL).then(async (r) => {
      if (!r.ok) throw new Error(`atlas ${r.status}`)
      const topo = await r.json()
      const land = asFeatureCollection(topo)
      if (land) return land
      throw new Error('atlas shape')
    }))
    .then((land) => {
      cachedLand = land
      return land
    })
    .catch((err) => {
      landPromise = null
      throw err
    })
  return landPromise
}

export function getWorldGeographyUrl() {
  return GEOJSON_URL
}

export function getCachedWorldGeography() {
  return cachedLand
}

export function hasCachedWorldGeography() {
  return Boolean(cachedLand)
}
