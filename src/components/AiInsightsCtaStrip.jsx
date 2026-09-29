import { Link, useLocation } from 'react-router-dom'
import './AiInsightsCtaStrip.css'

const HINT = {
  production: 'View OEE, downtime, and scrap simulations alongside the rest of your insights.',
  cost: 'View target vs actual and scenario deltas in AI Insights.',
  enterprise: 'View margin and cost-stack simulations in AI Insights.',
  procurement: 'View PR backlog and spend concentration insights in AI Insights.',
  spend: 'Cross-check vendor mix and contract coverage in AI Insights.',
  management: 'Risk analysis, recommendations, and Ops/finance/HR simulations (documents, training, goals, matrix, hiring).',
}

/**
 * Entry points from management module pages → AI Insights.
 * @param {{ context?: keyof typeof HINT, className?: string }} props
 */
export default function AiInsightsCtaStrip({ context = 'management', className = '' }) {
  const { pathname } = useLocation()
  if (context === 'hr' || pathname.includes('/hr-space') || pathname.includes('/production/headcount')) {
    return null
  }
  return (
    <div className={`ai-insights-cta-strip ${className}`.trim()}>
      <div className="ai-insights-cta-strip__text">
        <strong className="ai-insights-cta-strip__title">AI Insights</strong>
        <span className="ai-insights-cta-strip__hint">{HINT[context] || HINT.management}</span>
      </div>
      <div className="ai-insights-cta-strip__actions">
        <Link to="/ai-insights" className="ai-insights-cta-strip__btn">
          Full dashboard
        </Link>
        <Link to="/ai-insights?tab=operations" className="ai-insights-cta-strip__btn ai-insights-cta-strip__btn--primary">
          Ops / finance / HR
        </Link>
      </div>
    </div>
  )
}
