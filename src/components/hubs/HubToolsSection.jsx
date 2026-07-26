/**
 * Step 2 wrapper — dims tools until the user has registered at least one industry.
 */
export default function HubToolsSection({
  hasAccess,
  title = 'Your tools',
  hint,
  children,
}) {
  return (
    <div className={`app-page-card hub-step hub-step--tools ${hasAccess ? '' : 'hub-step--tools-locked'}`}>
      <div className="hub-step__head">
        <span className="hub-step__badge">Step 2</span>
        <h2 className="hub-step__title">{title}</h2>
        {hint && <p className="hub-step__hint stx-text-wrap">{hint}</p>}
      </div>

      {!hasAccess && (
        <div className="hub-step__lock-banner" role="status">
          Complete Step 1 — register at least one industry — to use these tools.
        </div>
      )}

      <div className={`hub-step__tools ${hasAccess ? '' : 'hub-step__tools--dimmed'}`} aria-hidden={!hasAccess}>
        {children}
      </div>
    </div>
  )
}
