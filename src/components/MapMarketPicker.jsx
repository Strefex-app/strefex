import { useCallback, useMemo } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { getCountryCode } from 'countries-list'
import { getCountriesFiltered } from '../data/worldMarkets'

/** Same Natural Earth layer as the old globe picker — small GeoJSON, no WebGL / Three. */
const GEOJSON_URL =
  'https://cdn.jsdelivr.net/npm/globe.gl@2.45.2/example/datasets/ne_110m_admin_0_countries.geojson'

function isoFromGeo(geo) {
  const props = geo?.properties || {}
  let iso = props.ISO_A2
  if (iso && iso !== '-99' && typeof iso === 'string' && iso.length === 2) {
    return iso.toUpperCase()
  }
  const admin = props.ADMIN || props.NAME
  if (admin) {
    const c = getCountryCode(admin)
    if (c) return c
  }
  return null
}

export default function MapMarketPicker({ selectedIso2, marketTabId, onCountrySelect, height = 240 }) {
  const inMarketSet = useMemo(() => {
    if (marketTabId === 'all') return null
    return new Set(getCountriesFiltered(marketTabId).map((c) => c.code))
  }, [marketTabId])

  const fillFor = useCallback(
    (geo) => {
      const iso = isoFromGeo(geo)
      if (!iso || iso === 'AQ') return 'rgba(26, 46, 74, 0.35)'
      const inM = !inMarketSet || inMarketSet.has(iso)
      const sel = iso === selectedIso2
      if (sel) return 'rgba(120, 200, 255, 0.92)'
      if (inM) return 'rgba(30, 58, 95, 0.78)'
      return 'rgba(26, 46, 74, 0.22)'
    },
    [inMarketSet, selectedIso2],
  )

  return (
    <div className="cti-map-market-root" style={{ width: '100%', height, touchAction: 'pan-y pinch-zoom' }}>
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{
          scale: 88,
          center: [0, 5],
        }}
        style={{ width: '100%', height: '100%', maxWidth: '100%' }}
      >
        <ZoomableGroup zoom={1} minZoom={0.85} maxZoom={4} center={[0, 12]}>
          <Geographies geography={GEOJSON_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const iso = isoFromGeo(geo)
                if (!iso || iso === 'AQ') return null
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillFor(geo)}
                    stroke="rgba(0, 0, 0, 0.18)"
                    strokeWidth={0.35}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', cursor: 'pointer', filter: 'brightness(1.06)' },
                      pressed: { outline: 'none' },
                    }}
                    onClick={() => onCountrySelect?.(iso)}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  )
}
