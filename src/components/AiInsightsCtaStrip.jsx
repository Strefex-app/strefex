import { Link } from 'react-router-dom'
import './AiInsightsCtaStrip.css'

const HINT = {
  production: 'View OEE, downtime, and scrap simulations alongside the rest of your insights.',
  cost: 'View target vs actual and scenario deltas in AI Insights.',
  enterprise: 'View margin and cost-stack simulations in AI Insights.',
  procurement: 'View PR backlog and spend concentration insights in AI Insights.',
  spend: 'Cross-check vendor mix and contract coverage in AI Insights.',
  management: 'Risk analysis, recommendations, and Ops/finance/HR simulations (documents, training, goals, matrix, hiring).',
  hr: 'HR documents, training, requalification, goals, dialogue, onboarding, workforce — surfaced in AI Insights.',
}

/**
 * Entry points from management module pages → AI Insights.
 * @param {{ context?: keyof typeof HINT, className?: string }} props
 */
export default function AiInsightsCtaStrip({ context = 'management', className = '' }) {
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
        {(context === 'management' || context === 'hr') && (
          <Link to="/hr-space" className="ai-insights-cta-strip__btn">
            HR Space hub
          </Link>
        )}
      </div>
    </div>
  )
}
