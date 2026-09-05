import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import TrustSetupWizard from '../components/trust/TrustSetupWizard'
import '../styles/app-page.css'
import './QualityExcellence.css'

export default function TrustSetupPage() {
  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card" style={{ marginBottom: 12 }}>
          <Link className="app-page-back-link" to="/hub/partner">← Quoting</Link>
          <h1 className="app-page-title">Trust setup</h1>
          <p className="app-page-subtitle stx-text-wrap">
            Set your plant industry, add your primary certificate, choose what buyers may see, and publish once.
          </p>
        </div>
        <TrustSetupWizard />
      </div>
    </AppLayout>
  )
}
