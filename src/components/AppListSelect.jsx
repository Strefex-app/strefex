import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDisplayLabel } from '../utils/displayLabel'
import './AppListSelect.css'

export default function AppListSelect({
  value = '',
  onChange,
  options = [],
  ariaLabel,
  placeholder = 'Select',
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const items = useMemo(
    () => options.map((option) => {
      if (typeof option === 'string') {
        return { value: option, label: formatDisplayLabel(option) }
      }
      return {
        value: option.value,
        label: formatDisplayLabel(option.label || option.value),
      }
    }),
    [options],
  )
  const current = items.find((item) => String(item.value) === String(value))
  const buttonLabel = current?.label || placeholder

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`app-list-select${className ? ` ${className}` : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`app-list-select__btn${open ? ' is-open' : ''}${!current ? ' is-placeholder' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen((next) => !next) }}
      >
        <span className="app-list-select__label">{buttonLabel}</span>
      </button>
      {open && !disabled ? (
        <ul className="app-list-select__menu" role="listbox" aria-label={ariaLabel || placeholder}>
          {items.map((item) => (
            <li key={String(item.value) || 'empty'}>
              <button
                type="button"
                role="option"
                aria-selected={String(item.value) === String(value)}
                className={`app-list-select__option${String(item.value) === String(value) ? ' is-on' : ''}`}
                onClick={() => {
                  onChange?.(item.value)
                  setOpen(false)
                }}
              >
                {item.label || '—'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
