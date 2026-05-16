import {
  FINDING_TYPES,
  STATUS_COLORS,
  INDUSTRIES,
  AUDIT_TYPES,
  AUDIT_STANDARDS,
  getQuestionnaire,
  getQuestionnaireVerdictPreset,
  VERDICT_PRESET_SUPPLIER_RU_SCORE,
  getTotalQuestions,
} from '../../data/auditManagementDetailedData'

export {
  FINDING_TYPES,
  STATUS_COLORS,
  INDUSTRIES,
  AUDIT_TYPES,
  AUDIT_STANDARDS,
  getQuestionnaire,
  getQuestionnaireVerdictPreset,
  VERDICT_PRESET_SUPPLIER_RU_SCORE,
  getTotalQuestions,
}

export function Card({ title, icon, children, className = '', style = {} }) {
  return (
    <div className={`ap-card stx-text-wrap ${className}`.trim()} style={style}>
      {title && (
        <div className="ap-card-title">
          <span className="ap-card-title-icon">{icon}</span>
          {title.toUpperCase()}
        </div>
      )}
      {children}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'block',
          fontSize: 'var(--text-caption)',
          color: 'var(--color-muted)',
          marginBottom: 5,
          letterSpacing: '0.06em',
          fontWeight: 'var(--font-medium)',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

export function Input({ value, onChange, type = 'text', placeholder = '', disabled = false }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="ap-input"
    />
  )
}

export function Textarea({ value, onChange, placeholder = '', rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="ap-textarea"
    />
  )
}

export function Select({ value, onChange, options, disabled = false }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="ap-select">
      {opts.map((o) => (
        <option key={String(o.value)} value={o.value}>
          {o.label || o.value || '—'}
        </option>
      ))}
    </select>
  )
}

export function Btn({ onClick, children, color, variant = 'primary', type = 'button' }) {
  const className =
    color != null
      ? 'ap-btn ap-btn-primary ap-btn-override'
      : variant === 'secondary'
        ? 'ap-btn ap-btn-secondary'
        : variant === 'success'
          ? 'ap-btn ap-btn-success'
          : 'ap-btn ap-btn-primary'
  return (
    <button
      type={type}
      onClick={onClick}
      className={className}
      style={color ? { background: color, color: '#fff', borderColor: 'transparent' } : undefined}
    >
      {children}
    </button>
  )
}

export function Grid2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
}

export function Tag({ color, children, small }) {
  const pad = small ? '2px 6px' : '3px 8px'
  const fs = small ? 9 : 10
  const isCssColor =
    typeof color === 'string' && (color.includes('var(') || /^rgb[a]?\(/i.test(color.trim()))
  const style = isCssColor
    ? {
        background: `color-mix(in srgb, ${color} 18%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 42%, transparent)`,
        borderRadius: 5,
        padding: pad,
        fontSize: fs,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }
    : {
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
        borderRadius: 5,
        padding: pad,
        fontSize: fs,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }
  return <span style={style}>{children}</span>
}

export function StatusBadge({ status }) {
  return <Tag color={STATUS_COLORS[status] || '#64748B'}>{status}</Tag>
}

export function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '6px 0',
        borderBottom: '1px solid var(--ap-border)',
      }}
    >
      <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-muted)', minWidth: 100 }}>{label}</span>
      <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-primary)', textAlign: 'right', maxWidth: '58%' }}>{value}</span>
    </div>
  )
}
