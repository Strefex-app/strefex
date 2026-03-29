import { Link } from 'react-router-dom'
import { hrSpacePath } from '../../constants/hrSpaceRoutes'
import { useTranslation } from '../../i18n/useTranslation'
import './HrModuleShell.css'

/**
 * Shared HR module chrome: back link, title, Plan / Track / Manage tabs.
 */
export function HrModuleShell({
  title,
  subtitle,
  tab,
  onTab,
  children,
  extra,
  tabs: tabsOverride,
}) {
  const { t } = useTranslation()
  const tabs = tabsOverride ?? [
    { id: 'plan', label: t('hrSpace.tabPlan', 'Plan') },
    { id: 'track', label: t('hrSpace.tabTrack', 'Track') },
    { id: 'manage', label: t('hrSpace.tabManage', 'Manage data') },
  ]
  return (
    <div className="hr-mod">
      <div className="hr-mod-header">
        <Link to={hrSpacePath()} className="hr-mod-back stx-click-feedback">
          ← {t('hrSpace.backToHrHub', 'Back to HR Space')}
        </Link>
        <h1 className="hr-mod-title">{title}</h1>
        {subtitle && <p className="hr-mod-sub">{subtitle}</p>}
        <nav className="hr-mod-tabs" aria-label="Module sections">
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              className={`hr-mod-tab ${tab === x.id ? 'hr-mod-tab--active' : ''}`}
              onClick={() => onTab(x.id)}
            >
              {x.label}
            </button>
          ))}
        </nav>
        {extra}
      </div>
      <div className="hr-mod-body">{children}</div>
    </div>
  )
}

export default HrModuleShell
