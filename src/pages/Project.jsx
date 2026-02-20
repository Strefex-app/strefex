import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import '../styles/app-page.css'

export default function Project() {
  const navigate = useNavigate()
  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <h2 className="app-page-title">Project</h2>
          <p className="app-page-subtitle">Projects and spare parts management.</p>
          <p className="app-page-body">View and manage projects, Gantt, and spare parts.</p>
          <button
            type="button"
            className="app-page-action"
            onClick={() => navigate('/project-management')}
          >
            <span className="app-page-action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Spare Parts / Projects
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
