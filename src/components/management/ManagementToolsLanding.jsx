import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSubscriptionStore } from '../../services/featureFlags'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from '../../i18n/useTranslation'
import {
  MANAGEMENT_MODULE_CLUSTERS,
  MANAGEMENT_MODULES,
  moduleMatchesSearch,
} from '../../data/managementModuleGroups'
import { getClusterStatsForId, useManagementClusterStats } from '../../hooks/useManagementClusterStats'
import ManagementModuleGrid, { moduleUnlocked } from './ManagementModuleGrid'
import ManagementClusterWidgets from './ManagementClusterWidgets'
import useCompanyDepartments from '../../hooks/useCompanyDepartments'
import useHrSpaceStore from '../../store/hrSpaceStore'
import useIatfControlStore from '../../store/iatfControlStore'
import { useProjectStore } from '../../store/projectStore'
import useRfqStore from '../../store/rfqStore'
import { searchCompanyRecords } from '../../utils/companySearch'
import '../../styles/app-page.css'
import '../../pages/ManagementHub.css'
import AiInsightsCtaStrip from '../AiInsightsCtaStrip'
import ManagementDashboardMetrics from './ManagementDashboardMetrics'
import '../../styles/managementShell.css'

function filterVisibleModules(modules, { isSuperAdmin, isAuditor, hasFeature, hasRole }) {
  return modules.filter(
    (mod) =>
      (!mod.auditorHubOnly || isSuperAdmin || isAuditor() || hasFeature('auditProProgram')) &&
      (!mod.superadminOnly || isSuperAdmin) &&
      (!mod.minRole || isSuperAdmin || hasRole(mod.minRole)),
  )
}

export default function ManagementToolsLanding({
  title = 'Management',
  subtitle = 'Choose an area, then open the module you need',
  toolsHeading = 'Management tools',
}) {
  const navigate = useNavigate()
  const hasFeature = useSubscriptionStore((s) => s.hasFeature)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const hasRole = useAuthStore((s) => s.hasRole)
  const isAuditor = useAuthStore((s) => s.isAuditor)
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const clusterStatsMap = useManagementClusterStats()
  const departments = useCompanyDepartments()
  const employees = useHrSpaceStore((s) => s.employees)
  const documents = useIatfControlStore((s) => s.documents)
  const folders = useIatfControlStore((s) => s.folders)
  const parts = useIatfControlStore((s) => s.parts)
  const lots = useIatfControlStore((s) => s.lots)
  const ncrs = useIatfControlStore((s) => s.ncrs)
  const projects = useProjectStore((s) => s.projects)
  const rfqs = useRfqStore((s) => s.rfqs)

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

  const searchRecordResults = useMemo(
    () => searchCompanyRecords(searchQuery, {
      documents, folders, parts, lots, ncrs, employees, projects, rfqs, departments,
    }),
    [searchQuery, documents, folders, parts, lots, ncrs, employees, projects, rfqs, departments],
  )

  const widgetClusters = useMemo(
    () => visibleClusters.map((cluster) => {
      const stats = getClusterStatsForId(cluster.id, clusterStatsMap)
      const unlocked = cluster.modules.filter((m) => moduleUnlocked(m, authCtx)).length
      return {
        id: cluster.id,
        label: cluster.label,
        description: cluster.description,
        icon: cluster.icon,
        color: cluster.color,
        path: cluster.path,
        meta: [`${cluster.modules.length} modules`, `${unlocked} available`],
        stats: stats.slice(0, 2),
      }
    }),
    [authCtx, clusterStatsMap, visibleClusters],
  )

  const showSearchResults = searchQuery.trim().length > 0

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>

      <ManagementDashboardMetrics />

      <AiInsightsCtaStrip context="management" />

      <div className="mgmt-hub-tools-head">
        <h2 className="stx-text-section mgmt-hub-tools-title">{toolsHeading}</h2>
        <input
          type="search"
          className="mgmt-hub-search"
          placeholder="Search modules, people, lots, documents…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search management modules and company records"
        />
      </div>

      {showSearchResults ? (
        <>
          {searchModuleResults.length === 0 && searchRecordResults.length === 0 ? (
            <p className="mgmt-hub-empty stx-text-body">No modules or records match your search.</p>
          ) : null}
          {searchRecordResults.length > 0 && (
            <ul className="mgmt-hub-records">
              {searchRecordResults.map((hit) => (
                <li key={`${hit.kind}-${hit.path}-${hit.title}`}>
                  <Link className="mgmt-hub-record stx-click-feedback" to={hit.path}>
                    <span className="mgmt-hub-record__kind stx-text-caption">{hit.kind}</span>
                    <strong className="stx-text-wrap">{hit.title}</strong>
                    {hit.hint ? <span className="stx-text-caption stx-text-wrap">{hit.hint}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {searchModuleResults.length > 0 ? (
            <ManagementModuleGrid
              modules={searchModuleResults}
              authCtx={authCtx}
              onNavigate={navigate}
              t={t}
            />
          ) : null}
        </>
      ) : (
        <ManagementClusterWidgets clusters={widgetClusters} onNavigate={navigate} />
      )}
    </>
  )
}
