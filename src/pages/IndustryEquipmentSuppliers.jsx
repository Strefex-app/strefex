import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { getSuppliersForEquipment } from '../data/suppliersByEquipment'
import { getEquipmentForIndustryCategory } from '../data/equipmentByIndustryCategory'
import { getEquipmentCategoriesForIndustry } from '../data/equipmentCategoriesByIndustry'
import '../styles/app-page.css'
import './IndustryEquipmentSuppliers.css'

const INDUSTRY_LABELS = {
  automotive: 'Automotive',
  machinery: 'Machinery',
  electronics: 'Electronics',
  medical: 'Medical',
}

const IndustryEquipmentSuppliers = () => {
  const navigate = useNavigate()
  const { industryId, categoryId, equipmentId } = useParams()
  const suppliers = getSuppliersForEquipment(equipmentId)
  const equipmentList = getEquipmentForIndustryCategory(industryId, categoryId)
  const equipment = equipmentList.find((e) => e.id === equipmentId) || { name: equipmentId, description: '' }
  const categories = getEquipmentCategoriesForIndustry(industryId)
  const category = categories.find((c) => c.id === categoryId) || { name: categoryId }
  const industryTitle = INDUSTRY_LABELS[industryId] || industryId
  const basePath = `/industry/${industryId}/equipment/${categoryId}`

  const renderStars = (rating) => {
    const full = Math.floor(rating)
    const half = rating % 1 >= 0.5
    return (
      <span className="supplier-stars">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < full || (i === full && half) ? 'star filled' : 'star'}>★</span>
        ))}
        <span className="rating-num">{rating || '—'}</span>
      </span>
    )
  }

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            ← Back
          </a>
          <h2 className="app-page-title">{equipment.name}</h2>
          <p className="app-page-subtitle">{industryTitle} · {category.name} · Suppliers (open source & database)</p>
          {equipment.description && <p className="app-page-body" style={{ marginTop: 0 }}>{equipment.description}</p>}
        </div>

        <div className="app-page-card">
          <h2 className="app-page-title">Suppliers</h2>
          <p className="app-page-subtitle">Suppliers from <strong>open source</strong> and from <strong>your database</strong> (connect later).</p>
          <div className="suppliers-list">
            {suppliers.map((s) => (
              <div key={s.id} className="supplier-card">
                <div className="supplier-header">
                  <h3 className="supplier-name">{s.name}</h3>
                  <span className={`supplier-source-badge ${s.source}`}>{s.source}</span>
                </div>
                <div className="supplier-details">
                  <span className="supplier-country">{s.country}</span>
                  {renderStars(s.rating)}
                </div>
              </div>
            ))}
          </div>
          <p className="app-page-body" style={{ marginTop: 16, marginBottom: 0 }}>Connect your database to see your own equipment supplier list here.</p>
        </div>
      </div>
    </AppLayout>
  )
}

export default IndustryEquipmentSuppliers
