import { Link } from 'react-router-dom'
import { useTranslation } from '../../i18n/useTranslation'
import { forgeSpacePath } from '../../constants/forgeSpaceRoutes'
import '../hr/HrModuleShell.css'

/**
 * Forge module chrome aligned with HR Space: back link (Forge hub by default), title, tab strip.
 */
export default function ForgeModuleShell({
  title,
  subtitle,
  tab,
  onTab,
  children,
  extra,
  tabs: tabsOverride,
  hubBackHref,
  hubBackLabel,
}) {
  const { t } = useTranslation()
  const backTo = hubBackHref ?? forgeSpacePath()
  const backLabel = hubBackLabel ?? t('forge.backToForge', 'Back to Forge')
  const tabs = tabsOverride ?? [
    { id: 'assess', label: t('forge.tabAssessment', 'Membership onboarding') },
  ]
  return (
    <div className="hr-mod">
      <div className="hr-mod-header">
        <Link to={backTo} className="hr-mod-back stx-click-feedback">
          ← {backLabel}
        </Link>
        <h1 className="hr-mod-title">{title}</h1>
        {subtitle && <p className="hr-mod-sub">{subtitle}</p>}
        <nav className="hr-mod-tabs" aria-label="Forge sections">
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
