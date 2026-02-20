import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import useVendorStore from '../store/vendorStore'
import useProcurementStore from '../store/procurementStore'
import useContractStore from '../store/contractStore'
import { getCompanyContext } from '../utils/companyGuard'
import './SpendAnalysis.css'

const fmtCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v || 0)

const COLORS = ['#000888', '#2980b9', '#27ae60', '#e67e22', '#8e44ad', '#e74c3c', '#1abc9c', '#f39c12', '#34495e', '#d35400']

export default function SpendAnalysis() {
  const navigate = useNavigate()
  const vendors = useVendorStore((s) => s.vendors)
  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const contracts = useContractStore((s) => s.contracts)

  const [period, setPeriod] = useState('all')
  const [view, setView] = useState('category')

  const spendData = useMemo(() => {
    const pos = purchaseOrders.filter((o) => o.status === 'approved' || o.status === 'completed')

    /* By category */
    const byCategory = {}
    pos.forEach((o) => {
      const cat = o.category || 'Uncategorized'
      byCategory[cat] = (byCategory[cat] || 0) + o.totalAmount
    })

    /* By vendor */
    const byVendor = {}
    pos.forEach((o) => {
      const v = o.vendorName || 'Unknown'
      byVendor[v] = (byVendor[v] || 0) + o.totalAmount
    })

    /* Add vendor spend from vendor store connections */
    vendors.forEach((v) => {
      const vendorSpend = (v.connections || [])
        .filter((c) => c.type === 'payment' && c.status === 'paid')
        .reduce((s, c) => s + (c.amount || 0), 0)
      if (vendorSpend > 0) {
        const name = v.general?.companyName || `Vendor ${v.vendorNumber}`
        byVendor[name] = (byVendor[name] || 0) + vendorSpend
      }
    })

    /* By department */
    const byDept = {}
    pos.forEach((o) => {
      const d = o.department || 'Unknown'
      byDept[d] = (byDept[d] || 0) + o.totalAmount
    })

    /* By month */
    const byMonth = {}
    pos.forEach((o) => {
      const m = o.createdAt ? o.createdAt.slice(0, 7) : 'Unknown'
      byMonth[m] = (byMonth[m] || 0) + o.totalAmount
    })

    /* By priority */
    const byPriority = {}
    pos.forEach((o) => {
      const p = o.priority || 'medium'
      byPriority[p] = (byPriority[p] || 0) + o.totalAmount
    })

    const totalSpend = Object.values(byCategory).reduce((s, v) => s + v, 0)
    const contractValue = contracts.filter((c) => c.status === 'active' || c.status === 'expiring_soon').reduce((s, c) => s + c.value, 0)

    return { byCategory, byVendor, byDept, byMonth, byPriority, totalSpend, contractValue, poCount: pos.length }
  }, [purchaseOrders, vendors, contracts])

  const sortedEntries = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])
  const maxVal = (obj) => Math.max(...Object.values(obj), 1)

  const renderBar = (entries, max) => (
    <div className="sa-bar-chart">
      {entries.map(([label, value], idx) => (
        <div key={label} className="sa-bar-row">
          <span className="sa-bar-label">{label}</span>
          <div className="sa-bar-track">
            <div className="sa-bar-fill" style={{ width: `${(value / max) * 100}%`, background: COLORS[idx % COLORS.length] }} />
          </div>
          <span className="sa-bar-value">{fmtCurrency(value)}</span>
          <span className="sa-bar-pct">{((value / spendData.totalSpend) * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )

  return (
    <AppLayout>
      <div className="sa-page">
        <div className="sa-header">
          <div>
            <button className="sa-back" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="sa-title">Spend Analysis</h1>
            <p className="sa-subtitle">Procurement spend by vendor, category, department & time period</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="sa-kpis">
          <div className="sa-kpi"><span className="sa-kpi-n">{fmtCurrency(spendData.totalSpend)}</span>Total Spend</div>
          <div className="sa-kpi"><span className="sa-kpi-n">{spendData.poCount}</span>Purchase Orders</div>
          <div className="sa-kpi"><span className="sa-kpi-n">{Object.keys(spendData.byVendor).length}</span>Vendors</div>
          <div className="sa-kpi"><span className="sa-kpi-n">{Object.keys(spendData.byCategory).length}</span>Categories</div>
          <div className="sa-kpi"><span className="sa-kpi-n">{fmtCurrency(spendData.contractValue)}</span>Contract Value</div>
          <div className="sa-kpi"><span className="sa-kpi-n">{fmtCurrency(spendData.totalSpend / Math.max(spendData.poCount, 1))}</span>Avg PO Value</div>
        </div>

        {/* View tabs */}
        <div className="sa-tabs">
          {[{ id: 'category', label: 'By Category' }, { id: 'vendor', label: 'By Vendor' }, { id: 'department', label: 'By Department' }, { id: 'monthly', label: 'Monthly Trend' }, { id: 'priority', label: 'By Priority' }].map((t) => (
            <button key={t.id} className={`sa-tab ${view === t.id ? 'active' : ''}`} onClick={() => setView(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Charts */}
        <div className="sa-charts">
          {view === 'category' && (
            <div className="sa-card">
              <h4>Spend by Category</h4>
              {Object.keys(spendData.byCategory).length === 0 ? <p className="sa-empty">No spend data yet.</p> : renderBar(sortedEntries(spendData.byCategory), maxVal(spendData.byCategory))}
            </div>
          )}
          {view === 'vendor' && (
            <div className="sa-card">
              <h4>Spend by Vendor</h4>
              {Object.keys(spendData.byVendor).length === 0 ? <p className="sa-empty">No vendor spend data.</p> : renderBar(sortedEntries(spendData.byVendor), maxVal(spendData.byVendor))}
            </div>
          )}
          {view === 'department' && (
            <div className="sa-card">
              <h4>Spend by Department</h4>
              {Object.keys(spendData.byDept).length === 0 ? <p className="sa-empty">No department data.</p> : renderBar(sortedEntries(spendData.byDept), maxVal(spendData.byDept))}
            </div>
          )}
          {view === 'monthly' && (
            <div className="sa-card">
              <h4>Monthly Spend Trend</h4>
              {Object.keys(spendData.byMonth).length === 0 ? <p className="sa-empty">No monthly data.</p> : renderBar(sortedEntries(spendData.byMonth).reverse(), maxVal(spendData.byMonth))}
            </div>
          )}
          {view === 'priority' && (
            <div className="sa-card">
              <h4>Spend by Priority</h4>
              {Object.keys(spendData.byPriority).length === 0 ? <p className="sa-empty">No data.</p> : renderBar(sortedEntries(spendData.byPriority), maxVal(spendData.byPriority))}
            </div>
          )}
        </div>

        {/* Detailed Table */}
        <div className="sa-card">
          <h4>Purchase Order Details</h4>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr><th>PO ID</th><th>Vendor</th><th>Category</th><th>Department</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {purchaseOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="sa-td-id">{o.id}</td>
                    <td>{o.vendorName || '—'}</td>
                    <td>{o.category}</td>
                    <td>{o.department}</td>
                    <td className="sa-td-amount">{fmtCurrency(o.totalAmount)}</td>
                    <td><span className="sa-td-status" style={{ color: o.status === 'approved' || o.status === 'completed' ? '#27ae60' : o.status === 'rejected' ? '#e74c3c' : '#e67e22' }}>{o.status}</span></td>
                    <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
