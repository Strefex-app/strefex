import { useState } from 'react'
import './DonutChart.css'

export default function DonutChart({ value = 0, label = '', color = 'var(--color-primary)', size = 80, onClick, tooltip, details }) {
  const [showDetails, setShowDetails] = useState(false)
  const pct = Math.min(100, Math.max(0, value))
  const clickable = !!(onClick || (details && details.length > 0))

  const handleClick = () => {
    if (onClick) { onClick(); return }
    if (details && details.length > 0) setShowDetails(true)
  }

  return (
    <>
      <div
        className={`stx-donut ${clickable ? 'stx-donut-clickable' : ''}`}
        style={{ '--pct': `${pct}%`, '--ring-color': color, width: size, height: size }}
        onClick={clickable ? handleClick : undefined}
        title={tooltip || `${label}: ${pct}%`}
      >
        <span className="stx-donut-val">{Math.round(pct)}%</span>
      </div>

      {showDetails && details && (
        <div className="stx-donut-overlay" onClick={() => setShowDetails(false)}>
          <div className="stx-donut-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stx-donut-modal-header">
              <h4>{label} — Breakdown</h4>
              <button className="stx-donut-modal-close" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="stx-donut-modal-body">
              {pct < 100 && (
                <div className="stx-donut-gap-banner">
                  <span className="stx-donut-gap-val">{(100 - pct).toFixed(1)}%</span>
                  <span>gap to target</span>
                </div>
              )}
              <div className="stx-donut-details">
                {details.map((d, i) => (
                  <div key={i} className="stx-donut-detail-row">
                    <span className="stx-donut-detail-dot" style={{ background: d.color || color }} />
                    <span className="stx-donut-detail-label">{d.label}</span>
                    <span className="stx-donut-detail-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
