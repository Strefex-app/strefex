import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import '../styles/app-page.css'

/** Community forum — linked from Management hub; fuller threads/discussions may follow later. */
export default function Forum() {
  const navigate = useNavigate()
  return (
    <AppLayout>
      <div className="app-page">
        <a
          className="app-page-back-link stx-click-feedback"
          href="/management"
          onClick={(e) => {
            e.preventDefault()
            navigate(-1)
          }}
        >
          <Icon name="arrow-left" size={16} /> Back
        </a>
        <div className="app-page-card" style={{ minWidth: 0 }}>
          <h1 className="app-page-title">Forum</h1>
          <p className="app-page-subtitle stx-text-wrap">
            Shared space for discussions and announcements across your organization.
          </p>
          <p className="app-page-body stx-text-wrap" style={{ marginTop: '0.75rem' }}>
            Threaded forums and integrations are planned. For structured help tickets, use Community Support from the main menu.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
