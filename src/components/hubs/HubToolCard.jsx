import { Link } from 'react-router-dom'
import Icon from '../Icon'

/** Single actionable tile on Buyers / Partners hub pages. */
export default function HubToolCard({ to, icon, iconStyle, title, description, badge }) {
  return (
    <Link to={to} className="hub-landing__card stx-click-feedback">
      <span className="hub-landing__card-icon" style={iconStyle}>
        <Icon name={icon} size={22} />
      </span>
      <h3 className="hub-landing__card-title">
        {title}
        {badge && <span className="hub-landing__badge">{badge}</span>}
      </h3>
      <p className="hub-landing__card-desc stx-text-wrap">{description}</p>
    </Link>
  )
}
