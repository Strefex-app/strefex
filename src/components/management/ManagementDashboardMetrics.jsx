import { useMemo } from 'react'
import { useProjectStore } from '../../store/projectStore'
import useProcurementStore from '../../store/procurementStore'
import useVendorStore from '../../store/vendorStore'
import '../../styles/managementShell.css'

function BarChart({ items, max }) {
  const peak = max || Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="mgmt-dash-bars" role="img" aria-label="Activity bars">
      {items.map((item) => (
        <div key={item.label} className="mgmt-dash-bar-row">
          <span className="mgmt-dash-bar-label">{item.label}</span>
          <div className="mgmt-dash-bar-track">
            <div
              className={`mgmt-dash-bar-fill mgmt-dash-bar-fill--${item.tone || 'primary'}`}
              style={{ width: `${Math.round((item.value / peak) * 100)}%` }}
            />
          </div>
          <span className="mgmt-dash-bar-val">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function KpiTile({ label, value, hint, tone = 'primary' }) {
  return (
    <div className={`mgmt-dash-kpi mgmt-dash-kpi--${tone}`}>
      <span className="mgmt-dash-kpi__label">{label}</span>
      <span className="mgmt-dash-kpi__value">{value}</span>
      {hint ? <span className="mgmt-dash-kpi__hint">{hint}</span> : null}
    </div>
  )
}

export default function ManagementDashboardMetrics() {
  const projects = useProjectStore((s) => s.projects)
  const opportunities = useProcurementStore((s) => s.opportunities)
  const quotations = useProcurementStore((s) => s.quotations)
  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const requisitions = useProcurementStore((s) => s.requisitions)
  const vendorStats = useVendorStore((s) => s.getVendorStats)()

  const metrics = useMemo(() => {
    const activeProjects = projects.filter((p) => p.stage !== 'closed' && p.status !== 'archived').length
    const signedQuotes = quotations.filter((q) => q.status === 'signed').length
    const openQuotes = quotations.filter((q) => q.status !== 'signed').length
    const withPo = quotations.filter((q) => q.linkedPOId).length
    const pendingPr = requisitions.filter((r) => r.status?.startsWith('pending')).length
    const approvedSpend = purchaseOrders
      .filter((o) => o.status === 'approved' || o.status === 'completed')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    return {
      activeProjects,
      signedQuotes,
      openQuotes,
      withPo,
      pendingPr,
      approvedSpend,
    }
  }, [projects, quotations, purchaseOrders, requisitions])

  const moduleBars = [
    { label: 'Projects', value: projects.length, tone: 'pm' },
    { label: 'Opportunities', value: opportunities.length, tone: 'proc' },
    { label: 'Quotations', value: quotations.length, tone: 'proc' },
    { label: 'Purchase orders', value: purchaseOrders.length, tone: 'proc' },
    { label: 'Vendors', value: vendorStats.total, tone: 'vendor' },
  ]

  const pipelineBars = [
    { label: 'Open OPP', value: opportunities.filter((o) => o.status === 'open').length, tone: 'proc' },
    { label: 'Quotes open', value: metrics.openQuotes, tone: 'warning' },
    { label: 'Signed', value: metrics.signedQuotes, tone: 'success' },
    { label: 'With PO', value: metrics.withPo, tone: 'primary' },
    { label: 'Pending PR', value: metrics.pendingPr, tone: 'warning' },
  ]

  const vendorBars = [
    { label: 'Active', value: vendorStats.active, tone: 'success' },
    { label: 'Potential / pending', value: vendorStats.pending, tone: 'warning' },
    { label: 'Blocked', value: vendorStats.blocked, tone: 'danger' },
    { label: 'Connections', value: vendorStats.totalConnections, tone: 'vendor' },
  ]

  return (
    <section className="mgmt-dash" aria-label="Management overview metrics">
      <div className="mgmt-dash-kpis">
        <KpiTile label="Projects" value={projects.length} hint={`${metrics.activeProjects} active`} tone="pm" />
        <KpiTile label="Procurement OPP" value={opportunities.length} hint={`${metrics.openQuotes} open quotes`} tone="proc" />
        <KpiTile label="Committed POs" value={metrics.withPo} hint={`${purchaseOrders.length} total POs`} tone="proc" />
        <KpiTile label="Vendor master" value={vendorStats.total} hint={`${vendorStats.pending} potential / pending`} tone="vendor" />
        <KpiTile
          label="Approved spend"
          value={`$${Math.round(metrics.approvedSpend).toLocaleString()}`}
          hint="Purchase orders"
          tone="primary"
        />
      </div>

      <div className="mgmt-dash-charts">
        <div className="mgmt-dash-chart-card">
          <h3 className="mgmt-dash-chart-title">Module volume</h3>
          <BarChart items={moduleBars} />
        </div>
        <div className="mgmt-dash-chart-card">
          <h3 className="mgmt-dash-chart-title">Procurement pipeline</h3>
          <BarChart items={pipelineBars} />
        </div>
        <div className="mgmt-dash-chart-card">
          <h3 className="mgmt-dash-chart-title">Vendor registry</h3>
          <BarChart items={vendorBars} />
        </div>
      </div>
    </section>
  )
}
