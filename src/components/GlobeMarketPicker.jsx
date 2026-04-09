import { useCallback, useEffect, useRef } from 'react'
import Globe from 'globe.gl'
import { getCountryCode } from 'countries-list'
import { getCountriesFiltered } from '../data/worldMarkets'

const GEOJSON_URL =
  'https://cdn.jsdelivr.net/npm/globe.gl@2.45.2/example/datasets/ne_110m_admin_0_countries.geojson'

const POV_MS = 1100

function geometryBbox(geom) {
  const b = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
  function walk(coords) {
    if (typeof coords[0] === 'number') {
      const lng = coords[0]
      const lat = coords[1]
      b.minLat = Math.min(b.minLat, lat)
      b.maxLat = Math.max(b.maxLat, lat)
      b.minLng = Math.min(b.minLng, lng)
      b.maxLng = Math.max(b.maxLng, lng)
    } else {
      for (let i = 0; i < coords.length; i += 1) walk(coords[i])
    }
  }
  if (!geom) return null
  if (geom.type === 'Polygon') {
    for (let i = 0; i < geom.coordinates.length; i += 1) walk(geom.coordinates[i])
  } else if (geom.type === 'MultiPolygon') {
    for (let p = 0; p < geom.coordinates.length; p += 1) {
      const poly = geom.coordinates[p]
      for (let r = 0; r < poly.length; r += 1) walk(poly[r])
    }
  } else return null
  return b
}

/** Rough centroid + bbox span → camera altitude (globe.gl: lower = closer). */
function viewFromFeature(feat) {
  const g = feat?.geometry
  if (!g) return null
  const b = geometryBbox(g)
  if (!b) return null
  const lat = (b.minLat + b.maxLat) / 2
  let lng = (b.minLng + b.maxLng) / 2
  const lngSpanRaw = Math.abs(b.maxLng - b.minLng)
  if (lngSpanRaw > 180) {
    lng = ((b.minLng + b.maxLng + 360) / 2) % 360
    if (lng > 180) lng -= 360
  }
  const latSpan = Math.max(0.02, b.maxLat - b.minLat)
  let lngSpan = lngSpanRaw
  if (lngSpan > 180) lngSpan = 360 - lngSpan
  lngSpan = Math.max(0.02, lngSpan)
  const diag = Math.sqrt(latSpan * latSpan + lngSpan * lngSpan)
  const altitude = Math.min(3.45, Math.max(1.08, 0.82 + diag * 0.062))
  return { lat, lng, altitude }
}

function isoFromFeature(feat) {
  let iso = feat.properties?.ISO_A2
  if (iso && iso !== '-99' && typeof iso === 'string' && iso.length === 2) {
    return iso.toUpperCase()
  }
  const admin = feat.properties?.ADMIN || feat.properties?.NAME
  if (admin) {
    const c = getCountryCode(admin)
    if (c) return c
  }
  return null
}

export default function GlobeMarketPicker({ selectedIso2, marketTabId, onCountrySelect, height = 220 }) {
  const rootRef = useRef(null)
  const globeRef = useRef(null)
  const featuresRef = useRef([])
  const selectedRef = useRef(selectedIso2)
  const marketRef = useRef(marketTabId)
  const onSelectRef = useRef(onCountrySelect)
  const readyRef = useRef(false)

  useEffect(() => {
    selectedRef.current = selectedIso2
  }, [selectedIso2])
  useEffect(() => {
    marketRef.current = marketTabId
  }, [marketTabId])
  useEffect(() => {
    onSelectRef.current = onCountrySelect
  }, [onCountrySelect])

  const applyColors = useCallback(() => {
    const globe = globeRef.current
    if (!globe || !featuresRef.current.length) return
    const sel = selectedRef.current
    const mkt = marketRef.current
    const inMarket = mkt === 'all' ? null : new Set(getCountriesFiltered(mkt).map((c) => c.code))

    globe
      .polygonCapColor((feat) => {
        const iso = isoFromFeature(feat)
        if (!iso) return 'rgba(26, 46, 74, 0.45)'
        const isSel = iso === sel
        const inM = !inMarket || inMarket.has(iso)
        if (isSel) return 'rgba(120, 200, 255, 0.95)'
        if (inM) return 'rgba(30, 58, 95, 0.88)'
        return 'rgba(26, 46, 74, 0.22)'
      })
      .polygonSideColor(() => 'rgba(20, 40, 72, 0.35)')
      .polygonAltitude((feat) => {
        const iso = isoFromFeature(feat)
        return iso && iso === sel ? 0.07 : 0.035
      })
  }, [])

  const focusSelectedCountry = useCallback(() => {
    const globe = globeRef.current
    if (!globe || !readyRef.current) return
    const iso = selectedRef.current
    if (!iso) return
    const feat = featuresRef.current.find((f) => isoFromFeature(f) === iso)
    if (!feat) return
    const pov = viewFromFeature(feat)
    if (!pov) return
    globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: pov.altitude }, POV_MS)
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    let cancelled = false

    const globe = new Globe(el)
      .enablePointerInteraction(true)
      .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg')
      .backgroundImageUrl(null)
      .backgroundColor('#cfd4dc')
      .showAtmosphere(true)
      .atmosphereColor('rgba(100, 140, 190, 0.28)')
      /* Slightly wider hit target for country taps on phones */
      .lineHoverPrecision(0.35)

    globeRef.current = globe

    const resize = () => {
      if (!el || !globeRef.current) return
      const w = el.offsetWidth || 300
      globeRef.current.width(w).height(height)
      /* Mobile: let the canvas receive taps/drags without the browser stealing them for scroll/zoom. */
      const canvas = el.querySelector('canvas')
      if (canvas) {
        canvas.style.touchAction = 'none'
        canvas.style.width = '100%'
        canvas.style.height = `${height}px`
        canvas.style.display = 'block'
      }
    }
    resize()
    queueMicrotask(() => resize())
    requestAnimationFrame(() => {
      resize()
      requestAnimationFrame(() => resize())
    })
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    const onViewportChange = () => {
      requestAnimationFrame(() => resize())
    }
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('orientationchange', onViewportChange)

    fetch(GEOJSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error('geojson')
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const features = (data.features || []).filter((f) => f.properties?.ISO_A2 !== 'AQ')
        featuresRef.current = features
        globe
          .polygonsData(features)
          .polygonGeoJsonGeometry((d) => d.geometry)
          .polygonStrokeColor(() => 'rgba(0, 0, 0, 0.2)')
          .polygonLabel((d) => {
            const name = d.properties?.ADMIN || d.properties?.NAME || ''
            return `<div style="padding:4px 8px;background:rgba(0,0,0,.78);color:#fff;border-radius:6px;font-size:12px">${name}</div>`
          })
          .onPolygonClick((polygon, ev) => {
            if (ev?.preventDefault) ev.preventDefault()
            const iso = isoFromFeature(polygon)
            if (iso) onSelectRef.current(iso)
          })
        applyColors()
        readyRef.current = true
        requestAnimationFrame(() => {
          if (cancelled) return
          resize()
          focusSelectedCountry()
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
      readyRef.current = false
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('orientationchange', onViewportChange)
      ro.disconnect()
      if (globeRef.current) {
        globeRef.current._destructor()
        globeRef.current = null
      }
      featuresRef.current = []
    }
  }, [applyColors, height, focusSelectedCountry])

  useEffect(() => {
    applyColors()
  }, [applyColors, selectedIso2, marketTabId])

  useEffect(() => {
    focusSelectedCountry()
  }, [focusSelectedCountry, selectedIso2])

  return <div ref={rootRef} className="cti-globe-root" style={{ width: '100%', height }} />
}
