import Icon from '../Icon'

const ModuleIcon = ({ icon }) => <Icon name={icon} size={22} />
const LockIcon = () => <Icon name="lock" size={16} className="mgmt-lock-icon" />

export function moduleUnlocked(mod, { isSuperAdmin, isAuditor, hasFeature }) {
  if (mod.id === 'auditors-hub') {
    return isSuperAdmin || isAuditor() || hasFeature('auditProProgram')
  }
  return !mod.featureKey || isSuperAdmin || hasFeature(mod.featureKey)
}

export default function ManagementModuleGrid({
  modules,
  authCtx,
  onNavigate,
  t,
  emptyMessage = 'No modules available.',
}) {
  if (!modules.length) {
    return <p className="mgmt-hub-empty stx-text-body">{emptyMessage}</p>
  }

  return (
    <div className="mgmt-hub-grid">
      {modules.map((mod) => {
        const isUnlocked = moduleUnlocked(mod, authCtx)
        return (
          <button
            key={mod.id}
            type="button"
            className={`mgmt-hub-card stx-click-feedback ${isUnlocked ? '' : 'mgmt-hub-locked'}`}
            onClick={() => {
              if (isUnlocked) onNavigate(mod.path)
              else onNavigate('/plans')
            }}
          >
            <div className="mgmt-hub-card-icon">
              <ModuleIcon icon={mod.icon} />
            </div>
            <div className="mgmt-hub-card-info">
              <div className="mgmt-hub-card-title">
                {mod.titleKey ? t(mod.titleKey) : mod.label}
                {!isUnlocked && <LockIcon />}
              </div>
              <p className="mgmt-hub-card-desc">
                {mod.descriptionKey ? t(mod.descriptionKey) : mod.description}
              </p>
            </div>
            {!isUnlocked && mod.planLabel ? (
              <div className="mgmt-hub-card-badge">{mod.planLabel}+ Plan</div>
            ) : null}
            {isUnlocked ? (
              <div className="mgmt-hub-card-arrow">
                <Icon name="chevron-right" size={20} />
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
