import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import '../styles/app-page.css'

/**
 * 404 — uses AppLayout so navigation and theme match the rest of the app.
 */
export default function NotFoundPage() {
  return (
    <AppLayout>
      <div className="app-page" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <h1 className="app-page-title" style={{ fontSize: '3rem', marginBottom: 8 }}>
          404
        </h1>
        <p className="app-page-subtitle" style={{ marginBottom: 24 }}>
          Page not found.
        </p>
        <Link to="/main-menu" className="app-page-btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
          Back to home
        </Link>
      </div>
    </AppLayout>
  )
}
