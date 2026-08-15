import { useMemo } from 'react'
import { useAccountRegistry } from '../store/accountRegistry'
import useHrSpaceStore from '../store/hrSpaceStore'
import useVendorStore from '../store/vendorStore'
import useProcurementStore from '../store/procurementStore'
import { useProjectStore } from '../store/projectStore'
import useContractStore from '../store/contractStore'
import useAuditStore from '../store/auditStore'
import useAuditProStore from '../store/auditProStore'
import useEnterpriseStore from '../store/enterpriseStore'
import useCostStore from '../store/costStore'
import useProductionStore from '../store/productionStore'
import { useRfqIntelligenceStore } from '../store/rfqIntelligenceStore'
import { tenantKey } from '../utils/tenantStorage'

const FORUM_STORAGE_KEY = 'strefex-forum-hub'

function loadForumCounts() {
  try {
    const raw = localStorage.getItem(tenantKey(FORUM_STORAGE_KEY))
    if (!raw) return { announcements: 0, lessons: 0 }
    const p = JSON.parse(raw)
    return {
      announcements: Array.isArray(p.announcements) ? p.announcements.length : 0,
      lessons: Array.isArray(p.lessons) ? p.lessons.length : 0,
    }
  } catch {
    return { announcements: 0, lessons: 0 }
  }
}

/**
 * Live KPI chips for each management cluster — sourced from tenant Zustand stores.
 * @returns {Record<string, { label: string, value: string | number }[]>}
 */
export function useManagementClusterStats() {
  const registryAccounts = useAccountRegistry((s) => s.accounts)
  const employees = useHrSpaceStore((s) => s.employees)
  const vendorStats = useVendorStore((s) => s.getVendorStats)()
  const opportunities = useProcurementStore((s) => s.opportunities)
  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const projects = useProjectStore((s) => s.projects)
  const contracts = useContractStore((s) => s.getSafeContracts)()
  const auditLogs = useAuditStore((s) => s.getSafeLogs)()
  const auditProAudits = useAuditProStore((s) => s.audits)
  const enterpriseSummary = useEnterpriseStore((s) => s.getEnterpriseSummary)()
  const costProducts = useCostStore((s) => s.products)
  const oeeData = useProductionStore((s) => s.oeeData)
  const rfqQuotes = useRfqIntelligenceStore((s) => s.quotes)

  return useMemo(() => {
    const teamMembers = registryAccounts.reduce(
      (sum, acct) => sum + (acct.teamMembers?.length || 0),
      0,
    )
    const forum = loadForumCounts()
    const activeProjects = projects.filter(
      (p) => p.stage !== 'closed' && p.status !== 'archived',
    ).length
    const activeContracts = contracts.filter((c) => c.status === 'active').length
    const expiringContracts = contracts.filter((c) => {
      if (c.status === 'terminated' || c.status === 'expired' || !c.endDate) return false
      const days = Math.ceil((new Date(c.endDate) - new Date()) / (1000 * 60 * 60 * 24))
      return days <= 90
    }).length
    const openOpps = opportunities.filter((o) => o.status === 'open').length
    const avgOee = oeeData?.length
      ? Math.round(oeeData.reduce((s, r) => s + (r.oee || 0), 0) / oeeData.length)
      : null

    return {
      people: [
        { label: 'Team members', value: teamMembers },
        { label: 'Employees', value: employees.length },
        { label: 'Forum posts', value: forum.announcements + forum.lessons },
      ],
      sourcing: [
        { label: 'Vendors', value: vendorStats.total },
        { label: 'Open OPP', value: openOpps },
        { label: 'Saved quotes', value: rfqQuotes?.length || 0 },
      ],
      'contracts-compliance': [
        { label: 'Active contracts', value: activeContracts },
        { label: 'Expiring (90d)', value: expiringContracts },
        { label: 'Activity events', value: auditLogs.length },
      ],
      finance: [
        { label: 'Monthly OPEX', value: `$${Math.round(enterpriseSummary.totalOpex || 0).toLocaleString()}` },
        { label: 'Cost products', value: costProducts.length },
        { label: 'Approved POs', value: purchaseOrders.filter((o) => o.status === 'approved').length },
      ],
      ops: [
        { label: 'Projects', value: projects.length },
        { label: 'Active', value: activeProjects },
        { label: 'Avg OEE', value: avgOee != null ? `${avgOee}%` : '—' },
      ],
      platform: [
        { label: 'Platform audits', value: (auditProAudits || []).filter((a) => a.industry === 'Platform / SaaS' || a.standard === 'STREFEX Platform Security Audit').length },
        { label: 'Audit program', value: auditProAudits?.length || 0 },
        { label: 'Integrations', value: 'ERP' },
      ],
    }
  }, [
    registryAccounts,
    employees,
    vendorStats,
    opportunities,
    purchaseOrders,
    projects,
    contracts,
    auditLogs,
    auditProAudits,
    enterpriseSummary,
    costProducts,
    oeeData,
    rfqQuotes,
  ])
}

export function getClusterStatsForId(clusterId, statsMap) {
  return statsMap[clusterId] || []
}
