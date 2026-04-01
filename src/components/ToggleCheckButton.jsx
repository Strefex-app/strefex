import './ToggleCheckButton.css'

/**
 * Toggle control with role="checkbox" styled as a button row (or compact icon-only in tables).
 * @param {(checked: boolean) => void} onChange
 */
export function ToggleCheckButton({
  checked,
  onChange,
  children,
  className = '',
  disabled = false,
  compact = false,
  'aria-label': ariaLabel,
  title,
  style,
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={title}
      style={style}
      disabled={disabled}
      className={['stx-check-btn', compact && 'stx-check-btn--compact', checked && 'stx-check-btn--on', className]
        .filter(Boolean)
        .join(' ')}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className="stx-check-btn__icon" aria-hidden />
      {children != null && children !== false ? <span className="stx-check-btn__label">{children}</span> : null}
    </button>
  )
}
