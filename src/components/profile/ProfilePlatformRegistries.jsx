import { Link } from 'react-router-dom'
import Icon from '../Icon'

/** Superadmin-only links to confidential platform buyer/supplier registries (Profile → Contact list). */
export default function ProfilePlatformRegistries() {
  return (
    <div className="prof-platform-registries">
      <div className="prof-platform-registries__head">
        <Icon name="building" size={18} />
        <div className="min-width-0" style={{ minWidth: 0 }}>
          <h4 className="prof-platform-registries__title">Platform registries</h4>
          <p className="prof-platform-registries__hint stx-text-wrap">
            Confidential superadmin lists. New buyer and manufacturer web signups are added here automatically.
          </p>
        </div>
      </div>
      <div className="prof-platform-registries__links">
        <Link to="/dashboard/buyer/platform-directory" className="prof-platform-registries__link stx-click-feedback">
          <Icon name="document" size={16} />
          <span>Buyer contact registry</span>
        </Link>
        <Link to="/dashboard/buyer/registered-suppliers" className="prof-platform-registries__link stx-click-feedback">
          <Icon name="vendors" size={16} />
          <span>Supplier registry</span>
        </Link>
      </div>
    </div>
  )
}
