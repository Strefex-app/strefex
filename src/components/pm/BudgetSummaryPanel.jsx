/**
 * Procore / SAP-style budget summary: baseline, actuals, committed, variance + bar.
 */
export default function BudgetSummaryPanel({
  currency = 'USD',
  baseline = 0,
  actuals = 0,
  committed = 0,
  locked = false,
  lockedAt,
}) {
  const totalUsed = actuals + committed
  const remaining = baseline - totalUsed
  const pctActual = baseline > 0 ? Math.min(100, (actuals / baseline) * 100) : 0
  const pctCommit = baseline > 0 ? Math.min(100 - pctActual, (committed / baseline) * 100) : 0
  const pctRemaining = Math.max(0, 100 - pctActual - pctCommit)
  const overBudget = remaining < 0

  const fmt = (n) => `${currency} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

  return (
    <section className="pcc-budget-panel" aria-label="Budget summary">
      <div className="pcc-budget-panel__metrics">
        <div className="pcc-budget-metric">
          <span className="pcc-budget-metric__label">Approved baseline</span>
          <span className="pcc-budget-metric__value">{fmt(baseline)}</span>
          <span className="pcc-budget-metric__hint">
            {locked ? `Locked ${lockedAt || ''}` : 'Not locked'}
          </span>
        </div>
        <div className="pcc-budget-metric">
          <span className="pcc-budget-metric__label">Actuals</span>
          <span className="pcc-budget-metric__value">{fmt(actuals)}</span>
        </div>
        <div className="pcc-budget-metric">
          <span className="pcc-budget-metric__label">Committed</span>
          <span className="pcc-budget-metric__value">{fmt(committed)}</span>
        </div>
        <div className={`pcc-budget-metric${overBudget ? ' pcc-budget-metric--warn' : ''}`}>
          <span className="pcc-budget-metric__label">Remaining</span>
          <span className="pcc-budget-metric__value">{fmt(remaining)}</span>
        </div>
      </div>
      <div className="pcc-budget-panel__bar-wrap">
        <div className="pcc-budget-panel__bar" role="img" aria-label={`${Math.round(pctActual + pctCommit)}% of baseline used`}>
          <span className="pcc-budget-panel__seg pcc-budget-panel__seg--actual" style={{ width: `${pctActual}%` }} />
          <span className="pcc-budget-panel__seg pcc-budget-panel__seg--commit" style={{ width: `${pctCommit}%` }} />
          <span className="pcc-budget-panel__seg pcc-budget-panel__seg--remain" style={{ width: `${pctRemaining}%` }} />
        </div>
        <ul className="pcc-budget-panel__legend">
          <li><span className="pcc-budget-panel__dot pcc-budget-panel__dot--actual" /> Actuals</li>
          <li><span className="pcc-budget-panel__dot pcc-budget-panel__dot--commit" /> Committed</li>
          <li><span className="pcc-budget-panel__dot pcc-budget-panel__dot--remain" /> Remaining</li>
        </ul>
      </div>
    </section>
  )
}
