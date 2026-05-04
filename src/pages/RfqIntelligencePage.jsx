import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import '../styles/app-page.css'
import '../styles/rfq-intelligence.css'
import {
  RFQI_MATERIALS,
  RFQI_MANUFACTURERS,
  RFQI_PROCESSES,
  calcPartCost,
  finishFactor,
  runRfqIntelQuickCalc,
  tolFactor,
} from '../data/rfqIntelligenceCalc'
import { useRfqIntelligenceStore } from '../store/rfqIntelligenceStore'

const MAT_CATS = [
  { id: 'plastic', label: 'Plastic' },
  { id: 'aluminium', label: 'Aluminium' },
  { id: 'steel', label: 'Steel' },
  { id: 'stainless', label: 'Stainless' },
  { id: 'composite', label: 'Composite' },
]

const TABS = [
  { id: 'new', label: 'New RFQ' },
  { id: 'incoming', label: 'Incoming RFQs' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'calculator', label: 'Calculator' },
]

export default function RfqIntelligencePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const tab =
    ['new', 'incoming', 'quotes', 'calculator'].includes(searchParams.get('tab'))
      ? searchParams.get('tab')
      : 'new'

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', id)
    setSearchParams(next, { replace: true })
  }

  const qiIndustry = searchParams.get('industryId') || ''
  const qiCategory = searchParams.get('categoryId') || ''

  const incoming = useRfqIntelligenceStore((s) => s.getIncomingList())
  const readIncomingIds = useRfqIntelligenceStore((s) => s.readIncomingIds)
  const markIncomingRead = useRfqIntelligenceStore((s) => s.markIncomingRead)
  const quotes = useRfqIntelligenceStore((s) => s.quotes)
  const saveQuote = useRfqIntelligenceStore((s) => s.saveQuote)
  const setLastToolingEUR = useRfqIntelligenceStore((s) => s.setLastToolingEUR)
  const setLastCalculatorSnapshot = useRfqIntelligenceStore((s) => s.setLastCalculatorSnapshot)

  /* ── Wizard ── */
  const [step, setStep] = useState(1)
  const [processId, setProcessId] = useState('imm')
  const [matCat, setMatCat] = useState('plastic')
  const [materialId, setMaterialId] = useState('pp')
  const [partName, setPartName] = useState('')
  const [customer, setCustomer] = useState('')
  const [qtyProto, setQtyProto] = useState(5)
  const [qtyProd, setQtyProd] = useState(10000)
  const [weightG, setWeightG] = useState(120)
  const [tolKey, setTolKey] = useState('standard')
  const [finKey, setFinKey] = useState('asmanufactured')

  /* ── Calculator tab ── */
  const [calcProc, setCalcProc] = useState('imm')
  const [calcMat, setCalcMat] = useState('pp')
  const [calcComplexity, setCalcComplexity] = useState(1.5)
  const [calcWeight, setCalcWeight] = useState(120)
  const [calcTol, setCalcTol] = useState(1)
  const [calcFinish, setCalcFinish] = useState(1)
  const [calcVol, setCalcVol] = useState(10000)
  const [calcMach, setCalcMach] = useState(85)
  const [calcLabour, setCalcLabour] = useState(35)
  const [calcOvh, setCalcOvh] = useState(180)
  const [calcTool, setCalcTool] = useState(45000)
  const [calcShots, setCalcShots] = useState(1000000)
  const [calcMargin, setCalcMargin] = useState(25)

  useEffect(() => {
    const p = searchParams.get('part')
    const c = searchParams.get('customer')
    const q = searchParams.get('qtyProd')
    if (p) setPartName(p)
    if (c) setCustomer(c)
    if (q && !Number.isNaN(Number(q))) setQtyProd(Number(q))
  }, [searchParams])

  useEffect(() => {
    const p = RFQI_PROCESSES[calcProc]
    if (p && !Number.isFinite(calcMach)) setCalcMach(p.machineRate)
  }, [calcProc, calcMach])

  const matList = useMemo(
    () => RFQI_MATERIALS.filter((m) => matCat === 'all' || m.cat === matCat),
    [matCat],
  )

  const selectedMat = RFQI_MATERIALS.find((m) => m.id === materialId) || RFQI_MATERIALS[0]

  const liveEstimate =
    selectedMat && weightG > 0
      ? calcPartCost({
          proc: processId,
          mat: selectedMat,
          weightG,
          tolMult: tolFactor(tolKey),
          finishMult: finishFactor(finKey),
          qty: Math.max(qtyProd, 100),
          complexity: 'medium',
        })
      : null

  const mfgs = RFQI_MANUFACTURERS.filter((m) => m.process.includes(processId)).slice(0, 4)

  const calcResult = useMemo(
    () =>
      runRfqIntelQuickCalc({
        procId: calcProc,
        materialId: calcMat,
        complexity: calcComplexity,
        weightG: calcWeight,
        tol: calcTol,
        finish: calcFinish,
        vol: Math.max(calcVol, 1),
        machineRate: calcMach,
        labourRate: calcLabour,
        overheadPct: calcOvh,
        tooling: calcTool,
        toolShots: Math.max(calcShots, 1),
        marginPct: calcMargin,
      }),
    [
      calcProc,
      calcMat,
      calcComplexity,
      calcWeight,
      calcTol,
      calcFinish,
      calcVol,
      calcMach,
      calcLabour,
      calcOvh,
      calcTool,
      calcShots,
      calcMargin,
    ],
  )

  useEffect(() => {
    setLastCalculatorSnapshot(calcResult)
  }, [calcResult, setLastCalculatorSnapshot])

  const handleGenerateQuote = () => {
    if (!selectedMat) return
    const tol = tolFactor(tolKey)
    const fin = finishFactor(finKey)
    const proto = calcPartCost({
      proc: processId,
      mat: selectedMat,
      weightG,
      tolMult: tol,
      finishMult: fin,
      qty: qtyProto,
      complexity: 'medium',
    })
    const prod = calcPartCost({
      proc: processId,
      mat: selectedMat,
      weightG,
      tolMult: tol,
      finishMult: fin,
      qty: Math.max(qtyProd, 100),
      complexity: 'medium',
    })
    let toolingEUR = prod.toolingMouldEUR ?? 0
    if (processId === 'imm') toolingEUR = toolingEUR || 45000

    const sub =
      toolingEUR +
      proto.total * qtyProto +
      prod.total * qtyProd +
      850
    const qNo = `QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`

    setLastToolingEUR(toolingEUR)
    saveQuote({
      quoteNo: qNo,
      partName: partName || 'Custom part',
      customer: customer || 'Customer',
      process: RFQI_PROCESSES[processId]?.name,
      material: selectedMat.name,
      toolingEUR,
      protoUnit: proto.total,
      prodUnit: prod.total,
      qtyProto,
      qtyProd,
      subtotalEUR: sub,
      industryId: qiIndustry || undefined,
      categoryId: qiCategory || undefined,
    })

    setTab('quotes')
    setStep(1)
  }

  const prefilledFromIndustry =
    qiIndustry || qiCategory ? ` · ${qiIndustry}${qiCategory ? ` / ${qiCategory}` : ''}` : ''

  const loadIncomingToWizard = (r) => {
    markIncomingRead(r.id)
    setPartName(r.part)
    setCustomer(r.company)
    setQtyProd(r.qty)
    setTab('new')
    setStep(1)
  }

  return (
    <AppLayout>
      <div className="app-page rfqi-scope">
        <Link className="app-page-back-link" to="/main-menu">
          ← Back
        </Link>
        <p className="app-page-subtitle" style={{ marginTop: 4 }}>
          RFQ intelligence — manufacturing quotation flow{prefilledFromIndustry}
        </p>

        <div className="rfqi-hdr">
          <div className="rfqi-brand">
            RFQ<span className="rfqi-brand-dot">.</span>INTELLIGENCE
          </div>
          <div className="rfqi-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`rfqi-tab ${tab === t.id ? 'rfqi-tab--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'new' && (
          <div className="rfqi-grid-2">
            <div className="app-page-card">
              <div className="rfqi-steps">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`rfqi-step ${step === n ? 'rfqi-step--active' : ''}`}
                    onClick={() => setStep(n)}
                  >
                    <div>{n === 1 ? 'Part & qty' : n === 2 ? 'Process' : 'Material'}</div>
                  </button>
                ))}
              </div>

              {step === 1 && (
                <>
                  <h3 className="app-page-title" style={{ fontSize: 16 }}>
                    Part details
                  </h3>
                  <div className="rfqi-form-grid" style={{ marginBottom: 12 }}>
                    <div>
                      <div className="rfqi-label">Part name</div>
                      <input
                        className="rfqi-inp"
                        value={partName}
                        onChange={(e) => setPartName(e.target.value)}
                        placeholder="Bracket, housing…"
                      />
                    </div>
                    <div>
                      <div className="rfqi-label">Customer</div>
                      <input
                        className="rfqi-inp"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        placeholder="Company"
                      />
                    </div>
                    <div>
                      <div className="rfqi-label">Production qty</div>
                      <input
                        className="rfqi-inp"
                        type="number"
                        min={1}
                        value={qtyProd}
                        onChange={(e) => setQtyProd(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <div className="rfqi-label">Prototype qty</div>
                      <input
                        className="rfqi-inp"
                        type="number"
                        min={1}
                        value={qtyProto}
                        onChange={(e) => setQtyProto(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <div className="rfqi-label">Weight (g)</div>
                      <input
                        className="rfqi-inp"
                        type="number"
                        min={1}
                        value={weightG}
                        onChange={(e) => setWeightG(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="rfqi-form-grid">
                    <div>
                      <div className="rfqi-label">Tolerance</div>
                      <select className="rfqi-inp" value={tolKey} onChange={(e) => setTolKey(e.target.value)}>
                        <option value="standard">Standard</option>
                        <option value="medium">Medium</option>
                        <option value="tight">Tight</option>
                        <option value="precision">Precision</option>
                      </select>
                    </div>
                    <div>
                      <div className="rfqi-label">Finish</div>
                      <select className="rfqi-inp" value={finKey} onChange={(e) => setFinKey(e.target.value)}>
                        <option value="asmanufactured">As manufactured</option>
                        <option value="fine">Fine</option>
                        <option value="smooth">Smooth</option>
                        <option value="mirror">Mirror</option>
                        <option value="anodised">Anodised</option>
                      </select>
                    </div>
                  </div>
                  <div className="rfqi-btn-row">
                    <button type="button" className="app-page-btn-primary" onClick={() => setStep(2)}>
                      Next: process →
                    </button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h3 className="app-page-title" style={{ fontSize: 16 }}>
                    Manufacturing process
                  </h3>
                  <div className="rfqi-process-grid">
                    {Object.entries(RFQI_PROCESSES).map(([id, pr]) => (
                      <button
                        key={id}
                        type="button"
                        className={`rfqi-process-card ${processId === id ? 'rfqi-process-card--on' : ''}`}
                        onClick={() => setProcessId(id)}
                      >
                        <div style={{ fontSize: 20 }} aria-hidden>
                          {id === 'imm'
                            ? '⚙️'
                            : id === 'cnc'
                              ? '🔩'
                              : id === 'sheet'
                                ? '📐'
                                : id === '3dp'
                                  ? '🖨️'
                                  : '🏭'}
                        </div>
                        <strong>{pr.name}</strong>
                      </button>
                    ))}
                  </div>
                  <div className="rfqi-btn-row">
                    <button type="button" className="app-page-action" onClick={() => setStep(1)}>
                      ← Back
                    </button>
                    <button type="button" className="app-page-btn-primary" onClick={() => setStep(3)}>
                      Next: material →
                    </button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h3 className="app-page-title" style={{ fontSize: 16 }}>
                    Material grade
                  </h3>
                  <div className="rfqi-chip-group">
                    {MAT_CATS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`rfqi-chip ${matCat === c.id ? 'rfqi-chip--on' : ''}`}
                        onClick={() => {
                          setMatCat(c.id)
                          const first = RFQI_MATERIALS.find((m) => m.cat === c.id)
                          if (first) setMaterialId(first.id)
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <div className="rfqi-mat-list">
                    {matList.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`rfqi-mat-row ${materialId === m.id ? 'rfqi-mat-row--on' : ''}`}
                        onClick={() => setMaterialId(m.id)}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{m.name}</div>
                          <div className="rfqi-muted">{m.grade}</div>
                        </div>
                        <span>€{m.price}/kg</span>
                        <span className="rfqi-muted">{m.density}</span>
                      </button>
                    ))}
                  </div>
                  <div className="rfqi-btn-row">
                    <button type="button" className="app-page-action" onClick={() => setStep(2)}>
                      ← Back
                    </button>
                    <button type="button" className="app-page-btn-primary" onClick={handleGenerateQuote}>
                      Generate quote &amp; save
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="rfqi-summary-panel">
              <h4 className="app-page-title" style={{ fontSize: 14 }}>
                Live summary
              </h4>
              <div className="rfqi-summary-row">
                <span className="rfqi-muted">Part</span>
                <span>{partName || '—'}</span>
              </div>
              <div className="rfqi-summary-row">
                <span className="rfqi-muted">Customer</span>
                <span>{customer || '—'}</span>
              </div>
              <div className="rfqi-summary-row">
                <span className="rfqi-muted">Process</span>
                <span>{RFQI_PROCESSES[processId]?.name}</span>
              </div>
              <div className="rfqi-summary-row">
                <span className="rfqi-muted">Material</span>
                <span>{selectedMat?.name}</span>
              </div>
              <div className="rfqi-summary-row">
                <span className="rfqi-muted">Qty (prod/proto)</span>
                <span>
                  {qtyProd} / {qtyProto}
                </span>
              </div>
              {liveEstimate && (
                <div style={{ marginTop: 14 }}>
                  <div className="rfqi-muted" style={{ marginBottom: 8 }}>
                    Est. production unit €{liveEstimate.total.toFixed(4)}
                  </div>
                  {[
                    ['Material', liveEstimate.material, '#4fc3f7'],
                    ['Machining', liveEstimate.machining, '#00d4ff'],
                    ['Overhead', liveEstimate.overhead, '#b060ff'],
                  ].map(([lbl, val, color]) => {
                    const pct = Math.round((val / Math.max(liveEstimate.total, 1e-6)) * 100)
                    return (
                      <div key={lbl} className="rfqi-cost-bar">
                        <span style={{ width: 88, flexShrink: 0 }}>{lbl}</span>
                        <div className="rfqi-cost-bar-track">
                          <div
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              height: '100%',
                              background: color,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                        <span style={{ width: 64, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                <div className="rfqi-muted" style={{ marginBottom: 8 }}>
                  Matched equipment makers
                </div>
                {mfgs.map((m) => (
                  <div key={m.name} className="rfqi-summary-row">
                    <span>{m.name}</span>
                    <span className="rfqi-muted">
                      {m.country} · risk {m.risk}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'incoming' && (
          <div className="app-page-card">
            <h3 className="app-page-title">Incoming RFQs</h3>
            <p className="rfqi-muted" style={{ marginBottom: 14 }}>
              Open an RFQ to pre-fill the wizard — also surfaced on Notifications.
            </p>
            {incoming.map((r) => (
              <div key={r.id} className="rfqi-inbox-row" onClick={() => loadIncomingToWizard(r)}>
                <span className="rfqi-dot" style={{ background: r.color }} />
                <div>
                  <strong>{r.part}</strong>
                  <div className="rfqi-muted">
                    {r.id} · {r.company} · {r.process}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>{r.value}</strong>
                  {!readIncomingIds.includes(r.id) && (
                    <div className="rfqi-muted" style={{ marginTop: 4 }}>
                      New
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'quotes' && (
          <div className="app-page-card">
            <h3 className="app-page-title">Saved quotes</h3>
            <p className="rfqi-muted">
              Quotes sync to Profile and feed Enterprise CAPEX tooling bridge.
            </p>
            {quotes.length === 0 && <p className="rfqi-muted">No quotes saved yet.</p>}
            {quotes.map((q) => (
              <div key={q.id} className="rfqi-quote-block">
                <strong>{q.quoteNo}</strong>
                {' · '}
                {q.partName}
                <div className="rfqi-muted">{q.customer}</div>
                <div style={{ marginTop: 6 }}>
                  Prod unit €{(q.prodUnit ?? 0).toFixed(3)} · Tooling €{(q.toolingEUR ?? 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'calculator' && (
          <div className="rfqi-grid-2">
            <div className="app-page-card">
              <h3 className="app-page-title">Part price calculator</h3>
              <p className="rfqi-muted">Rates tie through to RFQ tooling and Enterprise CAPEX.</p>
              <div className="rfqi-form-grid rfqi-form-grid--3">
                <div>
                  <div className="rfqi-label">Process</div>
                  <select className="rfqi-inp" value={calcProc} onChange={(e) => setCalcProc(e.target.value)}>
                    {Object.keys(RFQI_PROCESSES).map((id) => (
                      <option key={id} value={id}>
                        {RFQI_PROCESSES[id].name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="rfqi-label">Material</div>
                  <select className="rfqi-inp" value={calcMat} onChange={(e) => setCalcMat(e.target.value)}>
                    {RFQI_MATERIALS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="rfqi-label">Complexity</div>
                  <input
                    className="rfqi-inp"
                    type="number"
                    step={0.1}
                    value={calcComplexity}
                    onChange={(e) => setCalcComplexity(Number(e.target.value))}
                  />
                </div>
                <div>
                  <div className="rfqi-label">Weight (g)</div>
                  <input
                    className="rfqi-inp"
                    type="number"
                    value={calcWeight}
                    onChange={(e) => setCalcWeight(Number(e.target.value))}
                  />
                </div>
                <div>
                  <div className="rfqi-label">Tol. mult.</div>
                  <input className="rfqi-inp" type="number" step={0.1} value={calcTol} onChange={(e) => setCalcTol(Number(e.target.value))} />
                </div>
                <div>
                  <div className="rfqi-label">Finish mult.</div>
                  <input
                    className="rfqi-inp"
                    type="number"
                    step={0.05}
                    value={calcFinish}
                    onChange={(e) => setCalcFinish(Number(e.target.value))}
                  />
                </div>
                <div>
                  <div className="rfqi-label">Annual volume</div>
                  <input className="rfqi-inp" type="number" value={calcVol} onChange={(e) => setCalcVol(Number(e.target.value))} />
                </div>
                <div>
                  <div className="rfqi-label">Machine €/hr</div>
                  <input className="rfqi-inp" type="number" value={calcMach} onChange={(e) => setCalcMach(Number(e.target.value))} />
                </div>
                <div>
                  <div className="rfqi-label">Labour €/hr</div>
                  <input className="rfqi-inp" type="number" value={calcLabour} onChange={(e) => setCalcLabour(Number(e.target.value))} />
                </div>
                <div>
                  <div className="rfqi-label">Overhead %</div>
                  <input className="rfqi-inp" type="number" value={calcOvh} onChange={(e) => setCalcOvh(Number(e.target.value))} />
                </div>
                <div>
                  <div className="rfqi-label">Tooling €</div>
                  <input className="rfqi-inp" type="number" value={calcTool} onChange={(e) => setCalcTool(Number(e.target.value))} />
                </div>
                <div>
                  <div className="rfqi-label">Amort shots</div>
                  <input className="rfqi-inp" type="number" value={calcShots} onChange={(e) => setCalcShots(Number(e.target.value))} />
                </div>
                <div>
                  <div className="rfqi-label">Margin %</div>
                  <input className="rfqi-inp" type="number" value={calcMargin} onChange={(e) => setCalcMargin(Number(e.target.value))} />
                </div>
              </div>
              <button
                type="button"
                className="app-page-btn-primary"
                style={{ marginTop: 14 }}
                onClick={() =>
                  navigate(
                    `/enterprise/capex?fromRfqCalc=1&tooling=${encodeURIComponent(String(calcTool))}`,
                  )
                }
              >
                Send tooling to Enterprise CAPEX
              </button>
            </div>
            <div className="rfqi-summary-panel app-page-card">
              <h4 className="app-page-title" style={{ fontSize: 14 }}>
                Breakdown
              </h4>
              {calcResult.rows.map((row) => {
                const pct = Math.round((row.value / Math.max(calcResult.unitPrice, 1e-6)) * 100)
                return (
                  <div key={row.label} className="rfqi-cost-bar">
                    <span style={{ width: 100 }}>{row.label}</span>
                    <div className="rfqi-cost-bar-track">
                      <div
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          height: '100%',
                          background: row.color,
                        }}
                      />
                    </div>
                    <span className="rfqi-price-cell" style={{ fontSize: 13 }}>
                      €{row.value.toFixed(4)}
                    </span>
                  </div>
                )
              })}
              <div style={{ marginTop: 12 }}>
                <div className="rfqi-muted">Unit (ex-margin)</div>
                <strong>€{calcResult.preMargin.toFixed(4)}</strong>
              </div>
              <div>
                <div className="rfqi-muted">With margin</div>
                <strong className="rfqi-price-cell">€{calcResult.unitPrice.toFixed(4)}</strong>
              </div>
              <table className="rfqi-volume-table">
                <thead>
                  <tr>
                    <th>Volume</th>
                    <th className="rfqi-price-cell">€ / unit</th>
                  </tr>
                </thead>
                <tbody>
                  {calcResult.volumePrices.map((vp) => (
                    <tr key={vp.vol}>
                      <td>{vp.vol.toLocaleString()} pcs</td>
                      <td className="rfqi-price-cell">€{vp.unit.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
