import { Navigate, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import StrefexMachineDbPage from '../components/machineDb/StrefexMachineDbPage'
import { getMachineDbCatalog } from '../data/machineDbCatalogs'
import { useAuthStore } from '../store/authStore'
import '../styles/app-page.css'

export default function MachineDbCataloguePage() {
  const navigate = useNavigate()
  const { catalogueId } = useParams()
  const role = useAuthStore((s) => s.role)
  const catalog = getMachineDbCatalog(catalogueId)

  if (role !== 'superadmin') {
    return <Navigate to="/profile" replace />
  }

  if (!catalog) {
    return (
      <AppLayout>
        <div className="app-page">
          <button
            type="button"
            className="app-page-back-link"
            onClick={() => navigate('/profile')}
          >
            ← Back to Profile
          </button>
          <div className="app-page-card" style={{ textAlign: 'center', padding: 40 }}>
            <h2 className="stx-text-heading">Catalogue not found</h2>
            <p className="stx-text-body">The machine intelligence catalogue &quot;{catalogueId}&quot; was not found.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="app-page stx-mdb-page">
        <button
          type="button"
          className="app-page-back-link"
          onClick={() => navigate('/profile')}
        >
          ← Back to Profile
        </button>
        <h1 className="app-page-title">{catalog.shortName}</h1>
        <p className="app-page-subtitle">{catalog.title}</p>
        <StrefexMachineDbPage catalog={catalog} />
      </div>
    </AppLayout>
  )
}
