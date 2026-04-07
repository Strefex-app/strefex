import AppLayout from '../../components/AppLayout'
import CostTransformationIntelligence from '../../components/CostTransformationIntelligence'
import './IntelligencePages.css'

export default function IntelligenceDashboard() {
  return (
    <AppLayout>
      <div className="intel-page intel-page--dashboard">
        <header className="intel-page__header">
          <h1 className="intel-page__title">Intelligence dashboard</h1>
          <p className="intel-page__lead">
            Month-on-month CPI momentum (ECB, where available), GDP acceleration, cost/demand KPIs, and the full
            indicator report — use the home strip for a lighter globe + headline indicators only.
          </p>
        </header>
        <CostTransformationIntelligence variant="dashboard" />
      </div>
    </AppLayout>
  )
}
