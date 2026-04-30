import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { geoEqualEarth } from 'd3-geo'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import './WorldMap.css'

/* STREFEX design tokens — see src/index.css (Midnight Navy + Champagne) */
const BRAND_NAVY = '#192A56'
const BRAND_NAVY_DEEP = '#1E3054'
const BRAND_NAVY_SOFT = '#2A3F6B'
const BRAND_CHAMPAGNE = '#F7D794'
const BRAND_CHAMPAGNE_DEEP = '#E8C86A'

/**
 * Chart-style palette: cool “paper” water, restrained midnight land,
 * Champagne boundaries & pins wired to brand accent (#F7D794).
 */
const MAP_THEME = {
  ocean: '#E8ECF4',
  land: BRAND_NAVY_DEEP,
  landHover: BRAND_NAVY_SOFT,
  border: BRAND_CHAMPAGNE,
  borderOpacity: 0.55,
}

const EXEC_THEME = {
  stroke: BRAND_NAVY,
  strokeHover: BRAND_NAVY_DEEP,
  pin: BRAND_CHAMPAGNE,
  pinSelected: BRAND_CHAMPAGNE_DEEP,
}

/** Fit Equal Earth Sphere to viewport; omit skewed projection centers (library translate chain). */
function fitWorldProjection(width, height) {
  const w = Math.max(2, Math.floor(width))
  const h = Math.max(2, Math.floor(height))
  const pad = Math.min(16, Math.max(1, Math.floor(Math.min(w, h) * 0.01)))
  const p = geoEqualEarth()
  p.fitExtent(
    [[pad, pad], [w - pad, h - pad]],
    { type: 'Sphere' }
  )
  return { scale: p.scale(), center: p.center(), width: w, height: h }
}

function useMapFrameSize(defaultWidth = 800, defaultHeight = 360) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const update = () => {
      const { width: cw, height: ch } = el.getBoundingClientRect()
      if (cw < 8 || ch < 8) return
      const width = Math.round(cw)
      const height = Math.round(ch)
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      )
    }

    update()
    const ro = new ResizeObserver(() => update())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { containerRef, ...size }
}

// Same-origin GeoJSON in public/geo — avoids CDN fetch failures after deploy (CSP, blocked hosts).
const viteBase = import.meta.env.BASE_URL || '/'
const geoUrl = `${viteBase.endsWith('/') ? viteBase : `${viteBase}/`}geo/ne_110m_admin_0_countries.geojson`

// Default locations if none provided
const defaultLocations = [
  { name: "New York", coordinates: [-74.006, 40.7128] },
  { name: "London", coordinates: [-0.1276, 51.5074] },
  { name: "Tokyo", coordinates: [139.6503, 35.6762] },
  { name: "Sydney", coordinates: [151.2093, -33.8688] },
  { name: "Berlin", coordinates: [13.4050, 52.5200] },
  { name: "Singapore", coordinates: [103.8198, 1.3521] },
]

const WorldMap = ({
  locations = null,
  onMarkerClick = null,
  selectedId = null,
  showTooltip = true,
  markerColor = "#4CAF50",
  selectedMarkerColor = "#2196F3",
  height = "100%",
  variant = "default",
}) => {
  const isExecutive = variant === "executive"
  const [hoveredMarker, setHoveredMarker] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const { containerRef, width: mapWidth, height: mapHeight } = useMapFrameSize()

  const displayLocations = locations || defaultLocations

  const landFill = isExecutive ? MAP_THEME.ocean : MAP_THEME.land
  const landStroke = isExecutive ? EXEC_THEME.stroke : MAP_THEME.border
  const landHoverFill = isExecutive ? MAP_THEME.ocean : MAP_THEME.landHover
  const landStrokeWidth = isExecutive ? 0.85 : 0.55

  const projectionConfig = useMemo(() => {
    const fit = fitWorldProjection(mapWidth, mapHeight)
    return { scale: fit.scale, center: fit.center }
  }, [mapWidth, mapHeight])

  const handleMouseMove = (e) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY })
  }

  return (
    <div
      ref={containerRef}
      className={`world-map-container${isExecutive ? " world-map-container--executive" : ""}`}
      style={{ height }}
      onMouseMove={handleMouseMove}
    >
      <ComposableMap
        width={mapWidth}
        height={mapHeight}
        projectionConfig={projectionConfig}
        style={{ width: '100%', height: '100%', background: MAP_THEME.ocean }}
        preserveAspectRatio={isExecutive ? "xMidYMid slice" : "xMidYMid meet"}
      >
        {isExecutive ? (
          <g className="rsm-static-map">
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={landFill}
                    stroke={landStroke}
                    strokeWidth={landStrokeWidth}
                    strokeOpacity={0.88}
                    style={{
                      default: { outline: 'none' },
                      hover: {
                        outline: 'none',
                        fill: landHoverFill,
                        stroke: EXEC_THEME.strokeHover,
                        strokeOpacity: 1,
                      },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>
            {displayLocations.map((location, index) => {
              const isSelected = selectedId && location.id === selectedId
              const isHovered = hoveredMarker === index
              const pinFill = isSelected ? EXEC_THEME.pinSelected : EXEC_THEME.pin

              return (
                <Marker
                  key={location.id || index}
                  coordinates={location.coordinates}
                  onClick={() => onMarkerClick && onMarkerClick(location)}
                  onMouseEnter={() => setHoveredMarker(index)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  style={{ cursor: onMarkerClick ? "pointer" : "default" }}
                >
                  <circle
                    r={isSelected ? 8 : isHovered ? 7 : 6}
                    fill={pinFill}
                    stroke={BRAND_NAVY}
                    strokeOpacity={0.45}
                    strokeWidth={1.1}
                    className={`map-marker ${isSelected ? "selected" : ""}${isExecutive ? " map-marker--executive" : ""}`}
                  />
                </Marker>
              )
            })}
          </g>
        ) : (
          <ZoomableGroup center={[20, 30]} zoom={1} minZoom={1} maxZoom={1} filterZoomEvent={() => false}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={MAP_THEME.land}
                    stroke={MAP_THEME.border}
                    strokeWidth={0.55}
                    strokeOpacity={MAP_THEME.borderOpacity}
                    style={{
                      default: { outline: "none" },
                      hover: {
                        outline: "none",
                        fill: MAP_THEME.landHover,
                        stroke: MAP_THEME.border,
                        strokeOpacity: Math.min(0.95, MAP_THEME.borderOpacity + 0.3),
                      },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>
            {displayLocations.map((location, index) => {
              const isSelected = selectedId && location.id === selectedId
              const isHovered = hoveredMarker === index
              const rt = typeof location.rating === "number" ? location.rating : Number(location.rating)
              const hasRating = Number.isFinite(rt) && rt > 0
              const ratingFill = hasRating ? (rt >= 4.5 ? "#4CAF50" : rt >= 4 ? "#FF9800" : "#f44336") : null
              const fill = isSelected ? selectedMarkerColor : ratingFill || markerColor

              return (
                <Marker
                  key={location.id || index}
                  coordinates={location.coordinates}
                  onClick={() => onMarkerClick && onMarkerClick(location)}
                  onMouseEnter={() => setHoveredMarker(index)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  style={{ cursor: onMarkerClick ? "pointer" : "default" }}
                >
                  <circle
                    r={isSelected ? 8 : isHovered ? 7 : 6}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className={`map-marker ${isSelected ? "selected" : ""}`}
                  />
                </Marker>
              )
            })}
          </ZoomableGroup>
        )}
      </ComposableMap>
      
      {/* Tooltip */}
      {showTooltip && hoveredMarker !== null && displayLocations[hoveredMarker] && (
        <div
          className={`map-tooltip${isExecutive ? " map-tooltip--executive" : ""}`}
          style={{
            left: tooltipPosition.x + 15,
            top: tooltipPosition.y - 30,
          }}
        >
          <div className="map-tooltip-name">{displayLocations[hoveredMarker].name}</div>
          {displayLocations[hoveredMarker].city && (
            <div className="map-tooltip-city">{displayLocations[hoveredMarker].city}</div>
          )}
          {displayLocations[hoveredMarker].rating && (
            <div className="map-tooltip-rating">
              Rating: {displayLocations[hoveredMarker].rating} ★
            </div>
          )}
          {displayLocations[hoveredMarker].fitLevel && (
            <div className="map-tooltip-fit">
              Fit: {displayLocations[hoveredMarker].fitLevel}%
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WorldMap
