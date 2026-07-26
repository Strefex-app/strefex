import { useTranslation } from '../../i18n/useTranslation'
import '../hr/HrModuleShell.css'

/**
 * Forge module chrome aligned with HR Space: title, tab strip.
 */
export default function ForgeModuleShell({
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
    { id: 'assess', label: t('forge.tabAssessment', 'Membership onboarding') },
  ]
  return (
    <div className="hr-mod">
      <div className="hr-mod-header">
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
