import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { MATERIALS_BY_CATEGORY } from '../data/materialsByCategory'
import '../styles/app-page.css'

const CATEGORY_LABELS = {
  plastic: 'Plastic',
  metal: 'Metal',
  other: 'Other materials',
}

const RawMaterialsCategory = () => {
  const navigate = useNavigate()
  const { category } = useParams()
  const title = CATEGORY_LABELS[category] || category || 'Materials'
  const materials = MATERIALS_BY_CATEGORY[category] || []

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            ← Back
          </a>
          <h2 className="app-page-title">{title}</h2>
          <p className="app-page-subtitle">Materials existing in the market. Tap a material to see suppliers.</p>
        </div>

        <div className="app-page-card">
          <h2 className="app-page-title">Materials</h2>
          <p className="app-page-subtitle">Select a material to view suppliers.</p>
          <div className="app-page-list">
            {materials.length === 0 ? (
              <div className="app-page-list-empty">
                No materials in this category yet. Connect your database to load more.
              </div>
            ) : (
              materials.map((material) => (
                <div
                  key={material.id}
                  className="app-page-list-item"
                  onClick={() => navigate(`/raw-materials/${category}/${material.id}/suppliers`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/raw-materials/${category}/${material.id}/suppliers`)}
                >
                  <span className="app-page-list-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7l12 5 10-5-10 5v10l-10-5 10 5 10-5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="8" y="10" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </span>
                  <div className="app-page-list-item-info">
                    <div className="app-page-list-item-title">{material.name}</div>
                    <div className="app-page-list-item-desc">{material.applications}</div>
                  </div>
                  <span className="app-page-list-item-arrow">→</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default RawMaterialsCategory
