import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import ManagementBreadcrumb from '../components/management/ManagementBreadcrumb'
import ManagementModuleGrid, { moduleUnlocked } from '../components/management/ManagementModuleGrid'
import PeopleHrDashboard from '../components/management/PeopleHrDashboard'
import { MANAGEMENT_OVERVIEW_PATH, isManagementClusterId } from '../constants/managementPaths'
import { getManagementCluster } from '../data/managementModuleGroups'
import { getClusterStatsForId, useManagementClusterStats } from '../hooks/useManagementClusterStats'
import { useSubscriptionStore } from '../services/featureFlags'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n/useTranslation'
import '../styles/app-page.css'
import '../styles/managementShell.css'
import '../pages/ManagementHub.css'
import './ManagementClusterPage.css'

function filterVisibleModules(modules, { isSuperAdmin, isAuditor, hasFeature, hasRole }) {
  return modules.filter(
    (mod) =>
      (!mod.auditorHubOnly || isSuperAdmin || isAuditor() || hasFeature('auditProProgram')) &&
      (!mod.superadminOnly || isSuperAdmin) &&
      (!mod.minRole || isSuperAdmin || hasRole(mod.minRole)),
  )
}

export default function ManagementClusterPage() {
  const { clusterId } = useParams()
  const navigate = useNavigate()
  const hasFeature = useSubscriptionStore((s) => s.hasFeature)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const hasRole = useAuthStore((s) => s.hasRole)
  const isAuditor = useAuthStore((s) => s.isAuditor)
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const clusterStatsMap = useManagementClusterStats()

  const cluster = getManagementCluster(clusterId)

  const authCtx = useMemo(
    () => ({ isSuperAdmin, isAuditor, hasFeature }),
    [isSuperAdmin, isAuditor, hasFeature],
  )

  const visibleModules = useMemo(() => {
    if (!cluster) return []
    const base = filterVisibleModules(cluster.modules, {
      isSuperAdmin,
      isAuditor,
      hasFeature,
      hasRole,
    })
    if (!searchQuery.trim()) return base
    const q = searchQuery.trim().toLowerCase()
    return base.filter((mod) => {
      const title = (mod.titleKey ? t(mod.titleKey) : mod.label).toLowerCase()
      const desc = (mod.descriptionKey ? t(mod.descriptionKey) : mod.description || '').toLowerCase()
      return title.includes(q) || desc.includes(q)
    })
  }, [cluster, hasFeature, hasRole, isAuditor, isSuperAdmin, searchQuery, t])

  if (!isManagementClusterId(clusterId) || !cluster) {
    return <Navigate to="/management" replace />
  }

  const stats = getClusterStatsForId(cluster.id, clusterStatsMap)
  const unlockedCount = visibleModules.filter((m) => moduleUnlocked(m, authCtx)).length
  const isPeopleCluster = cluster.id === 'people'

  return (
    <AppLayout>
      <div className="app-page mgmt-cluster-page">
        <ManagementBreadcrumb trail={[
          { label: 'Overview', to: MANAGEMENT_OVERVIEW_PATH },
          { label: cluster.label },
        ]} />

        {isPeopleCluster ? (
          <PeopleHrDashboard />
        ) : (
          <div className="mgmt-cluster-hero app-page-card">
            <div className="mgmt-cluster-hero__main">
              <div
                className="mgmt-cluster-hero__icon"
                style={{ background: `${cluster.color}18`, color: cluster.color }}
              >
                <Icon name={cluster.icon} size={28} />
              </div>
              <div className="min-width-0">
                <h1 className="app-page-title">{cluster.label}</h1>
                <p className="app-page-subtitle stx-text-wrap">{cluster.description}</p>
              </div>
            </div>
            <div className="mgmt-cluster-stats" role="list" aria-label={`${cluster.label} metrics`}>
              {stats.map((stat) => (
                <div key={stat.label} className="mgmt-cluster-stat" role="listitem">
                  <span className="mgmt-cluster-stat__value">{stat.value}</span>
                  <span className="mgmt-cluster-stat__label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mgmt-hub-tools-head">
          <h2 className="stx-text-section mgmt-hub-tools-title">
            {cluster.label} modules
            <span className="mgmt-cluster-module-count">
              {unlockedCount}
              {' '}
              available
            </span>
          </h2>
          <input
            type="search"
            className="mgmt-hub-search"
            placeholder={`Search in ${cluster.label}…`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={`Search ${cluster.label} modules`}
          />
        </div>

        <ManagementModuleGrid
          modules={visibleModules}
          authCtx={authCtx}
          onNavigate={navigate}
          t={t}
          emptyMessage={
            searchQuery.trim()
              ? 'No modules match your search in this area.'
              : 'No modules available in this area for your role.'
          }
        />
      </div>
    </AppLayout>
  )
}
