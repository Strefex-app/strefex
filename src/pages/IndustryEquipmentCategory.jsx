import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { getEquipmentForIndustryCategory } from '../data/equipmentByIndustryCategory'
import { getEquipmentCategoriesForIndustry } from '../data/equipmentCategoriesByIndustry'
import '../styles/app-page.css'

const INDUSTRY_LABELS = {
  automotive: 'Automotive',
  machinery: 'Machinery',
  electronics: 'Electronics',
  medical: 'Medical',
}

const IndustryEquipmentCategory = () => {
  const navigate = useNavigate()
  const { industryId, categoryId } = useParams()
  const equipment = getEquipmentForIndustryCategory(industryId, categoryId)
  const categories = getEquipmentCategoriesForIndustry(industryId)
  const category = categories.find((c) => c.id === categoryId) || { name: categoryId, description: '' }
  const industryTitle = INDUSTRY_LABELS[industryId] || industryId
  const basePath = `/industry/${industryId}/equipment/${categoryId}`

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            ← Back
          </a>
          <h2 className="app-page-title">{category.name}</h2>
          <p className="app-page-subtitle">{industryTitle} · Tap an equipment to see open source and database suppliers</p>
          {category.description && <p className="app-page-body" style={{ marginTop: 0 }}>{category.description}</p>}
        </div>

        <div className="app-page-card">
          <h2 className="app-page-title">Equipment</h2>
          <p className="app-page-subtitle">Select equipment to view suppliers.</p>
          <div className="app-page-list">
            {equipment.length === 0 ? (
              <div className="app-page-list-empty">
                No equipment in this category yet. Connect your database to load more.
              </div>
            ) : (
              equipment.map((item) => (
                <div
                  key={item.id}
                  className="app-page-list-item"
                  onClick={() => navigate(`${basePath}/${item.id}/suppliers`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`${basePath}/${item.id}/suppliers`)}
                >
                  <span className="app-page-list-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <div className="app-page-list-item-info">
                    <div className="app-page-list-item-title">{item.name}</div>
                    {item.description && <div className="app-page-list-item-desc">{item.description}</div>}
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

export default IndustryEquipmentCategory
