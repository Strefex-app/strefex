import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './ProductionMetrics.css'

const ProductionQualityKPIs = () => {
  const navigate = useNavigate()
  const { qualityKPIs } = useProductionStore()
  const { currentMonth, targets, trend } = qualityKPIs

  const getKPIStatus = (current, target, isLowerBetter = false) => {
    const ratio = isLowerBetter ? target / current : current / target
    if (ratio >= 1) return 'good'
    if (ratio >= 0.9) return 'warn'
    return 'bad'
  }

  const kpiCards = [
    {
      name: 'First Pass Yield (FPY)',
      current: currentMonth.fpy,
      target: targets.fpy,
      unit: '%',
      desc: 'Percentage of units passing without rework',
      isLowerBetter: false,
    },
    {
      name: 'DPMO',
      current: currentMonth.dpmo,
      target: targets.dpmo,
      unit: '',
      desc: 'Defects Per Million Opportunities',
      isLowerBetter: true,
    },
    {
      name: 'Customer Complaints',
      current: currentMonth.customerComplaints,
      target: targets.customerComplaints,
      unit: '',
      desc: 'Number of customer complaints this month',
      isLowerBetter: true,
    },
    {
      name: 'Internal Reject Rate',
      current: currentMonth.internalRejects,
      target: targets.internalRejects,
      unit: '%',
      desc: 'Percentage of internally rejected units',
      isLowerBetter: true,
    },
    {
      name: 'Supplier PPM',
      current: currentMonth.supplierPPM,
      target: targets.supplierPPM,
      unit: '',
      desc: 'Parts per million defective from suppliers',
      isLowerBetter: true,
    },
    {
      name: 'Cost of Quality',
      current: currentMonth.coq,
      target: targets.coq,
      unit: '%',
      desc: 'Total quality costs as % of revenue',
      isLowerBetter: true,
    },
  ]

  return (
    <AppLayout>
      <div className="metrics-page">
        <div className="metrics-header">
          <button type="button" className="metrics-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="metrics-header-content">
            <div>
              <h1 className="metrics-title">Quality KPIs</h1>
              <p className="metrics-subtitle">Key quality performance indicators and trends</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid">
          {kpiCards.map((kpi, i) => {
            const status = getKPIStatus(kpi.current, kpi.target, kpi.isLowerBetter)
            const progress = kpi.isLowerBetter 
              ? Math.min(100, (kpi.target / kpi.current) * 100) 
              : Math.min(100, (kpi.current / kpi.target) * 100)
            return (
              <div key={i} className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-name">{kpi.name}</span>
                  <span className="kpi-target">Target: {kpi.target}{kpi.unit}</span>
                </div>
                <div className={`kpi-value ${status}`}>{kpi.current}{kpi.unit}</div>
                <div className="kpi-progress">
                  <div className={`kpi-progress-fill ${status}`} style={{ width: `${progress}%` }} />
                </div>
                <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>{kpi.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Trend Chart */}
        <div className="metrics-card">
          <h3>Quality Trend (6 Months)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {/* FPY Trend */}
            <div>
              <h4 style={{ fontSize: '14px', color: '#555', marginBottom: '12px' }}>First Pass Yield (%)</h4>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '8px' }}>
                {trend.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${m.fpy}%`,
                        background: 'linear-gradient(180deg, #27ae60 0%, #2ecc71 100%)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: '10px',
                      }}
                      title={`${m.month}: ${m.fpy}%`}
                    />
                    <span style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>{m.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scrap Rate Trend */}
            <div>
              <h4 style={{ fontSize: '14px', color: '#555', marginBottom: '12px' }}>Scrap Rate (%)</h4>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '8px' }}>
                {trend.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${m.scrapRate * 50}%`,
                        background: 'linear-gradient(180deg, #e74c3c 0%, #c0392b 100%)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: '10px',
                      }}
                      title={`${m.month}: ${m.scrapRate}%`}
                    />
                    <span style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>{m.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OEE Trend */}
            <div>
              <h4 style={{ fontSize: '14px', color: '#555', marginBottom: '12px' }}>OEE (%)</h4>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '8px' }}>
                {trend.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${m.oee}%`,
                        background: 'linear-gradient(180deg, #3498db 0%, #2980b9 100%)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: '10px',
                      }}
                      title={`${m.month}: ${m.oee}%`}
                    />
                    <span style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>{m.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quality Focus Areas */}
        <div className="metrics-card">
          <h3>Quality Focus Areas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '10px', borderLeft: '4px solid #27ae60' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>Prevention</h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#666' }}>
                <li>Training programs</li>
                <li>Preventive maintenance</li>
                <li>Process control</li>
              </ul>
            </div>
            <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '10px', borderLeft: '4px solid #3498db' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>Appraisal</h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#666' }}>
                <li>Inspection activities</li>
                <li>Testing procedures</li>
                <li>Audit programs</li>
              </ul>
            </div>
            <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '10px', borderLeft: '4px solid #e67e22' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>Internal Failure</h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#666' }}>
                <li>Scrap costs</li>
                <li>Rework costs</li>
                <li>Downtime losses</li>
              </ul>
            </div>
            <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '10px', borderLeft: '4px solid #e74c3c' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>External Failure</h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#666' }}>
                <li>Warranty claims</li>
                <li>Customer returns</li>
                <li>Complaints handling</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quality Targets vs Actuals */}
        <div className="metrics-card">
          <h3>Current Month vs Targets</h3>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>KPI</th>
                <th>Target</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {kpiCards.map((kpi, i) => {
                const status = getKPIStatus(kpi.current, kpi.target, kpi.isLowerBetter)
                const variance = kpi.isLowerBetter 
                  ? kpi.target - kpi.current 
                  : kpi.current - kpi.target
                return (
                  <tr key={i}>
                    <td><strong>{kpi.name}</strong></td>
                    <td>{kpi.target}{kpi.unit}</td>
                    <td>{kpi.current}{kpi.unit}</td>
                    <td className={variance >= 0 ? 'metrics-sum-value green' : 'metrics-sum-value red'}>
                      {variance >= 0 ? '+' : ''}{variance.toFixed(kpi.unit === '%' ? 1 : 0)}{kpi.unit}
                    </td>
                    <td>
                      <span className={`metric-badge ${status === 'good' ? 'world-class' : status === 'warn' ? 'average' : 'poor'}`}>
                        {status === 'good' ? 'On Target' : status === 'warn' ? 'Near Target' : 'Off Target'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}

export default ProductionQualityKPIs
