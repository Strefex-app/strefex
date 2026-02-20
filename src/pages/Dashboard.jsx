import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import WorldMap from '../components/WorldMap'
import MatchIndicator from '../components/MatchIndicator'
import SupplierRating from '../components/SupplierRating'
import ProgressIndicator from '../components/ProgressIndicator'
import '../styles/app-page.css'
import './Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate()
  const { industryId } = useParams()
  const backPath = industryId ? `/industry/${industryId}` : '/main-menu'
  const backLabel = industryId ? 'Back to Industry' : 'Back to Home'

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <a className="app-page-back-link" href={backPath} onClick={(e) => { e.preventDefault(); navigate(backPath) }}>
            ← {backLabel}
          </a>
          <h2 className="app-page-title">Industry Management</h2>
          <p className="app-page-subtitle">Map, match indicator, supplier rating.</p>
        </div>

        <div className="app-page-card dashboard-card-inner">
          <div className="dashboard-main">
            <div className="map-container">
              <WorldMap />
            </div>

            <div className="widgets-container">
              <div className="widget widget-top-left">
                <MatchIndicator />
              </div>

              <div className="widget widget-bottom-left">
                <ProgressIndicator />
              </div>

              <div className="widget widget-bottom-right">
                <SupplierRating />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default Dashboard
