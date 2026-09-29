import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import ManagementModuleGrid, { moduleUnlocked } from '../components/management/ManagementModuleGrid'
import PeopleHrDashboard from '../components/management/PeopleHrDashboard'
import { KpiWidget, kpiChrome } from '../components/StxKpiWidget'
import { isManagementClusterId } from '../constants/managementPaths'
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
  return modules.filter((mod) => {
    if (!isSuperAdmin && isAuditor() && (mod.clusterId === 'sourcing' || mod.hideFromAuditors)) return false
    return (
      (!mod.auditorHubOnly || isSuperAdmin || isAuditor() || hasFeature('auditProProgram')) &&
      (!mod.superadminOnly || isSuperAdmin) &&
      (!mod.minRole || isSuperAdmin || hasRole(mod.minRole))
    )
  })
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
        {isPeopleCluster ? (
          <PeopleHrDashboard />
        ) : (
          <div className="mgmt-cluster-hero">
            <p className="mgmt-cluster-lead stx-text-wrap">{cluster.description}</p>
            <div
              className={`stx-indicator-strip home-dash__kpis mgmt-cluster-stats home-dash__kpis--${Math.min(stats.length, 5)}`}
              role="list"
              aria-label={`${cluster.label} metrics`}
            >
              {stats.map((stat, i) => (
                <KpiWidget
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  sub="Live from company records"
                  {...kpiChrome(i)}
                />
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
