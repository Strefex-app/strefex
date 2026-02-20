import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import '../styles/app-page.css'

export default function Resources() {
  const navigate = useNavigate()
  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <h2 className="app-page-title">Resources</h2>
          <p className="app-page-subtitle">Documents, materials, and learning resources.</p>
          <p className="app-page-body">Resources content — link to raw materials, equipment, and documents.</p>
          <button
            type="button"
            className="app-page-action"
            onClick={() => navigate('/industry/raw-materials')}
          >
            <span className="app-page-action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 7H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Raw materials
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
