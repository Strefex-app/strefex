import { Link, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { resetDemoWorkspace } from '../services/demoAccountService'
import './DemoModeBanner.css'

/** Shown on every app page while the isolated presentation demo session is active. */
export default function DemoModeBanner({ onExit }) {
  const navigate = useNavigate()

  const handleReset = async () => {
    await resetDemoWorkspace()
  }

  const handleExit = () => {
    if (typeof onExit === 'function') onExit()
    else navigate('/login')
  }

  return (
    <div className="demo-mode-banner" role="status">
      <div className="demo-mode-banner__main">
        <Icon name="monitor" size={16} />
        <span className="stx-text-wrap">
          <strong>Demo mode</strong> — sample data in this browser only. Not connected to the live database or other tenants.
        </span>
      </div>
      <div className="demo-mode-banner__actions">
        <button type="button" className="demo-mode-banner__btn" onClick={() => void handleReset()}>
          Reset demo data
        </button>
        <Link to="/register" className="demo-mode-banner__btn demo-mode-banner__btn--primary">
          Create real account
        </Link>
        <button type="button" className="demo-mode-banner__btn demo-mode-banner__btn--ghost" onClick={handleExit}>
          Exit demo
        </button>
      </div>
    </div>
  )
}
