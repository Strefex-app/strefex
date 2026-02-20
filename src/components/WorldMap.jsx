import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import './WorldMap.css'

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

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
  height = "100%"
}) => {
  const [hoveredMarker, setHoveredMarker] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  
  const displayLocations = locations || defaultLocations

  const handleMouseMove = (e) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY })
  }

  return (
    <div className="world-map-container" style={{ height }} onMouseMove={handleMouseMove}>
      <ComposableMap
        projectionConfig={{
          scale: 147,
          center: [20, 30]
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#c8c8c8"
                  stroke="#a8a8a8"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#b8b8b8" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          {displayLocations.map((location, index) => {
            const isSelected = selectedId && location.id === selectedId
            const isHovered = hoveredMarker === index
            
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
                  fill={isSelected ? selectedMarkerColor : markerColor}
                  stroke="#fff"
                  strokeWidth={2}
                  className={`map-marker ${isSelected ? 'selected' : ''}`}
                />
                {/* Rating indicator if available */}
                {location.rating && (
                  <circle
                    r={3}
                    cy={-10}
                    fill={location.rating >= 4.5 ? '#4CAF50' : location.rating >= 4.0 ? '#FF9800' : '#f44336'}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                )}
              </Marker>
            )
          })}
        </ZoomableGroup>
      </ComposableMap>
      
      {/* Tooltip */}
      {showTooltip && hoveredMarker !== null && displayLocations[hoveredMarker] && (
        <div 
          className="map-tooltip"
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
