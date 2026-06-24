import { useCallback, useEffect, useMemo, useState } from 'react'
import '../../styles/strefex-machinedb.css'
import {
  TIER_TAG_CLASS,
  buildSpecPairs,
  countSupplierMachines,
  getSupplier,
  getSupplierFlag,
  getSupplierName,
  machineApps,
  machineControl,
  machineDrive,
  machineFeatures,
  machineModel,
  machineNote,
  machineRating,
  machineSeries,
  machineSupplierId,
  stars,
  uniqueSorted,
} from '../../utils/machineDbHelpers'

const TABS = [
  { id: 'machines', label: 'Machine Catalogue' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'compare', label: 'Compare' },
  { id: 'benchmark', label: 'Benchmark' },
]

function Tag({ children, tone = 'blue' }) {
  return <span className={`stx-mdb-tag stx-mdb-tag-${tone}`}>{children}</span>
}

function MachineCard({ m, db, dbType, inCompare, onDetail, onToggleCompare }) {
  const sid = machineSupplierId(m)
  const specs = buildSpecPairs(m, dbType).slice(0, 6)
  const rating = machineRating(m)

  return (
    <div className="stx-mdb-card">
      <div className="stx-mdb-card-hdr">
        <span style={{ fontSize: 22, flexShrink: 0 }}>{getSupplierFlag(db, sid)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sub">{getSupplierName(db, sid)}</div>
          <h3 className="stx-text-wrap">{machineModel(m)}</h3>
        </div>
        <span className="badge">{machineSeries(m)}</span>
      </div>
      <div className="stx-mdb-card-body">
        <div className="stx-mdb-spec-grid">
          {specs.map(([lbl, val]) => (
            <div key={lbl} className="stx-mdb-spec-item">
              <div className="lbl">{lbl}</div>
              <div className="val">{val}</div>
            </div>
          ))}
        </div>
        <div className="stx-mdb-tags">
          {machineApps(m).slice(0, 3).map((a) => <Tag key={a}>{a}</Tag>)}
          {machineDrive(m) && <Tag key={machineDrive(m)} tone="green">{machineDrive(m)}</Tag>}
          {(m.processes || []).slice(0, 2).map((p) => (
            <Tag key={p} tone="green">{p}</Tag>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="stx-mdb-stars">{stars(rating)}</span>
          <Tag tone="amber">{m.p || m.price || ''}</Tag>
        </div>
        {m.price_eur && (
          <div className="stx-mdb-price">
            From ~€{m.price_eur.split('–')[0].replace(/[^\d,]/g, '').trim()}
          </div>
        )}
      </div>
      <div className="stx-mdb-card-footer">
        <button type="button" className="stx-mdb-btn stx-mdb-btn-outline stx-mdb-btn-sm" onClick={() => onDetail(m.id)}>
          Full Detail
        </button>
        <button
          type="button"
          className={`stx-mdb-btn stx-mdb-btn-sm ${inCompare ? 'stx-mdb-btn-gold' : 'stx-mdb-btn-primary'}`}
          onClick={() => onToggleCompare(m.id)}
        >
          {inCompare ? '✓ In Compare' : '+ Compare'}
        </button>
      </div>
    </div>
  )
}

function SupplierCard({ s, db, onDetail }) {
  const mc = countSupplierMachines(db, s.id)
  const tierClass = (TIER_TAG_CLASS[s.tier] || 'tag-gray').replace('tag-', '')

  return (
    <div className="stx-mdb-card">
      <div className="stx-mdb-card-hdr">
        <span style={{ fontSize: 28, flexShrink: 0 }}>{s.logo}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sub">{s.country} · {s.region}</div>
          <h3 className="stx-text-wrap">{s.name}</h3>
        </div>
        <span className="badge">{(s.tier || '').split(' ')[0]}</span>
      </div>
      <div className="stx-mdb-card-body">
        <div className="stx-mdb-spec-grid">
          <div className="stx-mdb-spec-item">
            <div className="lbl">Revenue</div>
            <div className="val" style={{ fontSize: 11 }}>{s.revenue || '—'}</div>
          </div>
          <div className="stx-mdb-spec-item">
            <div className="lbl">Employees</div>
            <div className="val">{s.employees || '—'}</div>
          </div>
          <div className="stx-mdb-spec-item">
            <div className="lbl">Founded</div>
            <div className="val">{s.founded || '—'}</div>
          </div>
          <div className="stx-mdb-spec-item">
            <div className="lbl">Models in DB</div>
            <div className="val">{mc}</div>
          </div>
        </div>
        <div className="stx-mdb-tags">
          {(s.specialties || []).map((sp) => <Tag key={sp}>{sp}</Tag>)}
        </div>
        <div className="stx-mdb-tags">
          {(s.certifications || []).map((c) => <Tag key={c} tone="green">{c}</Tag>)}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
          <strong>Strengths:</strong> {s.strengths || '—'}
        </p>
        {s.note && (
          <p style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>{s.note}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="stx-mdb-stars">{stars(s.rating || 0)}</span>
          <Tag tone={tierClass}>{s.tier || ''}</Tag>
        </div>
      </div>
      <div className="stx-mdb-card-footer">
        <button type="button" className="stx-mdb-btn stx-mdb-btn-outline stx-mdb-btn-sm" onClick={() => onDetail(s.id)}>
          Full Profile
        </button>
        {s.contacts?.web && (
          <a
            href={`https://${s.contacts.web.replace(/^https?:\/\//, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="stx-mdb-btn stx-mdb-btn-primary stx-mdb-btn-sm"
            style={{ textDecoration: 'none' }}
          >
            Website
          </a>
        )}
      </div>
    </div>
  )
}

function MachineModal({ m, db, dbType, onClose }) {
  const sid = machineSupplierId(m)
  const sup = getSupplier(db, sid)
  const specs = buildSpecPairs(m, dbType)
  const rating = machineRating(m)

  return (
    <div className="stx-mdb-modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="stx-mdb-modal" role="dialog" aria-modal="true">
        <div className="stx-mdb-modal-hdr">
          <h2 className="stx-text-wrap">
            {sup.logo || '🏭'} {machineModel(m)} — {machineSeries(m)}
          </h2>
          <button type="button" className="stx-mdb-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="stx-mdb-modal-body">
          <div className="stx-mdb-modal-grid">
            <div>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Specifications</div>
              <div className="stx-mdb-spec-grid">
                {specs.map(([lbl, val]) => (
                  <div key={lbl} className="stx-mdb-spec-item">
                    <div className="lbl">{lbl}</div>
                    <div className="val">{val}</div>
                  </div>
                ))}
              </div>
              {m.price_eur && (
                <div className="stx-mdb-price-highlight">
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Est. EUR Price Range
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>€{m.price_eur}</div>
                </div>
              )}
            </div>
            <div>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Applications</div>
              <div className="stx-mdb-tags" style={{ marginBottom: 8 }}>
                {machineApps(m).map((a) => <Tag key={a}>{a}</Tag>)}
              </div>
              {m.industries?.length > 0 && (
                <>
                  <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Industries</div>
                  <div className="stx-mdb-tags" style={{ marginBottom: 8 }}>
                    {m.industries.map((i) => <Tag key={i} tone="amber">{i}</Tag>)}
                  </div>
                </>
              )}
              {m.processes?.length > 0 && (
                <>
                  <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Processes</div>
                  <div className="stx-mdb-tags" style={{ marginBottom: 8 }}>
                    {m.processes.map((p) => <Tag key={p} tone="green">{p}</Tag>)}
                  </div>
                </>
              )}
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Key Features</div>
              <div className="stx-mdb-tags" style={{ marginBottom: 8 }}>
                {machineFeatures(m).map((f) => <Tag key={f} tone="gold">{f}</Tag>)}
              </div>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Control System</div>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>{machineControl(m)}</p>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Expert Notes</div>
              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>{machineNote(m)}</p>
              <div className="stx-mdb-stars" style={{ fontSize: 18, marginTop: 8 }}>
                {stars(rating)} <span style={{ fontSize: 13, color: 'var(--text2)' }}>{rating}/5</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SupplierModal({ s, db, onClose }) {
  const machines = db.machines.filter((m) => machineSupplierId(m) === s.id)
  const tierClass = (TIER_TAG_CLASS[s.tier] || 'tag-gray').replace('tag-', '')

  return (
    <div className="stx-mdb-modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="stx-mdb-modal" role="dialog" aria-modal="true">
        <div className="stx-mdb-modal-hdr">
          <h2 className="stx-text-wrap">{s.logo} {s.name} — Full Profile</h2>
          <button type="button" className="stx-mdb-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="stx-mdb-modal-body">
          <div className="stx-mdb-kpis">
            <div className="stx-mdb-kpi"><div className="num">{s.founded}</div><div className="lbl">Founded</div></div>
            <div className="stx-mdb-kpi"><div className="num">{s.employees}</div><div className="lbl">Employees</div></div>
            <div className="stx-mdb-kpi"><div className="num" style={{ fontSize: 13 }}>{s.revenue || '—'}</div><div className="lbl">Revenue</div></div>
            <div className="stx-mdb-kpi"><div className="num">{machines.length}</div><div className="lbl">Models in DB</div></div>
            <div className="stx-mdb-kpi"><div className="num stx-mdb-stars">{stars(s.rating || 0)}</div><div className="lbl">Rating</div></div>
            <div className="stx-mdb-kpi"><div className="num"><Tag tone={tierClass}>{s.tier || ''}</Tag></div><div className="lbl">Tier</div></div>
          </div>
          <div className="stx-mdb-modal-grid">
            <div>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Company Details</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.9 }}>
                <div><strong>HQ:</strong> {s.hq || '—'}</div>
                <div><strong>Region:</strong> {s.region} · {s.country}</div>
                <div><strong>Services:</strong> {s.services || '—'}</div>
                {s.contacts?.sales && <div><strong>Sales:</strong> {s.contacts.sales}</div>}
              </div>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13, marginTop: 12 }}>Industries</div>
              <div className="stx-mdb-tags">{(s.industries || []).map((i) => <Tag key={i} tone="amber">{i}</Tag>)}</div>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Processes</div>
              <div className="stx-mdb-tags">{(s.processes || []).map((p) => <Tag key={p} tone="green">{p}</Tag>)}</div>
            </div>
            <div>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Specialties</div>
              <div className="stx-mdb-tags">{(s.specialties || []).map((sp) => <Tag key={sp}>{sp}</Tag>)}</div>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Strengths</div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{s.strengths || '—'}</p>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Expert Notes</div>
              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>{s.note || '—'}</p>
              {machines.length > 0 && (
                <>
                  <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Models ({machines.length})</div>
                  <div className="stx-mdb-tags">
                    {machines.slice(0, 12).map((m) => (
                      <Tag key={m.id} tone="gold">{machineModel(m)}</Tag>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StrefexMachineDbPage({ catalog }) {
  const { dbType } = catalog
  const db = useMemo(
    () => ({
      suppliers: (catalog.db?.suppliers || []).filter(Boolean),
      machines: (catalog.db?.machines || []).filter(Boolean),
    }),
    [catalog.db],
  )
  const [tab, setTab] = useState('machines')
  const [compareList, setCompareList] = useState([])
  const [machineModalId, setMachineModalId] = useState(null)
  const [supplierModalId, setSupplierModalId] = useState(null)

  const [mSearch, setMSearch] = useState('')
  const [mSup, setMSup] = useState('')
  const [mApp, setMApp] = useState('')
  const [mProc, setMProc] = useState('')
  const [mInd, setMInd] = useState('')

  const [sSearch, setSSearch] = useState('')
  const [sRegion, setSRegion] = useState('')
  const [sCountry, setSCountry] = useState('')
  const [sTier, setSTier] = useState('')
  const [sProcess, setSProcess] = useState('')

  const filterOptions = useMemo(() => ({
    suppliers: db.suppliers.map((s) => ({ id: s.id, name: s.name })),
    regions: uniqueSorted(db.suppliers.map((s) => s.region)),
    countries: uniqueSorted(db.suppliers.map((s) => s.country)),
    tiers: uniqueSorted(db.suppliers.map((s) => s.tier)),
    supplierProcesses: uniqueSorted(db.suppliers.flatMap((s) => s?.processes || [])),
    apps: uniqueSorted(db.machines.flatMap((m) => machineApps(m))),
    machineProcesses: dbType === 'imm'
      ? uniqueSorted(db.machines.map((m) => machineDrive(m)).filter(Boolean))
      : uniqueSorted(db.machines.flatMap((m) => m?.processes || [])),
    industries: uniqueSorted(db.machines.flatMap((m) => m?.industries || [])),
  }), [db, dbType])

  const filteredMachines = useMemo(() => {
    let list = db.machines.slice()
    if (mSearch) {
      const q = mSearch.toLowerCase()
      list = list.filter((m) => JSON.stringify(m).toLowerCase().includes(q))
    }
    if (mSup) list = list.filter((m) => machineSupplierId(m) === mSup)
    if (mApp) list = list.filter((m) => machineApps(m).includes(mApp))
    if (mProc) {
      list = list.filter((m) => (
        dbType === 'imm'
          ? machineDrive(m) === mProc
          : (m.processes || machineApps(m)).includes(mProc)
      ))
    }
    if (mInd) list = list.filter((m) => (m.industries || machineApps(m)).includes(mInd))
    return list
  }, [db.machines, dbType, mSearch, mSup, mApp, mProc, mInd])

  const filteredSuppliers = useMemo(() => {
    let list = db.suppliers.slice()
    if (sSearch) {
      const q = sSearch.toLowerCase()
      list = list.filter((s) =>
        (s.name + s.country + (s.specialties || []).join('') + (s.strengths || '') + (s.note || '') + (s.processes || []).join(''))
          .toLowerCase()
          .includes(q),
      )
    }
    if (sRegion) list = list.filter((s) => s.region === sRegion)
    if (sTier) list = list.filter((s) => s.tier === sTier)
    if (sCountry) list = list.filter((s) => s.country === sCountry)
    if (sProcess) list = list.filter((s) => (s.processes || []).includes(sProcess))
    return list
  }, [db.suppliers, sSearch, sRegion, sCountry, sTier, sProcess])

  const compareMachines = useMemo(
    () => compareList.map((id) => db.machines.find((m) => m.id === id)).filter(Boolean),
    [compareList, db.machines],
  )

  const topRated = useMemo(
    () => [...db.machines].sort((a, b) => machineRating(b) - machineRating(a)).slice(0, 8),
    [db.machines],
  )

  const bestValue = useMemo(
    () => db.machines.filter((m) => m.p === '€' || m.p === '€€').sort((a, b) => machineRating(b) - machineRating(a)).slice(0, 5),
    [db.machines],
  )

  const toggleCompare = useCallback((id) => {
    setCompareList((prev) => {
      const idx = prev.indexOf(id)
      if (idx !== -1) return prev.filter((x) => x !== id)
      if (prev.length >= 6) {
        window.alert('Max 6 machines.')
        return prev
      }
      return [...prev, id]
    })
  }, [])

  const clearCompare = () => setCompareList([])

  const resetMachineFilters = () => {
    setMSearch('')
    setMSup('')
    setMApp('')
    setMProc('')
    setMInd('')
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMachineModalId(null)
        setSupplierModalId(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const machineModal = machineModalId ? db.machines.find((m) => m.id === machineModalId) : null
  const supplierModal = supplierModalId ? db.suppliers.find((s) => s.id === supplierModalId) : null

  const compareSpecKeys = useMemo(() => {
    const keys = {}
    compareMachines.forEach((m) => {
      buildSpecPairs(m, dbType).forEach(([k]) => { keys[k] = true })
    })
    return Object.keys(keys)
  }, [compareMachines, dbType])

  return (
    <div className="stx-mdb">
      <div className="stx-mdb-tabs-wrap">
        <div className="stx-mdb-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`stx-mdb-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'compare' && compareList.length > 0 && (
                <span className="stx-mdb-cmp-badge">{compareList.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="app-page-card stx-mdb-main">
        {tab === 'machines' && (
          <>
            {compareList.length > 0 && (
              <div className="stx-mdb-compare-bar">
                <span>Comparing:</span>
                <div className="stx-mdb-compare-chips">
                  {compareList.map((id) => {
                    const m = db.machines.find((x) => x.id === id)
                    return (
                      <div key={id} className="stx-mdb-chip">
                        {m ? machineModel(m) : id}
                        <button type="button" className="x" onClick={() => toggleCompare(id)} aria-label="Remove">✕</button>
                      </div>
                    )
                  })}
                </div>
                <button type="button" className="stx-mdb-btn stx-mdb-btn-gold stx-mdb-btn-sm" onClick={() => setTab('compare')}>
                  Compare Now
                </button>
                <button
                  type="button"
                  className="stx-mdb-btn stx-mdb-btn-outline stx-mdb-btn-sm"
                  onClick={clearCompare}
                >
                  Clear All
                </button>
              </div>
            )}

            <div className="stx-mdb-search-row">
              <div className="stx-mdb-sf wide">
                <label htmlFor="m-search">Search</label>
                <input id="m-search" type="text" placeholder="Model, supplier, application, process…" value={mSearch} onChange={(e) => setMSearch(e.target.value)} />
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="m-sup">Supplier</label>
                <select id="m-sup" value={mSup} onChange={(e) => setMSup(e.target.value)}>
                  <option value="">All Suppliers</option>
                  {filterOptions.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="m-ind">Industry</label>
                <select id="m-ind" value={mInd} onChange={(e) => setMInd(e.target.value)}>
                  <option value="">All Industries</option>
                  {filterOptions.industries.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="m-proc">{dbType === 'imm' ? 'Drive' : 'Process'}</label>
                <select id="m-proc" value={mProc} onChange={(e) => setMProc(e.target.value)}>
                  <option value="">{dbType === 'imm' ? 'All Drives' : 'All Processes'}</option>
                  {filterOptions.machineProcesses.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="m-app">Application</label>
                <select id="m-app" value={mApp} onChange={(e) => setMApp(e.target.value)}>
                  <option value="">All Applications</option>
                  {filterOptions.apps.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <button type="button" className="stx-mdb-btn stx-mdb-btn-outline stx-mdb-btn-sm" onClick={resetMachineFilters}>
                Reset
              </button>
            </div>

            <div className="stx-mdb-stats">
              Showing <b>{filteredMachines.length}</b>/<b>{db.machines.length}</b> machines
            </div>

            {filteredMachines.length === 0 ? (
              <div className="stx-mdb-empty"><div className="ico">🔍</div><p>No machines match.</p></div>
            ) : (
              <div className="stx-mdb-cards-grid">
                {filteredMachines.map((m) => (
                  <MachineCard
                    key={m.id}
                    m={m}
                    db={db}
                    dbType={dbType}
                    inCompare={compareList.includes(m.id)}
                    onDetail={setMachineModalId}
                    onToggleCompare={toggleCompare}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'suppliers' && (
          <>
            <div className="stx-mdb-search-row">
              <div className="stx-mdb-sf wide">
                <label htmlFor="s-search">Search</label>
                <input id="s-search" type="text" placeholder="Name, country, specialty, process…" value={sSearch} onChange={(e) => setSSearch(e.target.value)} />
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="s-region">Region</label>
                <select id="s-region" value={sRegion} onChange={(e) => setSRegion(e.target.value)}>
                  <option value="">All Regions</option>
                  {filterOptions.regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="s-country">Country</label>
                <select id="s-country" value={sCountry} onChange={(e) => setSCountry(e.target.value)}>
                  <option value="">All Countries</option>
                  {filterOptions.countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="s-tier">Tier</label>
                <select id="s-tier" value={sTier} onChange={(e) => setSTier(e.target.value)}>
                  <option value="">All Tiers</option>
                  {filterOptions.tiers.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="s-process">Process</label>
                <select id="s-process" value={sProcess} onChange={(e) => setSProcess(e.target.value)}>
                  <option value="">All Processes</option>
                  {filterOptions.supplierProcesses.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {filteredSuppliers.length === 0 ? (
              <div className="stx-mdb-empty"><div className="ico">🏭</div><p>No suppliers found.</p></div>
            ) : (
              <>
                <div className="stx-mdb-stats">
                  Showing <b>{filteredSuppliers.length}</b>/<b>{db.suppliers.length}</b> suppliers
                </div>
                <div className="stx-mdb-cards-grid">
                  {filteredSuppliers.map((s) => (
                    <SupplierCard key={s.id} s={s} db={db} onDetail={setSupplierModalId} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'compare' && (
          compareMachines.length === 0 ? (
            <div className="stx-mdb-empty">
              <div className="ico">⚖️</div>
              <p>Select 2–6 machines from <strong>Machine Catalogue</strong> and click <strong>+ Compare</strong>.</p>
            </div>
          ) : (
            <div className="stx-mdb-compare-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 160 }}>Specification</th>
                    {compareMachines.map((m) => {
                      const sid = machineSupplierId(m)
                      return (
                        <th key={m.id} style={{ minWidth: 180 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 18 }}>{getSupplierFlag(db, sid)}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{machineModel(m)}</div>
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{getSupplierName(db, sid)}</div>
                            </div>
                          </div>
                          <button type="button" className="stx-mdb-btn stx-mdb-btn-outline stx-mdb-btn-sm" style={{ fontSize: 10, marginTop: 4 }} onClick={() => toggleCompare(m.id)}>
                            ✕ Remove
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {compareSpecKeys.map((key) => (
                    <tr key={key}>
                      <td>{key}</td>
                      {compareMachines.map((m) => {
                        const sp = buildSpecPairs(m, dbType).find(([k]) => k === key)
                        return <td key={m.id}>{sp ? sp[1] : '—'}</td>
                      })}
                    </tr>
                  ))}
                  <tr className="stx-mdb-compare-section-row">
                    <td>Applications</td>
                    {compareMachines.map((m) => (
                      <td key={m.id}>{machineApps(m).map((a) => <Tag key={a}>{a}</Tag>)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Industries</td>
                    {compareMachines.map((m) => (
                      <td key={m.id}>{(m.industries || []).map((i) => <Tag key={i} tone="amber">{i}</Tag>)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>{dbType === 'imm' ? 'Drive' : 'Processes'}</td>
                    {compareMachines.map((m) => (
                      <td key={m.id}>
                        {dbType === 'imm'
                          ? (machineDrive(m) ? <Tag tone="green">{machineDrive(m)}</Tag> : '—')
                          : (m.processes || []).map((p) => <Tag key={p} tone="green">{p}</Tag>)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Key Features</td>
                    {compareMachines.map((m) => (
                      <td key={m.id}>{machineFeatures(m).slice(0, 3).map((f) => <Tag key={f} tone="gold">{f}</Tag>)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Est. EUR Price</td>
                    {compareMachines.map((m) => (
                      <td key={m.id} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{m.price_eur ? `€${m.price_eur}` : '—'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Rating</td>
                    {compareMachines.map((m) => (
                      <td key={m.id} className="stx-mdb-stars">{stars(machineRating(m))} {machineRating(m)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Expert Notes</td>
                    {compareMachines.map((m) => (
                      <td key={m.id} style={{ fontSize: 11, color: 'var(--text2)' }}>{machineNote(m)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'benchmark' && (
          <>
            <div className="stx-mdb-sec-title">Benchmark Rankings</div>
            <div className="stx-mdb-cards-grid">
              {[
                { title: 'Top Rated', items: topRated },
                { title: 'Best Value', items: bestValue },
              ].map(({ title: rankTitle, items }) => (
                <div key={rankTitle} className="stx-mdb-card">
                  <div className="stx-mdb-card-hdr">
                    <h3 style={{ fontSize: 13 }}>{rankTitle}</h3>
                  </div>
                  <div className="stx-mdb-card-body" style={{ gap: 6 }}>
                    {items.map((m, i) => {
                      const sid = machineSupplierId(m)
                      return (
                        <button key={m.id} type="button" className="stx-mdb-rank-row" onClick={() => setMachineModalId(m.id)}>
                          <span className={`stx-mdb-rank-num${i === 0 ? ' stx-mdb-rank-num--first' : ''}`}>{i + 1}</span>
                          <span style={{ fontSize: 18 }}>{getSupplierFlag(db, sid)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }} className="stx-text-wrap">{machineModel(m)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{getSupplierName(db, sid)}</div>
                          </div>
                          <span className="stx-mdb-stars" style={{ whiteSpace: 'nowrap' }}>{stars(machineRating(m))}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {machineModal && (
        <MachineModal m={machineModal} db={db} dbType={dbType} onClose={() => setMachineModalId(null)} />
      )}
      {supplierModal && (
        <SupplierModal s={supplierModal} db={db} onClose={() => setSupplierModalId(null)} />
      )}
    </div>
  )
}
