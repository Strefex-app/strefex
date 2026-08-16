import { FISHBONE_6M, QUALITY_VISUAL_KIND, ftaTree, groupFishboneCauses, num, statusTone } from '../../utils/qualityExcellenceVisuals'
import { coqBucketTotals } from '../../utils/qualityExcellenceCompute'

const FIGURE_TITLE = {
  fishbone: 'Ishikawa diagram',
  chain: 'Why chain',
  cycle: 'PDCA cycle',
  stepper: '8D disciplines',
  a3: 'A3 storyboard',
  pareto: 'Pareto chart',
  'control-chart': 'Control chart',
  gauge: 'Gage R&R',
  capability: 'Spec window & histogram',
  rpn: 'RPN ranking',
  tree: 'Fault tree',
  stack: 'Tolerance stack',
  shield: 'Poka-yoke layers',
  matrix: 'Factor levels & responses',
  flow: 'Value stream',
  setup: 'Changeover times',
  oee: 'OEE & losses',
  controls: 'Control plan flow',
  layers: 'LPA layers',
  kpis: 'KPI board',
  'before-after': 'Frequency change',
  funnel: 'Sampling plan',
  'matrix-2x2': 'Inspection actions',
  trim: 'Control-plan actions',
  inventory: 'Gauge actions',
  traffic: 'Supplier routing',
  savings: 'Annual savings',
  gates: 'APQP gates',
  buckets: 'Cost of quality',
}

function clip(text, n = 28) {
  const s = String(text || '').trim()
  if (!s) return ''
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function polar(cx, cy, r, angle) {
  const a = ((angle - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

function pieSlice(cx, cy, r, start, end) {
  const [x1, y1] = polar(cx, cy, r, end)
  const [x2, y2] = polar(cx, cy, r, start)
  const large = end - start > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x2} ${y2} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`
}

function histogram(values, bins = 12) {
  const numsIn = values.filter((v) => v != null)
  if (!numsIn.length) return { counts: Array(bins).fill(0), min: 0, max: 1, peak: 1 }
  const min = Math.min(...numsIn)
  const max = Math.max(...numsIn)
  const span = max - min || 1
  const counts = Array(bins).fill(0)
  numsIn.forEach((v) => {
    const i = Math.min(bins - 1, Math.floor(((v - min) / span) * bins))
    counts[i] += 1
  })
  return { counts, min, max, peak: Math.max(...counts, 1) }
}

function BarRow({ label, value, max = 100, tone = 'idle', suffix = '' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, ((Number(value) || 0) / max) * 100)) : 0
  return (
    <div className="qe-bar-row">
      <span className="qe-bar-row__label stx-text-wrap stx-text-caption">{label || '—'}</span>
      <div className="qe-bar-row__track" aria-hidden>
        <span className={`qe-bar-row__fill qe-tone-${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="stx-text-caption">{value ?? 0}{suffix}</span>
    </div>
  )
}

function ActionMatrix({ rows = [], actions, nameKey }) {
  return (
    <div className="qe-matrix">
      {actions.map((a) => {
        const hits = rows.filter((r) => r.action === a)
        return (
          <div key={a} className="qe-matrix__cell">
            <span className="stx-text-caption">{a.replace(/_/g, ' ')}</span>
            <strong>{hits.length}</strong>
            {hits.slice(0, 3).map((row, i) => (
              <p key={row.id || i} className="stx-text-caption stx-text-wrap">{clip(row[nameKey], 22) || '—'}</p>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function FishboneVisual({ draft, onSelectCategory, activeCategory }) {
  const groups = groupFishboneCauses(draft.tables?.causes || [])
  const problem = draft.fields?.title || draft.fields?.process || 'Problem'
  const xs = [210, 400, 590]

  return (
    <svg className="qe-svg qe-svg--fish" viewBox="0 0 960 380" role="img" aria-label="Ishikawa fishbone diagram">
      <line x1="70" y1="190" x2="760" y2="190" className="qe-svg-spine" />
      <polygon points="760,168 820,190 760,212" className="qe-svg-head" />
      <rect x="828" y="148" width="118" height="84" rx="10" className="qe-svg-box" />
      <text x="887" y="176" textAnchor="middle" className="qe-svg-kicker">Effect</text>
      <text x="887" y="200" textAnchor="middle" className="qe-svg-title">{clip(problem, 16)}</text>

      {FISHBONE_6M.map((cat) => {
        const x = xs[cat.slot]
        const up = cat.side === 'top'
        const x2 = x - 92
        const y2 = up ? 42 : 338
        const group = groups.find((g) => g.key === cat.key)
        const causes = (group?.causes || []).filter((c) => c.cause).slice(0, 4)
        const active = activeCategory === cat.key
        return (
          <g key={cat.key} className={active ? 'qe-svg-bone is-active' : 'qe-svg-bone'} onClick={() => onSelectCategory?.(cat.key)}>
            <line x1={x} y1="190" x2={x2} y2={y2} />
            <rect x={x2 - 58} y={up ? 8 : 342} width="116" height="28" rx="8" className="qe-svg-cat" />
            <text x={x2} y={up ? 27 : 361} textAnchor="middle" className="qe-svg-cat-label">{cat.short}</text>
            {causes.map((row, i) => {
              const t = (i + 1) / (causes.length + 1)
              const cx = x + (x2 - x) * t
              const cy = 190 + (y2 - 190) * t
              const rib = up ? -16 : 16
              return (
                <g key={row.id || i}>
                  <line x1={cx} y1={cy} x2={cx + 22} y2={cy + rib} className="qe-svg-rib" />
                  <text x={cx + 26} y={cy + rib + (up ? -2 : 10)} className="qe-svg-cause">{clip(row.cause, 18)}</text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

function ChainVisual({ rows = [] }) {
  return (
    <div className="qe-chain" aria-label="5 Whys chain">
      {rows.map((row, i) => (
        <div key={row.id || i} className="qe-chain__item">
          {i > 0 && <div className="qe-chain__link" aria-hidden />}
          <div className={`qe-chip qe-tone-${row.answer ? 'ok' : 'idle'}`}>
            <span className="stx-text-caption">{row.step || `Why ${i}`}</span>
            <strong className="stx-text-wrap">{clip(row.answer || row.question, 42) || 'Type the answer'}</strong>
          </div>
        </div>
      ))}
    </div>
  )
}

function PdcaVisual({ fields = {} }) {
  const phases = [
    { id: 'Plan', done: fields.hypothesis || fields.countermeasure || fields.prediction },
    { id: 'Do', done: fields.doNotes || fields.pilotScope },
    { id: 'Check', done: fields.checkResult },
    { id: 'Act', done: fields.actDecision && fields.actDecision !== 'pending' },
  ]
  return (
    <div className="qe-pdca" aria-label="PDCA cycle">
      {phases.map((p, i) => (
        <div key={p.id} className={`qe-pdca__q qe-pdca__q--${i} ${p.done ? 'is-done' : ''}`}>
          <span>{p.id}</span>
        </div>
      ))}
      <div className="qe-pdca__hub">PDCA</div>
    </div>
  )
}

function StepperVisual({ rows = [], keyField = 'code', labelField = 'discipline' }) {
  return (
    <ol className="qe-stepper">
      {rows.map((row, i) => (
        <li key={row.id || i} className={`qe-stepper__item qe-tone-${statusTone(row.status)}`}>
          <span>{row[keyField] || i + 1}</span>
          <em className="stx-text-wrap">{clip(row[labelField], 28)}</em>
        </li>
      ))}
    </ol>
  )
}

function A3Visual({ fields = {}, rows = [] }) {
  const actions = (rows || []).map((r) => r.action).filter(Boolean).join(' · ')
  const cells = [
    { label: 'Background', text: fields.background },
    { label: 'Current', text: fields.currentCondition },
    { label: 'Goal', text: fields.goal },
    { label: 'Cause', text: fields.rootCause },
    { label: 'Actions', text: actions },
    { label: 'Results', text: fields.results },
  ]
  return (
    <div className="qe-a3-map">
      {cells.map((cell) => (
        <div key={cell.label} className="qe-a3-map__cell">
          <span className="stx-text-caption">{cell.label}</span>
          <p className="stx-text-small stx-text-wrap">{clip(cell.text, 90) || '—'}</p>
        </div>
      ))}
    </div>
  )
}

function ParetoVisual({ rows = [] }) {
  const items = [...rows].filter((r) => r.name || num(r.cost) != null || num(r.count) != null)
  const shown = items.length ? items : Array.from({ length: 5 }, (_, i) => ({ name: `Item ${i + 1}`, cost: 0 }))
  const max = Math.max(...shown.map((r) => num(r.cost) ?? num(r.count) ?? 0), 1)
  return (
    <div className="qe-pareto">
      {shown.map((row, i) => (
        <div key={row.id || i} className="qe-pareto__col">
          <div className="qe-pareto__stack">
            <span className="qe-pareto__cum" style={{ bottom: `${Math.min(100, num(row.cumulative) || 0)}%` }} />
            <span className="qe-pareto__bar" style={{ height: `${((num(row.cost) ?? num(row.count) ?? 0) / max) * 100}%` }} />
          </div>
          <span className="stx-text-caption stx-text-wrap">{clip(row.name, 12) || `Item ${i + 1}`}</span>
        </div>
      ))}
    </div>
  )
}

function SpcVisual({ fields = {}, rows = [] }) {
  const values = rows.map((r) => num(r.value)).filter((v) => v != null)
  const ucl = num(fields.ucl)
  const lcl = num(fields.lcl)
  const cl = num(fields.cl)
  const all = [...values, ucl, lcl, cl].filter((v) => v != null)
  const min = all.length ? Math.min(...all) : 0
  const max = all.length ? Math.max(...all) : 1
  const span = max - min || 1
  const w = 720
  const h = 220
  const pts = values.map((v, i) => {
    const x = 36 + (i / Math.max(values.length - 1, 1)) * (w - 72)
    const y = 20 + (1 - (v - min) / span) * (h - 40)
    return `${x},${y}`
  }).join(' ')
  const yAt = (v) => 20 + (1 - (v - min) / span) * (h - 40)
  return (
    <svg className="qe-svg qe-svg--chart" viewBox={`0 0 ${w} ${h}`} aria-label="Control chart">
      {ucl != null && <line x1="24" x2={w - 24} y1={yAt(ucl)} y2={yAt(ucl)} className="qe-svg-limit qe-svg-limit--hi" />}
      {lcl != null && <line x1="24" x2={w - 24} y1={yAt(lcl)} y2={yAt(lcl)} className="qe-svg-limit qe-svg-limit--lo" />}
      {cl != null && <line x1="24" x2={w - 24} y1={yAt(cl)} y2={yAt(cl)} className="qe-svg-limit qe-svg-limit--cl" />}
      {pts && <polyline points={pts} className="qe-svg-line" fill="none" />}
      {values.map((v, i) => {
        const x = 36 + (i / Math.max(values.length - 1, 1)) * (w - 72)
        const y = yAt(v)
        const signal = rows[i]?.signal && rows[i].signal !== 'none'
        return <circle key={i} cx={x} cy={y} r="4" className={signal ? 'qe-svg-pt qe-svg-pt--alert' : 'qe-svg-pt'} />
      })}
      {ucl != null && <text x={w - 20} y={yAt(ucl) + 4} textAnchor="end" className="qe-svg-kicker">UCL</text>}
      {cl != null && <text x={w - 20} y={yAt(cl) + 4} textAnchor="end" className="qe-svg-kicker">CL</text>}
      {lcl != null && <text x={w - 20} y={yAt(lcl) + 4} textAnchor="end" className="qe-svg-kicker">LCL</text>}
    </svg>
  )
}

function GaugeVisual({ value, label, good = 10, mid = 30 }) {
  const v = Math.max(0, Math.min(100, num(value) || 0))
  const tone = v < good ? 'ok' : v < mid ? 'mid' : 'bad'
  return (
    <div className="qe-gauge">
      <div className="qe-gauge__track">
        <span className="qe-gauge__ok" style={{ width: `${good}%` }} />
        <span className="qe-gauge__mid" style={{ width: `${mid - good}%` }} />
        <span className="qe-gauge__bad" />
        <span className={`qe-gauge__needle qe-tone-${tone}`} style={{ left: `${v}%` }} />
      </div>
      <strong className={`qe-tone-text-${tone}`}>{label}: {value || value === 0 ? v : '—'}</strong>
    </div>
  )
}

function GageVisual({ fields = {} }) {
  const max = Math.max(num(fields.ev) || 0, num(fields.av) || 0, num(fields.pv) || 0, 1)
  return (
    <div className="qe-figure-stack">
      <GaugeVisual value={fields.grrPct} label="%GRR" />
      <div className="qe-kpis qe-kpis--tight">
        <div className="qe-kpi"><strong>{fields.ndc || '—'}</strong><span className="stx-text-caption">ndc</span></div>
        <div className="qe-kpi"><strong className="stx-text-wrap">{String(fields.verdict || 'pending').replace(/_/g, ' ')}</strong><span className="stx-text-caption">Verdict</span></div>
      </div>
      <BarRow label="EV equipment" value={num(fields.ev) || 0} max={max} tone="mid" />
      <BarRow label="AV appraiser" value={num(fields.av) || 0} max={max} tone="mid" />
      <BarRow label="PV parts" value={num(fields.pv) || 0} max={max} tone="ok" />
    </div>
  )
}

function CapabilityVisual({ fields = {}, rows = [] }) {
  const lsl = num(fields.lsl)
  const usl = num(fields.usl)
  const mean = num(fields.mean)
  const sw = num(fields.sigmaWithin)
  const readings = (rows || []).map((r) => num(r.reading)).filter((v) => v != null)
  const hist = histogram(readings)
  const pad = lsl != null && usl != null && usl > lsl ? (usl - lsl) * 0.25 : (hist.max - hist.min) * 0.15 || 1
  const min = lsl != null ? lsl - pad : hist.min - pad
  const max = usl != null ? usl + pad : hist.max + pad
  const span = max - min || 1
  const x = (v) => ((v - min) / span) * 100
  const w = 720
  const h = 160
  const barW = (w - 48) / hist.counts.length

  return (
    <div className="qe-cap">
      <svg className="qe-svg qe-svg--chart" viewBox={`0 0 ${w} ${h}`} aria-label="Capability histogram">
        {lsl != null && usl != null && usl > lsl && (
          <rect x={(x(lsl) / 100) * w} y="8" width={((x(usl) - x(lsl)) / 100) * w} height={h - 24} className="qe-svg-spec" />
        )}
        {hist.counts.map((c, i) => {
          const bh = (c / hist.peak) * (h - 36)
          return (
            <rect
              key={i}
              x={24 + i * barW + 2}
              y={h - 16 - bh}
              width={Math.max(2, barW - 4)}
              height={bh}
              className="qe-svg-hist"
            />
          )
        })}
        {mean != null && <line x1={(x(mean) / 100) * w} x2={(x(mean) / 100) * w} y1="8" y2={h - 16} className="qe-svg-limit qe-svg-limit--cl" />}
        {lsl != null && <line x1={(x(lsl) / 100) * w} x2={(x(lsl) / 100) * w} y1="8" y2={h - 16} className="qe-svg-limit qe-svg-limit--lo" />}
        {usl != null && <line x1={(x(usl) / 100) * w} x2={(x(usl) / 100) * w} y1="8" y2={h - 16} className="qe-svg-limit qe-svg-limit--hi" />}
      </svg>
      <div className="qe-kpis qe-kpis--tight">
        <div className="qe-kpi"><strong>{fields.cpk || '—'}</strong><span className="stx-text-caption">Cpk</span></div>
        <div className="qe-kpi"><strong>{fields.ppk || '—'}</strong><span className="stx-text-caption">Ppk</span></div>
        <div className="qe-kpi"><strong>{fields.cp || '—'}</strong><span className="stx-text-caption">Cp</span></div>
        <div className="qe-kpi"><strong>{fields.pp || '—'}</strong><span className="stx-text-caption">Pp</span></div>
      </div>
      {mean != null && sw && lsl != null && usl != null ? (
        <div className="qe-cap__track">
          <span className="qe-cap__spec" style={{ left: `${x(lsl)}%`, width: `${Math.max(0, x(usl) - x(lsl))}%` }} />
          <span className="qe-cap__sigma" style={{ left: `${x(mean - 3 * sw)}%`, width: `${Math.max(0, x(mean + 3 * sw) - x(mean - 3 * sw))}%` }} />
          <span className="qe-cap__mean" style={{ left: `${x(mean)}%` }} />
        </div>
      ) : null}
    </div>
  )
}

function RpnVisual({ rows = [] }) {
  const modes = rows.length ? rows : Array.from({ length: 4 }, (_, i) => ({ failureMode: `Mode ${i + 1}`, rpn: 0 }))
  return (
    <div className="qe-figure-stack">
      {modes.map((r, i) => (
        <BarRow
          key={r.id || i}
          label={r.failureMode || r.item || `Mode ${i + 1}`}
          value={num(r.rpn) || 0}
          max={1000}
          tone={(num(r.rpn) || 0) >= 200 ? 'bad' : (num(r.rpn) || 0) >= 80 ? 'mid' : 'ok'}
        />
      ))}
    </div>
  )
}

function TreeVisual({ draft }) {
  const { tops, byParent } = ftaTree(draft.tables?.events || [], draft.fields?.topEvent)
  const render = (node, depth = 0) => {
    const kids = byParent.get(node.id) || []
    return (
      <div key={node.id} className="qe-tree__node" style={{ marginLeft: depth ? 18 : 0 }}>
        <div className={`qe-chip qe-chip--${node.gate || 'basic'}`}>
          <span className="stx-text-caption">{node.gate || 'event'} · {node.id}</span>
          <strong className="stx-text-wrap">{clip(node.description, 40) || 'Describe event'}</strong>
        </div>
        {kids.map((child) => render(child, depth + 1))}
      </div>
    )
  }
  return <div className="qe-tree">{tops.map((n) => render(n))}</div>
}

function StackVisual({ fields = {}, rows = [] }) {
  const req = num(fields.requirement) || 0
  const rss = num(fields.rss) || 0
  const worst = num(fields.worstCase) || 0
  const max = Math.max(req, rss, worst, 1)
  return (
    <div className="qe-figure-stack">
      <BarRow label="Requirement" value={req} max={max} tone="ok" />
      <BarRow label="RSS" value={rss} max={max} tone={rss && req && rss <= req ? 'ok' : 'mid'} />
      <BarRow label="Worst case" value={worst} max={max} tone="bad" />
      {rows.filter((r) => r.component).map((r, i) => (
        <BarRow key={r.id || i} label={r.component} value={num(r.tolerance) || 0} max={max} tone={r.contributor === 'no' ? 'idle' : 'mid'} suffix=" ±" />
      ))}
    </div>
  )
}

function ShieldVisual({ fields = {} }) {
  return (
    <div className="qe-figure-stack">
      <div className="qe-shield">
        {['prevention', 'detection', 'warning'].map((t) => (
          <div key={t} className={`qe-shield__tier ${fields.type === t ? 'is-active' : ''}`}>{t}</div>
        ))}
      </div>
      {(fields.error || fields.device) && (
        <div className="qe-chip">
          <span className="stx-text-caption">{clip(fields.location, 24) || 'Process location'}</span>
          <strong className="stx-text-wrap">{clip(fields.error || fields.device, 72)}</strong>
        </div>
      )}
    </div>
  )
}

function DoeVisual({ factors = [], runs = [] }) {
  const max = Math.max(...runs.map((r) => num(r.response) || 0), 1)
  return (
    <div className="qe-figure-stack">
      <div className="qe-doe">
        {factors.map((f, i) => (
          <div key={f.id || i} className="qe-doe__row">
            <span>{clip(f.factor, 16) || `F${i + 1}`}</span>
            <em>{f.low || '−'}</em>
            <strong>{f.high || '+'}</strong>
          </div>
        ))}
      </div>
      {runs.some((r) => num(r.response) != null) && (
        <div>
          {runs.map((r, i) => (
            <BarRow key={r.id || i} label={r.run || r.settings || `Run ${i + 1}`} value={num(r.response) || 0} max={max} tone="ok" />
          ))}
        </div>
      )}
    </div>
  )
}

function FlowVisual({ rows = [], nameKey = 'step', tagKey = 'value', extraKey }) {
  return (
    <div className="qe-flow">
      {rows.map((row, i) => (
        <div key={row.id || i} className="qe-flow__item">
          {i > 0 && <span className="qe-flow__arrow" aria-hidden>→</span>}
          <div className={`qe-chip qe-tone-${row[tagKey] === 'NVA' ? 'bad' : row[tagKey] === 'VA' ? 'ok' : 'idle'}`}>
            <span className="stx-text-caption">{row[tagKey] || (extraKey ? row[extraKey] : '') || `Step ${i + 1}`}</span>
            <strong className="stx-text-wrap">{clip(row[nameKey], 22) || 'Name the step'}</strong>
          </div>
        </div>
      ))}
    </div>
  )
}

function SetupVisual({ fields = {}, rows = [] }) {
  const max = Math.max(num(fields.baselineMin) || 1, num(fields.actualMin) || 0, num(fields.targetMin) || 0)
  const internal = rows.filter((r) => r.type === 'internal').reduce((s, r) => s + (num(r.minutes) || 0), 0)
  const external = rows.filter((r) => r.type === 'external').reduce((s, r) => s + (num(r.minutes) || 0), 0)
  return (
    <div className="qe-figure-stack">
      <BarRow label="Baseline min" value={num(fields.baselineMin) || 0} max={max} tone="bad" />
      <BarRow label="Target min" value={num(fields.targetMin) || 0} max={max} tone="ok" />
      <BarRow label="Actual min" value={num(fields.actualMin) || 0} max={max} tone="mid" />
      {(internal || external) ? (
        <>
          <BarRow label="Internal" value={internal} max={Math.max(internal + external, 1)} tone="bad" />
          <BarRow label="External" value={external} max={Math.max(internal + external, 1)} tone="ok" />
        </>
      ) : null}
    </div>
  )
}

function OeeVisual({ fields = {}, rows = [] }) {
  const oee = num(fields.oee) || 0
  const target = num(fields.targetOee) || 85
  return (
    <div className="qe-figure-stack">
      <GaugeVisual value={oee} label="OEE %" good={target} mid={Math.max(target - 15, 40)} />
      <div className="qe-kpis qe-kpis--tight">
        <div className="qe-kpi"><strong>{fields.availability || '—'}</strong><span className="stx-text-caption">A %</span></div>
        <div className="qe-kpi"><strong>{fields.performance || '—'}</strong><span className="stx-text-caption">P %</span></div>
        <div className="qe-kpi"><strong>{fields.quality || '—'}</strong><span className="stx-text-caption">Q %</span></div>
      </div>
      {rows.map((r, i) => (
        <BarRow key={r.id || i} label={r.loss} value={num(r.minutes) || 0} max={Math.max(...rows.map((x) => num(x.minutes) || 0), 1)} tone={statusTone(r.status)} />
      ))}
    </div>
  )
}

function LayersVisual({ fields = {}, rows = [] }) {
  const pass = rows.filter((r) => r.result === 'pass').length
  const fail = rows.filter((r) => r.result === 'fail').length
  return (
    <div className="qe-figure-stack">
      <div className="qe-pyramid">
        {['L4_plant', 'L3_manager', 'L2_supervisor', 'L1_operator'].map((layer) => (
          <div key={layer} className={`qe-pyramid__row ${fields.layer === layer ? 'is-active' : ''}`}>
            {layer.replace('_', ' ')}
          </div>
        ))}
      </div>
      <GaugeVisual value={fields.score} label="Score %" good={90} mid={75} />
      <BarRow label="Pass" value={pass} max={Math.max(pass + fail, 1)} tone="ok" />
      <BarRow label="Fail" value={fail} max={Math.max(pass + fail, 1)} tone="bad" />
    </div>
  )
}

function KpiVisual({ rows = [] }) {
  const items = rows.filter((k) => k.name)
  if (!items.length) {
    return <p className="stx-text-caption">Name KPIs and enter actual vs target to draw the board.</p>
  }
  return (
    <div className="qe-figure-stack">
      <div className="qe-kpis">
        {items.map((k, i) => (
          <div key={k.id || i} className="qe-kpi">
            <strong className="stx-text-wrap">{k.actual || '—'}</strong>
            <span className="stx-text-caption stx-text-wrap">{k.name} · target {k.target || '—'}</span>
          </div>
        ))}
      </div>
      {items.map((k, i) => {
        const actual = num(k.actual)
        const target = num(k.target)
        if (actual == null || target == null) return null
        return (
          <BarRow
            key={`bar-${k.id || i}`}
            label={k.name}
            value={actual}
            max={Math.max(actual, target, 1)}
            tone={actual >= target ? 'ok' : 'mid'}
          />
        )
      })}
    </div>
  )
}

function BeforeAfterVisual({ fields = {} }) {
  const current = num(fields.currentCount)
  const proposed = num(fields.proposedCount)
  const max = Math.max(current || 0, proposed || 0, 1)
  return (
    <div className="qe-figure-stack">
      <div className="qe-ba">
        <div className="qe-chip"><span>Now</span><strong className="stx-text-wrap">{fields.currentFreq || current || '—'}</strong></div>
        <span className="qe-flow__arrow">→</span>
        <div className="qe-chip qe-tone-ok"><span>Proposed</span><strong className="stx-text-wrap">{fields.proposedFreq || proposed || '—'}</strong></div>
      </div>
      {(current != null || proposed != null) && (
        <>
          <BarRow label="Current / period" value={current || 0} max={max} tone="mid" />
          <BarRow label="Proposed / period" value={proposed || 0} max={max} tone="ok" />
        </>
      )}
    </div>
  )
}

function FunnelVisual({ fields = {} }) {
  return (
    <div className="qe-funnel">
      <div>Lot {fields.lotSize || '—'}</div>
      <div>Sample n {fields.sampleSize || '—'}</div>
      <div>Ac {fields.accept || '—'} / Re {fields.reject || '—'}</div>
    </div>
  )
}

function TrafficVisual({ rows = [] }) {
  const maxPpm = Math.max(...rows.map((s) => num(s.ppm) || 0), 1)
  return (
    <div className="qe-figure-stack">
      <div className="qe-flow">
        {rows.map((s, i) => (
          <div key={s.id || i} className={`qe-chip qe-tone-${s.action === 'dock_to_stock' ? 'ok' : s.action === 'skip_lot' ? 'mid' : 'idle'}`}>
            <span className="stx-text-caption">{(s.action || 'incoming').replace(/_/g, ' ')}</span>
            <strong className="stx-text-wrap">{s.supplier || `Supplier ${i + 1}`}</strong>
          </div>
        ))}
      </div>
      {rows.map((s, i) => (
        <BarRow key={`ppm-${s.id || i}`} label={s.supplier || `Supplier ${i + 1}`} value={num(s.ppm) || 0} max={maxPpm} tone={(num(s.ppm) || 0) > 100 ? 'bad' : 'ok'} suffix=" ppm" />
      ))}
    </div>
  )
}

function SavingsVisual({ rows = [] }) {
  const items = rows.length ? rows : Array.from({ length: 4 }, (_, i) => ({ item: `Item ${i + 1}`, saving: 0 }))
  const max = Math.max(...items.map((x) => num(x.saving) || 0), 1)
  return (
    <div className="qe-figure-stack">
      {items.map((r, i) => (
        <BarRow key={r.id || i} label={r.item || `Item ${i + 1}`} value={num(r.saving) || 0} max={max} tone="ok" />
      ))}
    </div>
  )
}

function CoqVisual({ draft }) {
  const t = coqBucketTotals(draft)
  const max = Math.max(t.total, 1)
  const slices = [
    { key: 'prevention', value: t.prevention, className: 'qe-svg-pie--ok' },
    { key: 'appraisal', value: t.appraisal, className: 'qe-svg-pie--mid' },
    { key: 'internal_failure', value: t.internal_failure, className: 'qe-svg-pie--bad' },
    { key: 'external_failure', value: t.external_failure, className: 'qe-svg-pie--warn' },
  ]
  let cursor = 0
  const arcs = slices.map((s) => {
    const sweep = t.total > 0 ? (s.value / t.total) * 360 : 90
    const start = cursor
    const end = cursor + Math.max(sweep, t.total ? 0 : 90)
    cursor = end
    return { ...s, start, end }
  })
  return (
    <div className="qe-coq">
      <svg className="qe-svg qe-svg--pie" viewBox="0 0 220 220" aria-label="Cost of quality">
        {arcs.map((s) => (
          <path key={s.key} d={pieSlice(110, 110, 88, s.start, s.end)} className={s.className} />
        ))}
        <circle cx="110" cy="110" r="46" className="qe-svg-pie-hub" />
        <text x="110" y="106" textAnchor="middle" className="qe-svg-title">{t.total || 0}</text>
        <text x="110" y="124" textAnchor="middle" className="qe-svg-kicker">total</text>
      </svg>
      <div className="qe-figure-stack">
        <BarRow label="Prevention" value={t.prevention} max={max} tone="ok" />
        <BarRow label="Appraisal" value={t.appraisal} max={max} tone="mid" />
        <BarRow label="Internal failure" value={t.internal_failure} max={max} tone="bad" />
        <BarRow label="External failure" value={t.external_failure} max={max} tone="bad" />
      </div>
    </div>
  )
}

export default function QualityToolVisuals({ toolId, draft, onSelectCategory, activeCategory }) {
  const kind = QUALITY_VISUAL_KIND[toolId]
  const fields = draft.fields || {}
  const tables = draft.tables || {}

  return (
    <div className="qe-visual">
      <p className="qe-visual__label stx-text-caption">{FIGURE_TITLE[kind] || 'Figure'}</p>
      {kind === 'fishbone' && (
        <FishboneVisual draft={draft} onSelectCategory={onSelectCategory} activeCategory={activeCategory} />
      )}
      {kind === 'chain' && <ChainVisual rows={tables.chain} />}
      {kind === 'cycle' && <PdcaVisual fields={fields} />}
      {kind === 'stepper' && <StepperVisual rows={tables.disciplines} />}
      {kind === 'a3' && <A3Visual fields={fields} rows={tables.countermeasures} />}
      {kind === 'pareto' && <ParetoVisual rows={tables.items} />}
      {kind === 'control-chart' && <SpcVisual fields={fields} rows={tables.points} />}
      {kind === 'gauge' && <GageVisual fields={fields} />}
      {kind === 'capability' && <CapabilityVisual fields={fields} rows={tables.samples} />}
      {kind === 'rpn' && <RpnVisual rows={tables.modes} />}
      {kind === 'tree' && <TreeVisual draft={draft} />}
      {kind === 'stack' && <StackVisual fields={fields} rows={tables.components} />}
      {kind === 'shield' && <ShieldVisual fields={fields} />}
      {kind === 'matrix' && <DoeVisual factors={tables.factors} runs={tables.runs} />}
      {kind === 'flow' && <FlowVisual rows={tables.steps} extraKey="cycle" />}
      {kind === 'setup' && <SetupVisual fields={fields} rows={tables.elements} />}
      {kind === 'oee' && <OeeVisual fields={fields} rows={tables.losses} />}
      {kind === 'controls' && <FlowVisual rows={tables.rows} nameKey="ctq" tagKey="process" extraKey="sample" />}
      {kind === 'layers' && <LayersVisual fields={fields} rows={tables.checks} />}
      {kind === 'kpis' && <KpiVisual rows={tables.kpis} />}
      {kind === 'before-after' && <BeforeAfterVisual fields={fields} />}
      {kind === 'funnel' && <FunnelVisual fields={fields} />}
      {kind === 'matrix-2x2' && <ActionMatrix rows={tables.inspections} actions={['keep', 'merge', 'remove']} nameKey="inspection" />}
      {kind === 'trim' && <ActionMatrix rows={tables.rows} actions={['keep', 'merge', 'remove']} nameKey="ctq" />}
      {kind === 'inventory' && <ActionMatrix rows={tables.gauges} actions={['keep', 'extend', 'retire']} nameKey="gauge" />}
      {kind === 'traffic' && <TrafficVisual rows={tables.suppliers} />}
      {kind === 'savings' && <SavingsVisual rows={tables.items} />}
      {kind === 'gates' && <StepperVisual rows={tables.gates} keyField="phase" labelField="deliverable" />}
      {kind === 'buckets' && <CoqVisual draft={draft} />}
    </div>
  )
}
