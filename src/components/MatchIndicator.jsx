import './MatchIndicator.css'

const MatchIndicator = () => {
  // Value between 0-100, where 0 is left (green) and 100 is right (gray)
  const value = 65 // This would come from props/API in production
  
  const angle = (value / 100) * 180 - 90 // Convert to angle (-90 to 90 degrees)
  const rotation = `rotate(${angle}deg)`

  return (
    <div className="match-indicator">
      <h3 className="widget-title">Match Indicator</h3>
      <div className="gauge-container">
        <svg className="gauge-svg" viewBox="0 0 200 120">
          {/* Background arc (gray) */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Green arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 100 20"
            fill="none"
            stroke="#4CAF50"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Needle */}
          <g transform={`translate(100, 100) ${rotation} translate(-100, -100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="30"
              stroke="#333"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              cx="100"
              cy="100"
              r="8"
              fill="#333"
            />
          </g>
        </svg>
      </div>
      <div className="gauge-label">Automotive</div>
    </div>
  )
}

export default MatchIndicator
