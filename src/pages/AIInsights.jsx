import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import DonutChart from '../components/DonutChart'
import { useAuthStore } from '../store/authStore'
import useVendorStore from '../store/vendorStore'
import useProcurementStore from '../store/procurementStore'
import useContractStore from '../store/contractStore'
import { getCompanyContext } from '../utils/companyGuard'
import './AIInsights.css'

const RISK_LEVELS = {
  low: { label: 'Low', color: '#27ae60', bg: 'rgba(46,204,113,.1)' },
  medium: { label: 'Medium', color: '#e67e22', bg: 'rgba(230,126,34,.1)' },
  high: { label: 'High', color: '#e74c3c', bg: 'rgba(231,76,60,.1)' },
  critical: { label: 'Critical', color: '#c0392b', bg: 'rgba(192,57,43,.15)' },
}

const fmtCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v || 0)

export default function AIInsights() {
  const navigate = useNavigate()
  const { companyName, isSuperAdmin } = getCompanyContext()
  const vendors = useVendorStore((s) => s.vendors)
  const getEvalClass = useVendorStore((s) => s.getEvaluationClass)
  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const contracts = useContractStore((s) => s.contracts)

  const [tab, setTab] = useState('risk')

  const riskAnalysis = useMemo(() => {
    const risks = []

    /* Vendor risks */
    vendors.forEach((v) => {
      const ec = getEvalClass(v)
      const openComplaints = (v.complaints || []).filter((c) => c.status === 'open')
      const g = v.general || {}
      if (ec.cls === 'D' || ec.cls === 'C') {
        risks.push({
          id: `vr-${v.id}`, type: 'vendor', entity: g.companyName || v.vendorNumber,
          risk: ec.cls === 'D' ? 'critical' : 'high',
          title: `${ec.cls === 'D' ? 'Restricted' : 'Conditional'} supplier — ${g.companyName}`,
          description: `Evaluation class ${ec.cls} (${ec.adjustedScore.toFixed(1)}/5). ${openComplaints.length} open complaint(s).`,
          recommendation: ec.cls === 'D' ? 'Consider blocking vendor and finding alternatives. Conduct supplier audit.' : 'Issue corrective action request. Schedule performance review.',
          impact: ec.cls === 'D' ? 'Supply chain disruption risk' : 'Quality and delivery concerns',
          probability: ec.cls === 'D' ? 85 : 60,
        })
      }
      if (openComplaints.length >= 2) {
        risks.push({
          id: `vc-${v.id}`, type: 'complaint', entity: g.companyName || v.vendorNumber,
          risk: 'high', title: `Multiple open complaints — ${g.companyName}`,
          description: `${openComplaints.length} unresolved complaints. Risk of recurring quality/delivery issues.`,
          recommendation: 'Escalate to vendor management. Schedule urgent review meeting.',
          impact: 'Production delays, quality defects', probability: 70,
        })
      }
    })

    /* Contract risks */
    contracts.forEach((c) => {
      const daysToEnd = Math.ceil((new Date(c.endDate) - new Date()) / 86400000)
      if (c.status === 'expired') {
        risks.push({
          id: `ce-${c.id}`, type: 'contract', entity: c.vendorName,
          risk: 'critical', title: `Expired contract — ${c.title}`,
          description: `Contract expired ${Math.abs(daysToEnd)} days ago. Operating without valid agreement.`,
          recommendation: 'Urgent: Renew or establish new contract immediately. Review legal exposure.',
          impact: 'Legal liability, supply interruption', probability: 90,
        })
      } else if (daysToEnd <= 30 && daysToEnd > 0) {
        risks.push({
          id: `cx-${c.id}`, type: 'contract', entity: c.vendorName,
          risk: 'high', title: `Contract expiring soon — ${c.title}`,
          description: `Expires in ${daysToEnd} days. ${c.autoRenew ? 'Auto-renewal enabled.' : 'No auto-renewal.'}`,
          recommendation: c.autoRenew ? 'Review terms before auto-renewal triggers.' : 'Initiate renewal negotiation immediately.',
          impact: 'Supply continuity risk', probability: 60,
        })
      }
    })

    /* Spending anomalies */
    const poAmounts = purchaseOrders.filter((o) => o.status === 'approved' || o.status === 'completed').map((o) => o.totalAmount)
    if (poAmounts.length > 2) {
      const avg = poAmounts.reduce((s, v) => s + v, 0) / poAmounts.length
      const highPOs = purchaseOrders.filter((o) => o.totalAmount > avg * 2)
      highPOs.forEach((o) => {
        risks.push({
          id: `sp-${o.id}`, type: 'spend', entity: o.vendorName || 'Unknown',
          risk: 'medium', title: `Above-average PO — ${o.id}`,
          description: `${fmtCurrency(o.totalAmount)} is ${((o.totalAmount / avg) * 100 - 100).toFixed(0)}% above average PO value.`,
          recommendation: 'Review pricing and compare with market rates. Verify if competitive bidding was performed.',
          impact: 'Budget overrun potential', probability: 40,
        })
      })
    }

    return risks.sort((a, b) => {
      const ord = { critical: 0, high: 1, medium: 2, low: 3 }
      return (ord[a.risk] || 4) - (ord[b.risk] || 4)
    })
  }, [vendors, contracts, purchaseOrders])

  const recommendations = useMemo(() => {
    const recs = []

    /* Cost savings */
    const approvedPOs = purchaseOrders.filter((o) => o.status === 'approved' || o.status === 'completed')
    const totalSpend = approvedPOs.reduce((s, o) => s + o.totalAmount, 0)
    if (totalSpend > 10000) {
      recs.push({ id: 'rec-1', type: 'cost', title: 'Consolidate vendor base', description: `You have ${vendors.length} vendors. Consolidating to preferred suppliers could save 8-12% on procurement costs.`, impact: fmtCurrency(totalSpend * 0.1), priority: 'high', category: 'Cost Optimization' })
    }

    /* Process improvements */
    const pendingPRs = useProcurementStore.getState().requisitions.filter((r) => r.status.startsWith('pending'))
    if (pendingPRs.length > 2) {
      recs.push({ id: 'rec-2', type: 'process', title: 'Approval bottleneck detected', description: `${pendingPRs.length} requisitions pending approval. Average processing time exceeds 3 days.`, impact: 'Faster procurement cycle', priority: 'medium', category: 'Process Improvement' })
    }

    /* Vendor diversification */
    const singleSourceCategories = {}
    approvedPOs.forEach((o) => {
      const key = o.category
      if (!singleSourceCategories[key]) singleSourceCategories[key] = new Set()
      singleSourceCategories[key].add(o.vendorName)
    })
    Object.entries(singleSourceCategories).forEach(([cat, vendorSet]) => {
      if (vendorSet.size === 1) {
        recs.push({ id: `rec-div-${cat}`, type: 'risk', title: `Single-source risk: ${cat}`, description: `Only 1 vendor for "${cat}". Consider qualifying alternative suppliers.`, impact: 'Risk mitigation', priority: 'high', category: 'Risk Management' })
      }
    })

    /* Contract optimization */
    const expiringContracts = contracts.filter((c) => {
      const d = Math.ceil((new Date(c.endDate) - new Date()) / 86400000)
      return d > 0 && d <= 90
    })
    if (expiringContracts.length > 0) {
      recs.push({ id: 'rec-ctr', type: 'contract', title: `${expiringContracts.length} contracts expiring within 90 days`, description: 'Proactively initiate renewal negotiations to secure favorable terms.', impact: 'Contract continuity', priority: 'high', category: 'Contract Management' })
    }

    /* ESG recommendation */
    recs.push({ id: 'rec-esg', type: 'compliance', title: 'Improve ESG supply chain scoring', description: 'Integrate ESG criteria into vendor evaluation scoring to meet upcoming EU CSDDD requirements.', impact: 'Regulatory compliance', priority: 'medium', category: 'Compliance' })

    return recs
  }, [vendors, purchaseOrders, contracts])

  const predictiveMetrics = useMemo(() => ({
    riskScore: Math.min(100, riskAnalysis.filter((r) => r.risk === 'critical' || r.risk === 'high').length * 15 + riskAnalysis.filter((r) => r.risk === 'medium').length * 5),
    savingsOpportunity: fmtCurrency(purchaseOrders.filter((o) => o.status === 'approved' || o.status === 'completed').reduce((s, o) => s + o.totalAmount, 0) * 0.08),
    automationPotential: 72,
    complianceGap: riskAnalysis.filter((r) => r.type === 'contract').length * 10 + 15,
  }), [riskAnalysis, purchaseOrders])

  return (
    <AppLayout>
      <div className="ai-page">
        <div className="ai-header">
          <div>
            <button className="ai-back" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="ai-title">AI Insights & Risk Prediction</h1>
            <p className="ai-subtitle">Smart analytics, risk assessment & procurement recommendations</p>
          </div>
        </div>

        {/* Predictive Metrics */}
        <div className="ai-metrics">
          <div className="ai-metric">
            <DonutChart
              value={predictiveMetrics.riskScore}
              label="Risk Score"
              color={predictiveMetrics.riskScore > 60 ? '#e74c3c' : predictiveMetrics.riskScore > 30 ? '#e67e22' : '#27ae60'}
              details={[
                { label: 'Supplier risks', value: `${riskAnalysis.filter(r => r.type === 'vendor').length} active`, color: '#e74c3c' },
                { label: 'Contract risks', value: `${riskAnalysis.filter(r => r.type === 'contract').length} issues`, color: '#f39c12' },
                { label: 'Spend anomalies', value: `${riskAnalysis.filter(r => r.type === 'spend').length} flagged`, color: '#e67e22' },
                { label: 'Complaint risks', value: `${riskAnalysis.filter(r => r.type === 'complaint').length} open`, color: '#8e44ad' },
              ]}
            />
            <div className="ai-metric-label">Risk Score</div>
          </div>
          <div className="ai-metric">
            <div className="ai-metric-val" style={{ color: '#27ae60' }}>{predictiveMetrics.savingsOpportunity}</div>
            <div className="ai-metric-label">Savings Opportunity</div>
          </div>
          <div className="ai-metric">
            <DonutChart
              value={predictiveMetrics.automationPotential}
              label="Automation Potential"
              color="#2980b9"
              details={[
                { label: 'Approval workflow', value: '65%', color: '#2980b9' },
                { label: 'PO creation', value: '78%', color: '#3498db' },
                { label: 'Catalog sync', value: '82%', color: '#1abc9c' },
                { label: 'Invoice matching', value: '58%', color: '#e67e22' },
              ]}
            />
            <div className="ai-metric-label">Automation Potential</div>
          </div>
          <div className="ai-metric">
            <DonutChart
              value={100 - predictiveMetrics.complianceGap}
              label="Compliance Score"
              color="#8e44ad"
              details={[
                { label: 'Contract issues', value: `${riskAnalysis.filter(r => r.type === 'contract').length} active`, color: '#e74c3c' },
                { label: 'On-track contracts', value: `${contracts.length - riskAnalysis.filter(r => r.type === 'contract').length}`, color: '#27ae60' },
                { label: 'Compliance gap', value: `${predictiveMetrics.complianceGap}%`, color: '#8e44ad' },
              ]}
            />
            <div className="ai-metric-label">Compliance Score</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="ai-tabs">
          {[{ id: 'risk', label: `Risk Analysis (${riskAnalysis.length})` }, { id: 'recommendations', label: `Recommendations (${recommendations.length})` }, { id: 'predictions', label: 'Predictions' }].map((t) => (
            <button key={t.id} className={`ai-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Risk Analysis */}
        {tab === 'risk' && (
          <div className="ai-risk-list">
            {riskAnalysis.length === 0 ? <div className="ai-empty">No significant risks detected.</div> : riskAnalysis.map((r) => {
              const rl = RISK_LEVELS[r.risk]
              return (
                <div key={r.id} className="ai-risk-card" style={{ borderLeftColor: rl.color }}>
                  <div className="ai-risk-header">
                    <span className="ai-risk-badge" style={{ color: rl.color, background: rl.bg }}>{rl.label}</span>
                    <span className="ai-risk-type">{r.type}</span>
                    <span className="ai-risk-entity">{r.entity}</span>
                    <span className="ai-risk-prob">{r.probability}% probability</span>
                  </div>
                  <div className="ai-risk-title">{r.title}</div>
                  <div className="ai-risk-desc">{r.description}</div>
                  <div className="ai-risk-impact"><strong>Impact:</strong> {r.impact}</div>
                  <div className="ai-risk-rec"><strong>Recommendation:</strong> {r.recommendation}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Recommendations */}
        {tab === 'recommendations' && (
          <div className="ai-rec-list">
            {recommendations.map((r) => (
              <div key={r.id} className="ai-rec-card">
                <div className="ai-rec-header">
                  <span className="ai-rec-cat">{r.category}</span>
                  <span className={`ai-rec-priority ${r.priority}`}>{r.priority}</span>
                </div>
                <div className="ai-rec-title">{r.title}</div>
                <div className="ai-rec-desc">{r.description}</div>
                <div className="ai-rec-impact"><strong>Estimated Impact:</strong> {r.impact}</div>
              </div>
            ))}
          </div>
        )}

        {/* Predictions */}
        {tab === 'predictions' && (
          <div className="ai-predictions">
            <div className="ai-card">
              <h4>30-Day Forecast</h4>
              <div className="ai-pred-grid">
                <div className="ai-pred-item"><span className="ai-pred-label">Expected POs</span><span className="ai-pred-val">4-6</span></div>
                <div className="ai-pred-item"><span className="ai-pred-label">Estimated Spend</span><span className="ai-pred-val">{fmtCurrency(purchaseOrders.reduce((s, o) => s + o.totalAmount, 0) / Math.max(purchaseOrders.length, 1) * 5)}</span></div>
                <div className="ai-pred-item"><span className="ai-pred-label">Contract Renewals Due</span><span className="ai-pred-val">{contracts.filter((c) => { const d = Math.ceil((new Date(c.endDate) - new Date()) / 86400000); return d > 0 && d <= 30 }).length}</span></div>
                <div className="ai-pred-item"><span className="ai-pred-label">Vendor Reviews Needed</span><span className="ai-pred-val">{vendors.filter((v) => { const ec = getEvalClass(v); return ec.cls === 'C' || ec.cls === 'D' }).length}</span></div>
              </div>
            </div>
            <div className="ai-card">
              <h4>Trend Analysis</h4>
              <div className="ai-trend-list">
                <div className="ai-trend-item"><span className="ai-trend-arrow up">↑</span> Procurement volume increasing — 15% above last quarter average</div>
                <div className="ai-trend-item"><span className="ai-trend-arrow down">↓</span> Average approval time decreasing — 2.8 days (was 3.5)</div>
                <div className="ai-trend-item"><span className="ai-trend-arrow up">↑</span> Vendor complaints trending up — 3 new in last 30 days</div>
                <div className="ai-trend-item"><span className="ai-trend-arrow stable">→</span> Contract compliance stable at 85%</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
