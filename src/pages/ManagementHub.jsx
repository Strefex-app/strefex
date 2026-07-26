import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import { useSubscriptionStore } from '../services/featureFlags'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n/useTranslation'
import {
  MANAGEMENT_MODULE_CLUSTERS,
  MANAGEMENT_MODULES,
  moduleMatchesSearch,
} from '../data/managementModuleGroups'
import { getClusterStatsForId, useManagementClusterStats } from '../hooks/useManagementClusterStats'
import ManagementModuleGrid, { moduleUnlocked } from '../components/management/ManagementModuleGrid'
import '../styles/app-page.css'
import './ManagementHub.css'
import AiInsightsCtaStrip from '../components/AiInsightsCtaStrip'
import ManagementDashboardMetrics from '../components/management/ManagementDashboardMetrics'
import '../styles/managementShell.css'

function filterVisibleModules(modules, { isSuperAdmin, isAuditor, hasFeature, hasRole }) {
  return modules.filter(
    (mod) =>
      (!mod.auditorHubOnly || isSuperAdmin || isAuditor() || hasFeature('auditProProgram')) &&
      (!mod.superadminOnly || isSuperAdmin) &&
      (!mod.minRole || isSuperAdmin || hasRole(mod.minRole)),
  )
}

export default function ManagementHub() {
  const navigate = useNavigate()
  const hasFeature = useSubscriptionStore((s) => s.hasFeature)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const hasRole = useAuthStore((s) => s.hasRole)
  const isAuditor = useAuthStore((s) => s.isAuditor)
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const clusterStatsMap = useManagementClusterStats()

  const authCtx = useMemo(
    () => ({ isSuperAdmin, isAuditor, hasFeature }),
    [isSuperAdmin, isAuditor, hasFeature],
  )

  const visibleClusters = useMemo(() => {
    return MANAGEMENT_MODULE_CLUSTERS.map((cluster) => ({
      ...cluster,
      modules: filterVisibleModules(cluster.modules, {
        isSuperAdmin,
        isAuditor,
        hasFeature,
        hasRole,
      }),
    })).filter((cluster) => cluster.modules.length > 0)
  }, [hasFeature, hasRole, isAuditor, isSuperAdmin])

  const searchModuleResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return filterVisibleModules(MANAGEMENT_MODULES, {
      isSuperAdmin,
      isAuditor,
      hasFeature,
      hasRole,
    }).filter((mod) => moduleMatchesSearch(mod, searchQuery, t))
  }, [hasFeature, hasRole, isAuditor, isSuperAdmin, searchQuery, t])

  const showSearchResults = searchQuery.trim().length > 0

  return (
    <AppLayout>
      <div className="app-page">
        <div className="page-header">
          <h1 className="page-title">Management</h1>
          <p className="page-subtitle">Choose an area, then open the module you need</p>
        </div>

        <ManagementDashboardMetrics />

        <AiInsightsCtaStrip context="management" />

        <div className="mgmt-hub-tools-head">
          <h2 className="stx-text-section mgmt-hub-tools-title">Management tools</h2>
          <input
            type="search"
            className="mgmt-hub-search"
            placeholder="Search all modules…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search management modules"
          />
        </div>

        {showSearchResults ? (
          searchModuleResults.length === 0 ? (
            <p className="mgmt-hub-empty stx-text-body">No modules match your search.</p>
          ) : (
            <ManagementModuleGrid
              modules={searchModuleResults}
              authCtx={authCtx}
              onNavigate={navigate}
              t={t}
            />
          )
        ) : (
          <div className="mgmt-cluster-widgets">
            {visibleClusters.map((cluster) => {
              const stats = getClusterStatsForId(cluster.id, clusterStatsMap)
              const unlocked = cluster.modules.filter((m) => moduleUnlocked(m, authCtx)).length
              return (
                <button
                  key={cluster.id}
                  type="button"
                  className="mgmt-cluster-widget stx-click-feedback"
                  onClick={() => navigate(cluster.path)}
                >
                  <div
                    className="mgmt-cluster-widget__icon"
                    style={{ background: `${cluster.color}18`, color: cluster.color }}
                  >
                    <Icon name={cluster.icon} size={26} />
                  </div>
                  <div className="mgmt-cluster-widget__body min-width-0">
                    <div className="mgmt-cluster-widget__title">{cluster.label}</div>
                    <p className="mgmt-cluster-widget__desc stx-text-wrap">{cluster.description}</p>
                    <div className="mgmt-cluster-widget__meta">
                      <span>{cluster.modules.length} modules</span>
                      <span aria-hidden>·</span>
                      <span>{unlocked} available</span>
                    </div>
                    {stats.length > 0 ? (
                      <div className="mgmt-cluster-widget__stats">
                        {stats.slice(0, 2).map((stat) => (
                          <span key={stat.label} className="mgmt-cluster-widget__chip">
                            <strong>{stat.value}</strong>
                            {' '}
                            {stat.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="mgmt-cluster-widget__arrow" aria-hidden>
                    <Icon name="chevron-right" size={22} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
