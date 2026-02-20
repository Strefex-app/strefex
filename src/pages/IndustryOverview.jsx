import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import '../styles/app-page.css'
import './IndustryOverview.css'

const INDUSTRY_LABELS = {
  automotive: 'Automotive Industry',
  machinery: 'Machinery Industry',
  electronics: 'Electronics Industry',
  medical: 'Medical Industry',
}

const IndustryOverview = () => {
  const navigate = useNavigate()
  const { industryId } = useParams()
  const title = INDUSTRY_LABELS[industryId] || `${industryId || 'Industry'}`
  const basePath = `/industry/${industryId}`

  const renderStars = (rating, total = 5) => {
    return Array.from({ length: total }, (_, i) => {
      const isFilled = i < Math.floor(rating)
      const isHalf = i === Math.floor(rating) && rating % 1 >= 0.5
      return (
        <span key={i} className="star-wrapper">
          <span className={`star ${isFilled ? 'filled' : ''}`}>★</span>
          {isHalf && (
            <span className="star half-filled" style={{ width: '50%' }}>★</span>
          )}
        </span>
      )
    })
  }

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            ← Back
          </a>
          <h2 className="app-page-title">{title}</h2>
          <p className="app-page-subtitle">Audit & Compliance — supplier audit and compliance status.</p>
        </div>

        <div className="app-page-card">
          <div className="dashboard-cards">
            <div className="card supplier-audit-card">
              <h3 className="card-title">Supplier Audit</h3>
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: '65%' }}></div>
                </div>
              </div>
              <div className="star-rating">
                {renderStars(3.5)}
                <span className="rating-text">3.5</span>
              </div>
            </div>

            <div className="card compliance-card">
              <h3 className="card-title">Compliance</h3>
              <div className="circular-progress">
                <svg className="progress-circle" viewBox="0 0 100 100">
                  <circle
                    className="progress-circle-bg"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e0e0e0"
                    strokeWidth="8"
                  />
                  <circle
                    className="progress-circle-fill"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#4CAF50"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - 0.75)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="progress-value">75%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default IndustryOverview
