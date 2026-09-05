import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { geoNaturalEarth1 } from 'd3-geo'
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Line,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps'
import './WorldMap.css'

/** Day defaults for Intelligent Sourcing `<supplier-map>` (overridden by --map-* CSS vars). */
export const SOURCING_MAP_COLORS = {
  ocean: '#EEF0F2',
  land: '#DCE1E6',
  landStroke: '#F6F7F8',
  graticule: '#DDE1E4',
  chartBorder: '#E2E5E7',
  plant: '#0A2540',
  plantStroke: '#ffffff',
  plantLabel: '#0A2540',
  lane: '#0A2540',
  laneFaint: '#7A8794',
  tipBg: '#0A2540',
  tipMuted: '#9DB1C8',
  tipText: '#ffffff',
  pinStroke: '#ffffff',
  pinStrokeHot: '#0A2540',
  legendText: '#6E767C',
}

/** Pin tones — status colors stay readable in day and night */
export const MAP_PIN_TONES = {
  low: { fill: '#5FB85C', ring: 'rgba(95,184,92,.25)', label: 'Low risk' },
  medium: { fill: '#E0A23B', ring: 'rgba(224,162,59,.25)', label: 'Watch' },
  high: { fill: '#D2483F', ring: 'rgba(210,72,63,.25)', label: 'High risk' },
}

const FALLBACK = {
  ocean: SOURCING_MAP_COLORS.ocean,
  land: SOURCING_MAP_COLORS.land,
  landStroke: SOURCING_MAP_COLORS.landStroke,
  graticule: SOURCING_MAP_COLORS.graticule,
  plant: SOURCING_MAP_COLORS.plant,
  plantStroke: SOURCING_MAP_COLORS.plantStroke,
  plantLabel: SOURCING_MAP_COLORS.plantLabel,
  lane: SOURCING_MAP_COLORS.lane,
  laneFaint: SOURCING_MAP_COLORS.laneFaint,
  tipBg: SOURCING_MAP_COLORS.tipBg,
  tipMuted: SOURCING_MAP_COLORS.tipMuted,
  tipText: SOURCING_MAP_COLORS.tipText,
  pinStroke: SOURCING_MAP_COLORS.pinStroke,
  pinStrokeHot: SOURCING_MAP_COLORS.pinStrokeHot,
}

function readCssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/** Read map canvas from theme tokens (day steel / night graphite). */
function readMapPalette() {
  return {
    ocean: readCssVar('--map-ocean', FALLBACK.ocean),
    land: readCssVar('--map-land', FALLBACK.land),
    landStroke: readCssVar('--map-land-stroke', FALLBACK.landStroke),
    graticule: readCssVar('--map-graticule', FALLBACK.graticule),
    plant: readCssVar('--map-plant', FALLBACK.plant),
    plantStroke: readCssVar('--map-plant-stroke', FALLBACK.plantStroke),
    plantLabel: readCssVar('--map-plant-label', FALLBACK.plantLabel),
    lane: readCssVar('--map-lane', FALLBACK.lane),
    laneFaint: readCssVar('--map-lane-faint', FALLBACK.laneFaint),
    tipBg: readCssVar('--map-tip-bg', FALLBACK.tipBg),
    tipMuted: readCssVar('--map-tip-muted', FALLBACK.tipMuted),
    tipText: readCssVar('--map-tip-text', FALLBACK.tipText),
    pinStroke: readCssVar('--map-pin-stroke', FALLBACK.pinStroke),
    pinStrokeHot: readCssVar('--map-pin-stroke-hot', FALLBACK.pinStrokeHot),
    graticuleWidth: Number.parseFloat(readCssVar('--map-graticule-width', '0.6')) || 0.6,
  }
}

function useMapPalette() {
  const [palette, setPalette] = useState(() => readMapPalette())

  useEffect(() => {
    const update = () => setPalette(readMapPalette())
    update()
    const root = document.documentElement
    const mo = new MutationObserver(update)
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    window.addEventListener('themechange', update)
    return () => {
      mo.disconnect()
      window.removeEventListener('themechange', update)
    }
  }, [])

  return palette
}

/** Match supplier-map risk / fit / cap tone rules. */
export function toneKeyForLocation(loc, metric = 'risk') {
  if (!loc) return 'medium'
  if (loc.tone === 'low' || loc.tone === 'medium' || loc.tone === 'high') return loc.tone
  const risk = Number(loc.riskLevel ?? loc.risk)
  const fit = Number(loc.fitLevel ?? loc.fit)
  const cap = Number(loc.capacityLevel ?? loc.cap)
  if (metric === 'fit' && Number.isFinite(fit)) {
    if (fit >= 82) return 'low'
    if (fit >= 70) return 'medium'
    return 'high'
  }
  if (metric === 'cap' && Number.isFinite(cap)) {
    if (cap <= 80) return 'low'
    if (cap <= 92) return 'medium'
    return 'high'
  }
  if (Number.isFinite(risk)) {
    if (risk < 28) return 'low'
    if (risk < 48) return 'medium'
    return 'high'
  }
  return 'medium'
}

function pinRadius(loc) {
  const spend = Number(loc?.spend)
  if (Number.isFinite(spend) && spend > 0) return 5 + Math.sqrt(spend) * 2.1
  const count = Number(loc?.count)
  if (Number.isFinite(count) && count > 1) return 5 + Math.sqrt(count) * 1.4
  return 6.5
}

function makeFittedProjection(width, height) {
  const w = Math.max(2, Math.floor(width))
  const h = Math.max(2, Math.floor(height))
  const padX = Math.min(14, Math.max(1, Math.floor(w * 0.014)))
  const padY = Math.min(10, Math.max(1, Math.floor(h * 0.02)))
  return geoNaturalEarth1().fitExtent(
    [[padX, padY], [w - padX, h - padY]],
    { type: 'Sphere' },
  )
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
        prev.width === width && prev.height === height ? prev : { width, height },
      )
    }

    update()
    const ro = new ResizeObserver(() => update())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { containerRef, ...size }
}

const viteBase = import.meta.env.BASE_URL || '/'
const geoUrl = `${viteBase.endsWith('/') ? viteBase : `${viteBase}/`}geo/ne_110m_admin_0_countries.geojson`

const defaultLocations = [
  { name: 'New York', coordinates: [-74.006, 40.7128], riskLevel: 22 },
  { name: 'London', coordinates: [-0.1276, 51.5074], riskLevel: 35 },
  { name: 'Tokyo', coordinates: [139.6503, 35.6762], riskLevel: 55 },
  { name: 'Sydney', coordinates: [151.2093, -33.8688], riskLevel: 18 },
  { name: 'Berlin', coordinates: [13.405, 52.52], riskLevel: 40 },
  { name: 'Singapore', coordinates: [103.8198, 1.3521], riskLevel: 28 },
]

const DEFAULT_LAND = {
  ocean: '#EEF0F2',
  land: '#1E3054',
  landHover: '#2A3F6B',
  border: '#F7D794',
  borderOpacity: 0.55,
}

const WorldMap = ({
  locations = null,
  plantLocation = null,
  onMarkerClick = null,
  selectedId = null,
  showTooltip = true,
  markerColor = '#4CAF50',
  selectedMarkerColor = '#2196F3',
  height = '100%',
  variant = 'default',
  metric = 'risk',
  showLane = true,
  /** Multi-lane plant→supplier overlays: { id, from, to, color, label, emphasize } */
  lanes = null,
  /** Override SVG preserveAspectRatio (`meet` keeps the map inside the viewport). */
  fit = null,
}) => {
  const isExecutive = variant === 'executive' || variant === 'sourcing'
  const aspect = fit || (isExecutive ? 'xMidYMid slice' : 'xMidYMid meet')
  const palette = useMapPalette()
  const [hoveredMarker, setHoveredMarker] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const { containerRef, width: mapWidth, height: mapHeight } = useMapFrameSize()

  const displayLocations = locations || defaultLocations

  const selectedLoc = useMemo(() => {
    if (!selectedId) return null
    return displayLocations.find((l) => l.id === selectedId) || null
  }, [displayLocations, selectedId])

  const hotLoc = useMemo(() => {
    if (hoveredMarker != null) return displayLocations[hoveredMarker] || null
    return selectedLoc
  }, [hoveredMarker, displayLocations, selectedLoc])

  const projection = useMemo(
    () => makeFittedProjection(mapWidth, mapHeight),
    [mapWidth, mapHeight],
  )

  const handleMouseMove = (e) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY })
  }

  const plantCoords = plantLocation?.coordinates
  const laneTo = hotLoc?.coordinates
  const hasLaneList = Array.isArray(lanes) && lanes.length > 0
  const showStrongLane = Boolean(
    isExecutive && showLane && plantCoords && laneTo && !hasLaneList,
  )

  return (
    <div
      ref={containerRef}
      className={`world-map-container${isExecutive ? ' world-map-container--executive' : ''}`}
      style={{ height, background: isExecutive ? palette.ocean : DEFAULT_LAND.ocean }}
      onMouseMove={handleMouseMove}
    >
      <ComposableMap
        width={mapWidth}
        height={mapHeight}
        projection={isExecutive ? projection : 'geoEqualEarth'}
        projectionConfig={isExecutive ? undefined : { scale: 147, center: [20, 10] }}
        style={{
          width: '100%',
          height: '100%',
          background: isExecutive ? palette.ocean : DEFAULT_LAND.ocean,
        }}
        preserveAspectRatio={aspect}
      >
        {isExecutive ? (
          <g className="rsm-static-map">
            <Graticule
              stroke={palette.graticule}
              strokeWidth={palette.graticuleWidth ?? 0.6}
              step={[10, 10]}
              fill="transparent"
            />
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={palette.land}
                    stroke={palette.landStroke}
                    strokeWidth={0.7}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: palette.land },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {hasLaneList
              ? lanes.map((lane, i) => {
                const from = lane.from || plantCoords
                const to = lane.to
                if (!from || !to) return null
                const mid = [
                  (Number(from[0]) + Number(to[0])) / 2,
                  (Number(from[1]) + Number(to[1])) / 2,
                ]
                const hot = Boolean(lane.emphasize)
                  || (hotLoc && lane.toId && hotLoc.id === lane.toId)
                return (
                  <g key={lane.id || `lane-${i}`}>
                    <Line
                      from={from}
                      to={to}
                      stroke={lane.color || (hot ? palette.lane : palette.laneFaint)}
                      strokeWidth={hot ? 2.2 : 1.4}
                      strokeLinecap="round"
                      strokeDasharray="6 5"
                      strokeOpacity={hot ? 1 : 0.72}
                    />
                    {lane.label ? (
                      <Marker coordinates={mid}>
                        <rect
                          x={-28}
                          y={-8}
                          width={56}
                          height={14}
                          rx={2}
                          fill={palette.tipBg}
                          stroke="rgba(255,255,255,0.14)"
                          strokeWidth={0.5}
                          opacity={0.96}
                        />
                        <text
                          textAnchor="middle"
                          y={2.5}
                          className="map-lane-label"
                          fill={palette.tipText || '#fff'}
                          fontSize={8}
                          fontWeight={600}
                        >
                          {lane.label}
                        </text>
                      </Marker>
                    ) : null}
                  </g>
                )
              })
              : null}

            {showStrongLane ? (
              <Line
                from={plantCoords}
                to={laneTo}
                stroke={palette.lane}
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="6 5"
              />
            ) : null}

            {displayLocations.map((location, index) => {
              const isSelected = selectedId && location.id === selectedId
              const isHovered = hoveredMarker === index
              const isPlantMarker = location.marker === 'plant' || location.plantMarker
              const tone = MAP_PIN_TONES[toneKeyForLocation(location, metric)]
              const fill = location.pinColor || (isPlantMarker ? palette.plant : tone.fill)
              const ring = location.pinRing || tone.ring
              const r = pinRadius(location)
              const label = location.label || location.name
              const labelDy = Number.isFinite(Number(location.labelDy))
                ? Number(location.labelDy)
                : (isPlantMarker ? ((index % 2 === 0) ? -13 : 22) : -13)

              return (
                <Marker
                  key={location.id || index}
                  coordinates={location.coordinates}
                  onClick={() => onMarkerClick && onMarkerClick(location)}
                  onMouseEnter={() => setHoveredMarker(index)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  style={{ cursor: onMarkerClick ? 'pointer' : 'default' }}
                >
                  {isPlantMarker ? (
                    <>
                      <rect
                        x={-7}
                        y={-7}
                        width={14}
                        height={14}
                        rx={2}
                        fill={fill}
                        stroke={isSelected || isHovered ? palette.pinStrokeHot : palette.plantStroke}
                        strokeWidth={isSelected || isHovered ? 2.4 : 2}
                        className={`map-marker map-marker--executive ${isSelected ? 'selected' : ''}`}
                      />
                      {label ? (
                        <text
                          y={labelDy}
                          textAnchor="middle"
                          className="map-plant-label"
                          fill={palette.plantLabel}
                        >
                          {String(label).toUpperCase()}
                        </text>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <circle r={r + 7} fill={ring} className="map-marker-halo" />
                      <circle
                        r={r}
                        fill={fill}
                        stroke={isSelected || isHovered ? palette.pinStrokeHot : palette.pinStroke}
                        strokeWidth={isSelected || isHovered ? 2.6 : 1.6}
                        className={`map-marker map-marker--executive ${isSelected ? 'selected' : ''}`}
                      />
                    </>
                  )}
                </Marker>
              )
            })}

            {plantCoords ? (
              <Marker coordinates={plantCoords}>
                <rect
                  x={-7}
                  y={-7}
                  width={14}
                  height={14}
                  rx={2}
                  fill={palette.plant}
                  stroke={palette.plantStroke}
                  strokeWidth={2}
                />
                {plantLocation?.name ? (
                  <text
                    y={-13}
                    textAnchor="middle"
                    className="map-plant-label"
                    fill={palette.plantLabel}
                  >
                    {String(plantLocation.name).toUpperCase()}
                  </text>
                ) : null}
              </Marker>
            ) : null}
          </g>
        ) : (
          <ZoomableGroup center={[20, 30]} zoom={1} minZoom={1} maxZoom={1} filterZoomEvent={() => false}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={DEFAULT_LAND.land}
                    stroke={DEFAULT_LAND.border}
                    strokeWidth={0.55}
                    strokeOpacity={DEFAULT_LAND.borderOpacity}
                    style={{
                      default: { outline: 'none' },
                      hover: {
                        outline: 'none',
                        fill: DEFAULT_LAND.landHover,
                        stroke: DEFAULT_LAND.border,
                        strokeOpacity: Math.min(0.95, DEFAULT_LAND.borderOpacity + 0.3),
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
              const rt = typeof location.rating === 'number' ? location.rating : Number(location.rating)
              const hasRating = Number.isFinite(rt) && rt > 0
              const ratingFill = hasRating ? (rt >= 4.5 ? '#4CAF50' : rt >= 4 ? '#FF9800' : '#f44336') : null
              const fill = isSelected ? selectedMarkerColor : ratingFill || markerColor

              return (
                <Marker
                  key={location.id || index}
                  coordinates={location.coordinates}
                  onClick={() => onMarkerClick && onMarkerClick(location)}
                  onMouseEnter={() => setHoveredMarker(index)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  style={{ cursor: onMarkerClick ? 'pointer' : 'default' }}
                >
                  <circle
                    r={isSelected ? 8 : isHovered ? 7 : 6}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className={`map-marker ${isSelected ? 'selected' : ''}`}
                  />
                </Marker>
              )
            })}
          </ZoomableGroup>
        )}
      </ComposableMap>

      {showTooltip && hoveredMarker !== null && displayLocations[hoveredMarker] && (
        <div
          className={`map-tooltip${isExecutive ? ' map-tooltip--executive' : ''}`}
          style={{
            left: tooltipPosition.x + 15,
            top: tooltipPosition.y - 30,
            ...(isExecutive
              ? { background: palette.tipBg, color: '#fff', borderColor: 'transparent' }
              : null),
          }}
        >
          <div className="map-tooltip-name">{displayLocations[hoveredMarker].name}</div>
          {displayLocations[hoveredMarker].city ? (
            <div
              className="map-tooltip-city"
              style={isExecutive ? { color: palette.tipMuted } : undefined}
            >
              {displayLocations[hoveredMarker].city}
              {displayLocations[hoveredMarker].country
                && displayLocations[hoveredMarker].country !== '—'
                ? `, ${displayLocations[hoveredMarker].country}`
                : ''}
            </div>
          ) : null}
          {Number.isFinite(Number(displayLocations[hoveredMarker].count)) ? (
            <div
              className="map-tooltip-fit"
              style={isExecutive ? { color: palette.tipMuted } : undefined}
            >
              {Number(displayLocations[hoveredMarker].count)} employee
              {Number(displayLocations[hoveredMarker].count) === 1 ? '' : 's'}
            </div>
          ) : null}
          {isExecutive && displayLocations[hoveredMarker].relationLabel ? (
            <div className="map-tooltip-fit" style={{ color: '#fff' }}>
              {displayLocations[hoveredMarker].relationLabel}
              {displayLocations[hoveredMarker].transitLabel
                ? ` · ${displayLocations[hoveredMarker].transitLabel}`
                : ''}
            </div>
          ) : null}
          {isExecutive && !displayLocations[hoveredMarker].relationLabel
            && Number.isFinite(Number(displayLocations[hoveredMarker].riskLevel)) ? (
            <div className="map-tooltip-fit" style={{ color: '#fff' }}>
              risk {displayLocations[hoveredMarker].riskLevel}
              {Number.isFinite(Number(displayLocations[hoveredMarker].fitLevel))
                ? ` · fit ${displayLocations[hoveredMarker].fitLevel}`
                : ''}
            </div>
          ) : null}
          {!isExecutive && displayLocations[hoveredMarker].rating ? (
            <div className="map-tooltip-rating">
              Rating: {displayLocations[hoveredMarker].rating} ★
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}


export default WorldMap
