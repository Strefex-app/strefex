import './ProgressIndicator.css'

const ProgressIndicator = () => {
  const progress = 45 // Percentage
  const value = 15
  
  const renderStars = (filled, total = 5) => {
    return Array.from({ length: total }, (_, i) => (
      <span key={i} className={`star ${i < filled ? 'filled' : ''}`}>
        ★
      </span>
    ))
  }

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <div className="progress-value">{value}</div>
        <div className="progress-gauge">
          <svg className="progress-svg" viewBox="0 0 200 100">
            <path
              d="M 20 80 A 60 60 0 0 1 180 80"
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M 20 80 A 60 60 0 0 1 180 80"
              fill="none"
              stroke="#4CAF50"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${progress * 1.6} 160`}
              strokeDashoffset="0"
            />
            {/* Tick marks */}
            {Array.from({ length: 6 }, (_, i) => {
              const angle = (i / 5) * 180 - 90
              const rad = (angle * Math.PI) / 180
              const x1 = 100 + 60 * Math.cos(rad)
              const y1 = 80 + 60 * Math.sin(rad)
              const x2 = 100 + 70 * Math.cos(rad)
              const y2 = 80 + 70 * Math.sin(rad)
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#999"
                  strokeWidth="2"
                />
              )
            })}
          </svg>
        </div>
      </div>
      
      <div className="progress-stars">
        <div className="stars-row">
          {renderStars(2)}
        </div>
        <div className="stars-row stars-row-small">
          {renderStars(3, 3)}
        </div>
      </div>
      
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      <div className="progress-label">
        <span>Autr</span>
        <div className="label-stars">
          {renderStars(3, 3)}
        </div>
      </div>
    </div>
  )
}

export default ProgressIndicator
