import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import '../styles/app-page.css'
import './RawMaterialsLanding.css'

const MATERIAL_CATEGORIES = [
  { id: 'plastic', label: 'Plastic', icon: 'plastic', description: 'Polymers, resins, and plastic materials for automotive, machining, electronics, medical' },
  { id: 'metal', label: 'Metal', icon: 'metal', description: 'Ferrous and non-ferrous metals, alloys for automotive, machining, electronics, medical' },
  { id: 'other', label: 'Other materials', icon: 'other', description: 'Other raw materials related to automotive, machining, electronics, medical' },
]

const INDUSTRY_TAGS = ['Automotive', 'Machinery', 'Electronics', 'Medical']

const RawMaterialsLanding = () => {
  const navigate = useNavigate()

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <a className="app-page-back-link stx-click-feedback" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            <Icon name="arrow-left" size={16} /> Back
          </a>
          <h2 className="app-page-title">Raw materials</h2>
          <p className="app-page-subtitle">Plastic, metal, and other materials for automotive, machining, electronics, and medical</p>
          <div className="industry-tags-section">
            <span className="tags-label">Related to:</span>
            <div className="industry-tags">
              {INDUSTRY_TAGS.map((tag) => (
                <span key={tag} className="industry-tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="app-page-card">
          <h2 className="app-page-title">Material classifications</h2>
          <p className="app-page-subtitle">Tap a category to see materials and suppliers.</p>
          <div className="app-page-list">
            {MATERIAL_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="app-page-list-item"
                onClick={() => navigate(`/raw-materials/${cat.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/raw-materials/${cat.id}`)}
              >
                <span className="app-page-list-item-icon"><Icon name={cat.icon} size={20} /></span>
                <div className="app-page-list-item-info">
                  <div className="app-page-list-item-title">{cat.label}</div>
                  <div className="app-page-list-item-desc">{cat.description}</div>
                </div>
                <span className="app-page-list-item-arrow">→</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default RawMaterialsLanding
