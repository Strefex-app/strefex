import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { getSuppliersForMaterial } from '../data/suppliersByMaterial'
import { MATERIALS_BY_CATEGORY } from '../data/materialsByCategory'
import '../styles/app-page.css'
import './MaterialSuppliers.css'

const CATEGORY_LABELS = { plastic: 'Plastic', metal: 'Metal', other: 'Other materials' }

const MaterialSuppliers = () => {
  const navigate = useNavigate()
  const { category, materialId } = useParams()
  const suppliers = getSuppliersForMaterial(materialId)
  const categoryTitle = CATEGORY_LABELS[category] || category
  const allMaterials = [
    ...(MATERIALS_BY_CATEGORY.plastic || []),
    ...(MATERIALS_BY_CATEGORY.metal || []),
    ...(MATERIALS_BY_CATEGORY.other || []),
  ]
  const material = allMaterials.find((m) => m.id === materialId) || { name: materialId, applications: '' }

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
          <h2 className="app-page-title">{material.name}</h2>
          <p className="app-page-subtitle">{categoryTitle} · Suppliers (open source & database)</p>
          {material.applications && <p className="app-page-body" style={{ marginTop: 0 }}>{material.applications}</p>}
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
          <p className="app-page-body" style={{ marginTop: 16, marginBottom: 0 }}>Connect your database to see your own supplier list here.</p>
        </div>
      </div>
    </AppLayout>
  )
}

export default MaterialSuppliers
