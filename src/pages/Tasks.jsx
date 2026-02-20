import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import '../styles/app-page.css'

export default function Tasks() {
  const navigate = useNavigate()
  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <h2 className="app-page-title">Tasks</h2>
          <p className="app-page-subtitle">Tasks that need your attention.</p>
          <p className="app-page-body">Tasks and to-dos — link to project management.</p>
          <button
            type="button"
            className="app-page-action"
            onClick={() => navigate('/project-management')}
          >
            <span className="app-page-action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 14h6M9 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Project Management
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
