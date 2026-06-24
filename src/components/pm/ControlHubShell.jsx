import { Link } from 'react-router-dom'
import '../../styles/projectControl.css'

const MODULE_META = {
  'control-hub': {
    label: 'Management Control',
    tone: 'hub',
    description: 'Cross-module view — programs, projects, and procurement in one place',
  },
  'project-management': {
    label: 'Project Management',
    tone: 'pm',
    description: 'Programs, projects, budget baseline, schedule, and cost control',
  },
  procurement: {
    label: 'Procurement',
    tone: 'proc',
    description: 'Opportunities, quotations, purchase orders, and supplier commitments',
  },
}

function scopeHref(scope) {
  if (!scope) return null
  if (scope.type === 'program' && scope.programId) {
    return `/project-management/program/${scope.programId}`
  }
  if (scope.type === 'project' && scope.projectId) {
    return `/project-management/project/${scope.projectId}/control`
  }
  return null
}

function registerHref(scope) {
  const params = new URLSearchParams({ tab: 'traceability' })
  if (scope?.type === 'project' && scope.projectId) params.set('projectId', scope.projectId)
  if (scope?.type === 'program' && scope.programId) params.set('programId', scope.programId)
  return `/procurement?${params.toString()}`
}

/**
 * Shared shell: module context, scope pill, and cross-module navigation.
 */
export default function ControlHubShell({
  module = 'control-hub',
  scope = { type: 'company', label: 'Company-wide' },
  activeTab = 'overview',
  children,
}) {
  const mod = MODULE_META[module] || MODULE_META['control-hub']
  const scopeLink = scopeHref(scope)

  const tabs = [
    { id: 'overview', label: 'Control hub', to: '/project-control' },
    { id: 'management', label: 'Management', to: '/management' },
    { id: 'portfolio', label: 'Portfolio', to: '/project-management?view=portfolio' },
    {
      id: 'register',
      label: 'Trace register',
      to: registerHref(scope),
    },
  ]

  if (scope?.type === 'program' && scope.programId) {
    tabs.splice(2, 0, {
      id: 'program',
      label: scope.shortLabel || 'Program',
      to: `/project-management/program/${scope.programId}`,
    })
  }

  if (scope?.type === 'project' && scope.projectId) {
    tabs.splice(2, 0, {
      id: 'project',
      label: scope.shortLabel || 'Project control',
      to: `/project-management/project/${scope.projectId}/control`,
    })
  }

  return (
    <div className="pch-shell">
      <div className="pch-context">
        <div className="pch-context__left min-width-0">
          <span className={`pch-module-badge pch-module-badge--${mod.tone}`}>{mod.label}</span>
          <p className="pch-context__desc stx-text-wrap">{mod.description}</p>
        </div>
        <div className="pch-context__scope">
          <span className="pch-scope-label">Data scope</span>
          {scopeLink ? (
            <Link to={scopeLink} className="pch-scope-pill pch-scope-pill--link">
              {scope.label}
            </Link>
          ) : (
            <span className="pch-scope-pill">{scope.label}</span>
          )}
        </div>
      </div>

      <nav className="pch-nav" aria-label="Control hub navigation">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.to}
            className={`pch-nav__tab${activeTab === tab.id ? ' is-active' : ''}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="pch-ownership-legend" aria-label="Module ownership">
        <span className="pch-ownership-legend__title">Where data lives</span>
        <span className="pch-ownership-item">
          <span className="pch-module-badge pch-module-badge--pm pch-module-badge--xs">PM</span>
          Program &amp; project numbers, budget, schedule
        </span>
        <span className="pch-ownership-item">
          <span className="pch-module-badge pch-module-badge--proc pch-module-badge--xs">Procurement</span>
          Opportunity, quotation, PO, supplier refs
        </span>
      </div>

      {children}
    </div>
  )
}
