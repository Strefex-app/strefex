import '../pages/Home.css'

export const SIGNAL = {
  ok: 'var(--stx-signal-ok, #5FB85C)',
  okBg: 'var(--badge-success-bg, #EAF6E9)',
  okFg: 'var(--badge-success-text, #2F7A2C)',
  watch: 'var(--stx-signal-watch, #E0A23B)',
  critical: 'var(--stx-signal-critical, #D2483F)',
  data: 'var(--stx-signal-data, #3AA6C9)',
  dataBg: 'var(--accent-light, #E4F3F8)',
  dataFg: 'var(--accent-text, #155F76)',
  muted: 'var(--stx-ink-faint, #8B9298)',
  navy: 'var(--stx-navy-800, #0A2540)',
  steelBg: 'var(--stx-steel-200, #EEF0F2)',
}

export const SRC = {
  own: { src: 'Your activity', srcFg: SIGNAL.navy, srcBg: SIGNAL.steelBg },
  live: { src: 'Live status', srcFg: SIGNAL.dataFg, srcBg: SIGNAL.dataBg },
  ops: { src: 'Operations', srcFg: SIGNAL.okFg, srcBg: SIGNAL.okBg },
  watch: { src: 'Watch', srcFg: '#9a6b12', srcBg: '#fbf3e4' },
  act: { src: 'Act', srcFg: SIGNAL.critical, srcBg: 'rgba(210, 72, 63, 0.12)' },
}

const KPI_ACCENTS = [SIGNAL.navy, SIGNAL.watch, SIGNAL.ok, SIGNAL.critical, SIGNAL.data]
const KPI_CHIPS = [SRC.own, SRC.watch, SRC.ops, SRC.act, SRC.live]

export function kpiChrome(index) {
  return {
    accent: KPI_ACCENTS[index % KPI_ACCENTS.length],
    ...KPI_CHIPS[index % KPI_CHIPS.length],
  }
}

export function KpiWidget({
  label, value, unit, delta, deltaColor, sub, accent, src, srcFg, srcBg, onClick, active,
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`home-w home-w--kpi${active ? ' home-w--kpi-active' : ''}${onClick ? '' : ' stx-kpi--static'}`}
      style={{ borderLeftColor: accent }}
      onClick={onClick}
      aria-pressed={onClick && active ? 'true' : undefined}
    >
      <div className="home-w__kpi-label">{label}</div>
      <div className="home-w__kpi-row">
        <span className="home-w__kpi-value">
          {value}
          {unit ? <span className="home-w__kpi-unit">{unit}</span> : null}
        </span>
        {delta ? (
          <span className="home-w__kpi-delta" style={{ color: deltaColor || SIGNAL.navy }}>
            {delta}
          </span>
        ) : null}
      </div>
      {sub ? <div className="home-w__kpi-sub">{sub}</div> : null}
      {src ? (
        <span className="home-w__chip" style={{ color: srcFg, background: srcBg }}>
          {src}
        </span>
      ) : null}
    </Tag>
  )
}
