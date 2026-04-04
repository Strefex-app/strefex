import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import DonutChart from '../components/DonutChart'
import useVendorStore from '../store/vendorStore'
import useProcurementStore from '../store/procurementStore'
import useContractStore from '../store/contractStore'
import useProductionStore from '../store/productionStore'
import useCostStore from '../store/costStore'
import useEnterpriseStore from '../store/enterpriseStore'
import {
  deriveProductionInsights,
  deriveCostPriceInsights,
  deriveEnterpriseInsights,
  deriveSpendProcurementInsights,
} from '../utils/aiInsightsOperationsFinance'
import { deriveHrSpaceInsights } from '../utils/aiInsightsHrSpace'
import useHrSpaceStore from '../store/hrSpaceStore'
import './AIInsights.css'

const RISK_LEVELS = {
  low: { label: 'Low', color: '#27ae60', bg: 'rgba(46,204,113,.1)' },
  medium: { label: 'Medium', color: '#e67e22', bg: 'rgba(230,126,34,.1)' },
  high: { label: 'High', color: '#e74c3c', bg: 'rgba(231,76,60,.1)' },
  critical: { label: 'Critical', color: '#c0392b', bg: 'rgba(192,57,43,.15)' },
}

const fmtCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v || 0)

const DOMAIN_LABEL = {
  production: 'Production',
  cost: 'Cost & pricing',
  enterprise: 'Enterprise',
  spend: 'Procurement & spend',
  hr: 'HR Space',
}

const VALID_TAB = new Set(['risk', 'recommendations', 'operations', 'predictions'])

/** Roll up insight `domain` into department filters */
const VALID_OPS_DEPT = new Set(['all', 'production', 'finance', 'procurement', 'hr'])

function domainToOpsDept(domain) {
  if (domain === 'production') return 'production'
  if (domain === 'cost' || domain === 'enterprise') return 'finance'
  if (domain === 'spend') return 'procurement'
  if (domain === 'hr') return 'hr'
  return 'all'
}

const OPS_DEPT_OPTIONS = [
  { id: 'all', label: 'All departments' },
  { id: 'production', label: 'Production' },
  { id: 'finance', label: 'Finance & cost' },
  { id: 'procurement', label: 'Procurement & spend' },
  { id: 'hr', label: 'HR Space' },
]

const MODULE_QUICK_LINKS = [
  { to: '/hr-space', label: 'HR Space' },
  { to: '/hr-space/hr-docs', label: 'HR documents' },
  { to: '/hr-space/training', label: 'Training' },
  { to: '/hr-space/qualification-matrix', label: 'Qualification matrix' },
  { to: '/hr-space/goals', label: 'Goals' },
  { to: '/production', label: 'Production' },
  { to: '/cost-management', label: 'Cost management' },
  { to: '/enterprise', label: 'Enterprise' },
  { to: '/procurement', label: 'Procurement' },
  { to: '/spend-analysis', label: 'Spend analysis' },
  { to: '/contracts', label: 'Contracts' },
  { to: '/management', label: 'Management hub' },
]

export default function AIInsights() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [tab, setTab] = useState(() => (tabFromUrl && VALID_TAB.has(tabFromUrl) ? tabFromUrl : 'risk'))

  const [opsDept, setOpsDept] = useState(() => {
    try {
      const d = new URLSearchParams(window.location.search).get('dept')
      return d && VALID_OPS_DEPT.has(d) ? d : 'all'
    } catch {
      return 'all'
    }
  })

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && VALID_TAB.has(t)) setTab(t)
    if (t === 'operations') {
      const d = searchParams.get('dept')
      if (!d) setOpsDept('all')
      else if (d === 'all') setOpsDept('all')
      else if (VALID_OPS_DEPT.has(d)) setOpsDept(d)
    }
  }, [searchParams])

  const goTab = (id) => {
    setTab(id)
    if (id === 'operations') {
      if (opsDept === 'all') setSearchParams({ tab: 'operations' }, { replace: true })
      else setSearchParams({ tab: 'operations', dept: opsDept }, { replace: true })
    } else {
      setSearchParams({ tab: id }, { replace: true })
    }
  }

  const setOpsDeptAndUrl = (dept) => {
    setOpsDept(dept)
    if (dept === 'all') {
      setSearchParams({ tab: 'operations' }, { replace: true })
    } else {
      setSearchParams({ tab: 'operations', dept }, { replace: true })
    }
    if (tab !== 'operations') setTab('operations')
  }
  const vendors = useVendorStore((s) => s.vendors)
  const getEvalClass = useVendorStore((s) => s.getEvaluationClass)
  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const requisitionsRaw = useProcurementStore((s) => s.requisitions)
  const getSafeRequisitions = useProcurementStore((s) => s.getSafeRequisitions)
  const contracts = useContractStore((s) => s.contracts)

  const oeeData = useProductionStore((s) => s.oeeData)
  const downtimeRecords = useProductionStore((s) => s.downtimeRecords)
  const scrapRecords = useProductionStore((s) => s.scrapRecords)
  const workCenters = useProductionStore((s) => s.workCenters)
  const fiveSAudits = useProductionStore((s) => s.fiveSAudits)
  const getAverageOEE = useProductionStore((s) => s.getAverageOEE)
  const getProductionSummary = useProductionStore((s) => s.getProductionSummary)

  const costProducts = useCostStore((s) => s.products)
  const costScenarios = useCostStore((s) => s.scenarios)
  const getCostSummary = useCostStore((s) => s.getCostSummary)
  const calculateScenarioCost = useCostStore((s) => s.calculateScenarioCost)

  const enterpriseProducts = useEnterpriseStore((s) => s.products)
  const exceptionalCosts = useEnterpriseStore((s) => s.exceptionalCosts)
  const getEnterpriseSummary = useEnterpriseStore((s) => s.getEnterpriseSummary)
  const calculateProductCost = useEnterpriseStore((s) => s.calculateProductCost)

  const hrEmployees = useHrSpaceStore((s) => s.employees)
  const hrDocuments = useHrSpaceStore((s) => s.hrDocuments)
  const hrTrainingRecords = useHrSpaceStore((s) => s.trainingRecords)
  const hrGoals = useHrSpaceStore((s) => s.goals)
  const hrDialogues = useHrSpaceStore((s) => s.dialogues)
  const hrOnboardingTasks = useHrSpaceStore((s) => s.onboardingTasks)
  const hrRatings = useHrSpaceStore((s) => s.ratings)
  const hrQualificationNames = useHrSpaceStore((s) => s.qualificationNames)
  const hrWorkforcePlans = useHrSpaceStore((s) => s.workforcePlans)
  const hrOpenPositions = useHrSpaceStore((s) => s.openPositions)
  const hrCandidates = useHrSpaceStore((s) => s.candidates)

  const pendingRequisitionCount = useMemo(() => {
    const rq = typeof getSafeRequisitions === 'function' ? getSafeRequisitions() : requisitionsRaw
    return rq.filter((r) => r.status.startsWith('pending')).length
  }, [requisitionsRaw, getSafeRequisitions])

  const operationsInsights = useMemo(() => {
    const prod = deriveProductionInsights({
      getAverageOEE,
      getProductionSummary,
      oeeData,
      downtimeRecords,
      scrapRecords,
      workCenters,
      fiveSAudits,
    })
    const cost = deriveCostPriceInsights({
      products: costProducts,
      scenarios: costScenarios,
      getCostSummary,
      calculateScenarioCost,
    })
    const ent = deriveEnterpriseInsights({
      getEnterpriseSummary,
      products: enterpriseProducts,
      calculateProductCost,
      exceptionalCosts,
    })
    const spend = deriveSpendProcurementInsights({
      purchaseOrders,
      vendors,
      contracts,
      pendingRequisitionCount,
    })
    const hr = deriveHrSpaceInsights({
      employees: hrEmployees,
      hrDocuments,
      trainingRecords: hrTrainingRecords,
      goals: hrGoals,
      dialogues: hrDialogues,
      onboardingTasks: hrOnboardingTasks,
      ratings: hrRatings,
      qualificationNames: hrQualificationNames,
      workforcePlans: hrWorkforcePlans,
      openPositions: hrOpenPositions,
      candidates: hrCandidates,
    })
    return [...prod, ...cost, ...ent, ...spend, ...hr].sort((a, b) => {
      const o = { high: 0, medium: 1, low: 2 }
      return (o[a.priority] ?? 3) - (o[b.priority] ?? 3)
    })
  }, [
    getAverageOEE,
    getProductionSummary,
    oeeData,
    downtimeRecords,
    scrapRecords,
    workCenters,
    fiveSAudits,
    costProducts,
    costScenarios,
    getCostSummary,
    calculateScenarioCost,
    enterpriseProducts,
    exceptionalCosts,
    getEnterpriseSummary,
    calculateProductCost,
    purchaseOrders,
    vendors,
    contracts,
    pendingRequisitionCount,
    hrEmployees,
    hrDocuments,
    hrTrainingRecords,
    hrGoals,
    hrDialogues,
    hrOnboardingTasks,
    hrRatings,
    hrQualificationNames,
    hrWorkforcePlans,
    hrOpenPositions,
    hrCandidates,
  ])

  const opsDeptCounts = useMemo(() => {
    const c = { all: 0, production: 0, finance: 0, procurement: 0, hr: 0 }
    operationsInsights.forEach((item) => {
      c.all += 1
      const k = domainToOpsDept(item.domain)
      if (k !== 'all') c[k] += 1
    })
    return c
  }, [operationsInsights])

  const filteredOperationsInsights = useMemo(() => {
    if (opsDept === 'all') return operationsInsights
    return operationsInsights.filter((item) => domainToOpsDept(item.domain) === opsDept)
  }, [operationsInsights, opsDept])

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
            <p className="ai-subtitle">
              One place to review supplier, contract, and spend exposure, follow structured recommendations, and explore
              department-level simulations for production, finance, procurement, and people operations.{' '}
              <span className="ai-subtitle-confidential">Confidentiality secured — analysis stays in your workspace.</span>
            </p>
            <div className="ai-module-bar" role="navigation" aria-label="Related modules">
              <span className="ai-module-bar-label">Related modules</span>
              <div className="ai-module-bar-links">
                {MODULE_QUICK_LINKS.map((m) => (
                  <Link key={m.to} to={m.to} className="ai-module-bar-link">
                    {m.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="ai-tab-shortcuts" role="group" aria-label="Insight sections">
              <span className="ai-tab-shortcuts-label">Sections</span>
              {[
                { id: 'risk', label: 'Risk' },
                { id: 'recommendations', label: 'Recommendations' },
                { id: 'operations', label: 'Departments' },
                { id: 'predictions', label: 'Predictions' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`ai-tab-shortcut ${tab === s.id ? 'active' : ''}`}
                  onClick={() => goTab(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
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
          {[
            { id: 'risk', label: `Risk Analysis (${riskAnalysis.length})` },
            { id: 'recommendations', label: `Recommendations (${recommendations.length})` },
            { id: 'operations', label: `Departments (${operationsInsights.length})` },
            { id: 'predictions', label: 'Predictions' },
          ].map((t) => (
            <button key={t.id} type="button" className={`ai-tab ${tab === t.id ? 'active' : ''}`} onClick={() => goTab(t.id)}>
              {t.label}
            </button>
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

        {/* Departments — simulations + corrective actions (filter by area) */}
        {tab === 'operations' && (
          <div className="ai-ops">
            <p className="ai-ops-intro">
              Rule-based simulations use your Production, Cost management, Enterprise, Procurement, Spend Analysis, and{' '}
              <strong>HR Space</strong> data. Pick a department below to focus the list; use{' '}
              <strong>All departments</strong> to see everything sorted by priority.
            </p>
            <div className="ai-ops-dept-bar" role="tablist" aria-label="Department filter">
              {OPS_DEPT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={opsDept === opt.id}
                  className={`ai-ops-dept-btn ${opsDept === opt.id ? 'active' : ''}`}
                  onClick={() => setOpsDeptAndUrl(opt.id)}
                >
                  {opt.label}
                  <span className="ai-ops-dept-count">({opsDeptCounts[opt.id] ?? 0})</span>
                </button>
              ))}
            </div>
            {operationsInsights.length === 0 ? (
              <div className="ai-empty">No simulations match current thresholds. Add data in Production, Cost, Enterprise, or HR Space.</div>
            ) : filteredOperationsInsights.length === 0 ? (
              <div className="ai-empty">
                No items for this department filter. Choose <strong>All departments</strong> or another area.
              </div>
            ) : (
              <div className="ai-ops-list">
                {filteredOperationsInsights.map((item) => (
                  <div key={item.id} className="ai-ops-card">
                    <div className="ai-ops-card-head">
                      <span className="ai-ops-domain">{DOMAIN_LABEL[item.domain] || item.domain}</span>
                      <span className={`ai-rec-priority ${item.priority}`}>{item.priority}</span>
                    </div>
                    <div className="ai-ops-title">{item.title}</div>
                    <div className="ai-ops-block">
                      <strong>Simulation</strong>
                      <p>{item.simulation}</p>
                    </div>
                    <div className="ai-ops-block">
                      <strong>Recommendation</strong>
                      <p>{item.recommendation}</p>
                    </div>
                    <div className="ai-ops-block">
                      <strong>Activities to implement</strong>
                      <ul className="ai-ops-ul">
                        {item.activities.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                    <button type="button" className="ai-ops-open" onClick={() => navigate(item.href)}>
                      Open module
                    </button>
                  </div>
                ))}
              </div>
            )}
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
