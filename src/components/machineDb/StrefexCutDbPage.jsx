import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  aiOfflineAnswer,
  buildToolSpecPairs,
  calcSpeedFeed,
  filterMachines,
  filterSuppliers,
  filterTools,
  findSupplierByLabel,
  uniqueSorted,
  uniqueToolApplications,
} from '../../utils/cutDbHelpers'
import CutDbToolIcon from './CutDbToolIcon'
import '../../styles/strefex-machinedb.css'

const TABS = [
  { id: 'tools', label: 'Tool Catalogue' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'machines', label: 'Machine Brands' },
  { id: 'compare', label: 'Compare' },
  { id: 'coatings', label: 'Coatings & Materials' },
  { id: 'calc', label: 'Speed Calc' },
  { id: 'bench', label: 'Benchmark' },
  { id: 'ai', label: 'AI Advisor' },
]

const DIAM_RANGES = [
  { value: '0-3', label: '≤ 3 mm (micro)' },
  { value: '3-6', label: '3–6 mm' },
  { value: '6-12', label: '6–12 mm' },
  { value: '12-25', label: '12–25 mm' },
  { value: '25-50', label: '25–50 mm' },
  { value: '50-999', label: '≥ 50 mm (heavy)' },
]

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'code', label: 'Code A–Z' },
  { value: 'diam-asc', label: 'Diameter ↑' },
  { value: 'diam-desc', label: 'Diameter ↓' },
]

const MAT_LABELS = {
  'p-low': 'Low Carbon Steel ≤200 HB',
  'p-med': 'Alloy Steel 200–280 HB',
  'p-hard': 'Hardened Steel 280–350 HB',
  'm-aust': 'Austenitic Stainless (304,316)',
  'm-mart': 'Martensitic Stainless (17-4PH)',
  'm-duplex': 'Duplex Stainless',
  'k-grey': 'Grey Cast Iron HB150–220',
  'k-nod': 'Nodular / Ductile Iron',
  'n-al': 'Aluminium / Al Alloys',
  'n-cu': 'Copper / Brass',
  'n-mg': 'Magnesium Alloys',
  's-ti': 'Titanium Ti6Al4V',
  's-in': 'Inconel 718',
  's-co': 'Cobalt Alloys (Stellite)',
  'h-45': 'Hardened Steel HRC 45–55',
  'h-60': 'Hardened Steel HRC 55–65',
  'cfrp': 'CFRP / Carbon Fibre',
  'gfrp': 'GFRP / Glass Fibre',
}

const TOOL_SUBSTRATE_LABELS = {
  hss: 'HSS — High Speed Steel',
  'hss-co': 'HSS-Co — Cobalt HSS',
  'carbide-tin': 'Solid Carbide + TiN',
  'carbide-tialn': 'Solid Carbide + TiAlN',
  'carbide-alcr': 'Solid Carbide + AlCrN',
  'carbide-dlc': 'Solid Carbide + DLC',
  'carbide-pcd': 'PCD (Polycrystalline Diamond)',
  'carbide-cbn': 'CBN (Cubic Boron Nitride)',
  ceramic: 'Ceramic Insert',
}

const OP_OPTIONS = [
  { value: 'mill', label: 'Milling (End Mill, Face Mill)' },
  { value: 'drill', label: 'Drilling' },
  { value: 'turn', label: 'Turning (OD/ID)' },
  { value: 'ream', label: 'Reaming' },
  { value: 'tap', label: 'Tapping' },
  { value: 'thread', label: 'Thread Milling' },
  { value: 'bore', label: 'Boring' },
]

const COOLANT_OPTIONS = [
  { value: 'flood', label: 'Flood Emulsion' },
  { value: 'mql', label: 'MQL (Minimum Quantity)' },
  { value: 'dry', label: 'Dry' },
  { value: 'highp', label: 'High-Pressure (≥40 bar)' },
  { value: 'air', label: 'Compressed Air' },
]

function stars(n) {
  const rounded = Math.round(Number(n) || 0)
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded)
}

function Tag({ children, tone = 'blue' }) {
  return <span className={`stx-mdb-tag stx-mdb-tag-${tone}`}>{children}</span>
}

function ToolCard({ tool, resolveSupplier, inCompare, onDetail, onToggleCompare }) {
  const specs = buildToolSpecPairs(tool).slice(0, 6)
  const primarySupplierName = (tool.suppliers || [])[0]
  const supplier = resolveSupplier(primarySupplierName)
  const typeLabel = tool.subtype || tool.type

  return (
    <div className={`stx-mdb-card stx-cutdb-tool-card${inCompare ? ' stx-cutdb-tool-card--selected' : ''}`}>
      <div className="stx-cutdb-tool-card__illus">
        <span className="stx-cutdb-tool-card__type-badge" title={typeLabel}>{typeLabel}</span>
        <CutDbToolIcon tool={tool} />
      </div>
      <div className="stx-cutdb-tool-card__body">
        {(supplier?.name || primarySupplierName) && (
          <p className="stx-cutdb-tool-card__supplier-line stx-text-caption" title={supplier?.name || primarySupplierName}>
            {supplier?.name || primarySupplierName}
          </p>
        )}
        <h3 className="stx-cutdb-tool-card__name" title={tool.name}>{tool.name}</h3>
        <p className="stx-cutdb-tool-card__code" title={tool.code}>{tool.code}</p>
        <div className="stx-mdb-tags stx-cutdb-tool-card__tags">
          {tool.coating && <Tag tone="gold">{tool.coating}</Tag>}
          {tool.isoClass && <Tag>{`ISO ${tool.isoClass}`}</Tag>}
          {(tool.materials || []).slice(0, 2).map((m) => <Tag key={m} tone="green">{m}</Tag>)}
          {(tool.processes || []).slice(0, 1).map((p) => (
            <Tag key={p} tone="amber">{p}</Tag>
          ))}
        </div>
        <div className="stx-mdb-spec-grid stx-cutdb-tool-card__specs">
          {specs.map(([lbl, val]) => (
            <div key={lbl} className="stx-mdb-spec-item">
              <div className="lbl">{lbl}</div>
              <div className="val">{val}</div>
            </div>
          ))}
        </div>
        {tool.price && (
          <div className="stx-cutdb-tool-card__meta">
            <Tag tone="amber">{tool.price}</Tag>
          </div>
        )}
      </div>
      <div className="stx-mdb-card-footer stx-cutdb-tool-card__footer">
        <button type="button" className="stx-mdb-btn stx-mdb-btn-outline stx-mdb-btn-sm" onClick={() => onDetail(tool.id)}>
          Full Detail
        </button>
        <button
          type="button"
          className={`stx-mdb-btn stx-mdb-btn-sm ${inCompare ? 'stx-mdb-btn-gold' : 'stx-mdb-btn-primary'}`}
          onClick={() => onToggleCompare(tool.id)}
        >
          {inCompare ? '✓ In Compare' : '+ Compare'}
        </button>
      </div>
    </div>
  )
}

function ToolModal({ tool, onClose }) {
  const specs = buildToolSpecPairs(tool)

  return (
    <div className="stx-mdb-modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="stx-mdb-modal" role="dialog" aria-modal="true">
        <div className="stx-mdb-modal-hdr stx-cutdb-modal-hdr">
          <div className="stx-cutdb-modal-hdr__icon">
            <CutDbToolIcon tool={tool} width={56} height={44} />
          </div>
          <h2 className="stx-text-wrap stx-text-heading">{tool.name}</h2>
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
              {tool.price && (
                <div className="stx-mdb-price-highlight">
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Price Range
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>{tool.price}</div>
                </div>
              )}
            </div>
            <div>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Work Materials</div>
              <div className="stx-mdb-tags" style={{ marginBottom: 8 }}>
                {(tool.materials || []).map((m) => <Tag key={m}>{m}</Tag>)}
              </div>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Processes</div>
              <div className="stx-mdb-tags" style={{ marginBottom: 8 }}>
                {(tool.processes || []).map((p) => <Tag key={p} tone="green">{p}</Tag>)}
              </div>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Machine Types</div>
              <div className="stx-mdb-tags" style={{ marginBottom: 8 }}>
                {(tool.machineTypes || []).map((mt) => <Tag key={mt} tone="amber">{mt}</Tag>)}
              </div>
              <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Suppliers</div>
              <div className="stx-mdb-tags" style={{ marginBottom: 8 }}>
                {(tool.suppliers || []).map((s) => <Tag key={s} tone="gold">{s}</Tag>)}
              </div>
              {tool.application && (
                <>
                  <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Application</div>
                  <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>{tool.application}</p>
                </>
              )}
              {tool.notes && (
                <>
                  <div className="stx-mdb-sec-title" style={{ fontSize: 13 }}>Notes</div>
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>{tool.notes}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SupplierCard({ supplier }) {
  return (
    <div className="stx-mdb-card stx-cutdb-entity-card">
      <div className="stx-mdb-card-hdr stx-cutdb-entity-card__hdr">
        <div className="stx-cutdb-entity-card__hdr-row">
          <span className="stx-cutdb-entity-logo">{supplier.logo}</span>
          <div className="stx-cutdb-card-text">
            <h3 className="stx-cutdb-entity-card__name" title={supplier.name}>{supplier.name}</h3>
            <p className="sub">{supplier.country} · {supplier.region}</p>
          </div>
        </div>
        {supplier.category && (
          <span className="badge stx-cutdb-entity-card__category">{supplier.category}</span>
        )}
      </div>
      <div className="stx-mdb-card-body">
        <p className="stx-text-small stx-cutdb-entity-desc" title={supplier.desc}>{supplier.desc}</p>
        <div className="stx-mdb-tags">
          {(supplier.tools || []).slice(0, 6).map((t) => <Tag key={t}>{t}</Tag>)}
        </div>
        <div className="stx-cutdb-entity-card__footer">
          <span className="stx-mdb-stars">{stars(supplier.rating || 0)}</span>
          {supplier.website && (
            <a
              href={supplier.website}
              target="_blank"
              rel="noopener noreferrer"
              className="stx-mdb-btn stx-mdb-btn-outline stx-mdb-btn-sm stx-cutdb-entity-card__link"
            >
              Website
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function MachineBrandCard({ machine }) {
  return (
    <div className="stx-mdb-card stx-cutdb-entity-card">
      <div className="stx-mdb-card-hdr stx-cutdb-entity-card__hdr">
        <div className="stx-cutdb-entity-card__hdr-row">
          <span className="stx-cutdb-entity-logo">{machine.logo}</span>
          <div className="stx-cutdb-card-text">
            <h3 className="stx-cutdb-entity-card__name" title={machine.name}>{machine.name}</h3>
            <p className="sub">{machine.country} · {machine.region}</p>
          </div>
        </div>
        {machine.category && (
          <span className="badge stx-cutdb-entity-card__category">{machine.category}</span>
        )}
      </div>
      <div className="stx-mdb-card-body">
        <p className="stx-text-small stx-cutdb-entity-desc" title={machine.desc}>{machine.desc}</p>
        <div className="stx-mdb-tags">
          {(machine.types || []).map((t) => <Tag key={t} tone="green">{t}</Tag>)}
        </div>
        {machine.industries && (
          <div className="stx-mdb-tags">
            <Tag tone="amber">{machine.industries}</Tag>
          </div>
        )}
        {machine.website && (
          <div className="stx-cutdb-entity-card__footer stx-cutdb-entity-card__footer--solo">
            <a
              href={machine.website}
              target="_blank"
              rel="noopener noreferrer"
              className="stx-mdb-btn stx-mdb-btn-outline stx-mdb-btn-sm stx-cutdb-entity-card__link"
            >
              Website
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StrefexCutDbPage() {
  const [db, setDb] = useState(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('../../data/cutDbSeed')
      .then((mod) => {
        if (!cancelled) setDb(mod.CUT_DB)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loadError) {
    return (
      <div className="stx-mdb stx-mdb--cutdb">
        <div className="app-page-card stx-mdb-main">
          <div className="stx-mdb-empty">
            <div className="ico">⚠️</div>
            <p className="stx-text-body">CutDB could not be loaded. Please refresh and try again.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!db) {
    return (
      <div className="stx-mdb stx-mdb--cutdb">
        <p className="stx-text-body stx-cutdb-loading">Loading CutDB…</p>
      </div>
    )
  }

  return <StrefexCutDbPageInner db={db} />
}

function StrefexCutDbPageInner({ db }) {
  const [tab, setTab] = useState('tools')
  const [compareList, setCompareList] = useState([])
  const [toolModalId, setToolModalId] = useState(null)

  const [tSearch, setTSearch] = useState('')
  const [tType, setTType] = useState('')
  const [tSubtype, setTSubtype] = useState('')
  const [tCoat, setTCoat] = useState('')
  const [tSubstrate, setTSubstrate] = useState('')
  const [tMat, setTMat] = useState('')
  const [tIso, setTIso] = useState('')
  const [tProc, setTProc] = useState('')
  const [tApp, setTApp] = useState('')
  const [tMachtype, setTMachtype] = useState('')
  const [tSup, setTSup] = useState('')
  const [tDiam, setTDiam] = useState('')
  const [tHard, setTHard] = useState('')
  const [tSort, setTSort] = useState('')
  const [showMoreToolFilters, setShowMoreToolFilters] = useState(false)

  const [sSearch, setSSearch] = useState('')
  const [sRegion, setSRegion] = useState('')
  const [sCategory, setSCategory] = useState('')

  const [mSearch, setMSearch] = useState('')
  const [mRegion, setMRegion] = useState('')
  const [mCategory, setMCategory] = useState('')
  const [mType, setMType] = useState('')

  const [calcOp, setCalcOp] = useState('mill')
  const [calcDia, setCalcDia] = useState(10)
  const [calcMat, setCalcMat] = useState('p-low')
  const [calcTool, setCalcTool] = useState('carbide-tialn')
  const [calcFl, setCalcFl] = useState(4)
  const [calcAp, setCalcAp] = useState(2)
  const [calcAe, setCalcAe] = useState(5)
  const [calcMaxRpm, setCalcMaxRpm] = useState(12000)
  const [calcCool, setCalcCool] = useState('flood')

  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')

  const filterOptions = useMemo(() => ({
    types: uniqueSorted(db.tools.map((t) => t.type)),
    subtypes: uniqueSorted(db.tools.map((t) => t.subtype)),
    coatings: uniqueSorted(db.tools.map((t) => t.coating)),
    substrates: uniqueSorted(db.tools.map((t) => t.substrate)),
    materials: uniqueSorted(db.tools.flatMap((t) => t.materials || [])),
    isoClasses: uniqueSorted(db.tools.map((t) => t.isoClass)),
    processes: uniqueSorted(db.tools.flatMap((t) => t.processes || [])),
    applications: uniqueToolApplications(db.tools),
    machineTypes: uniqueSorted(db.tools.flatMap((t) => t.machineTypes || [])),
    suppliers: uniqueSorted(db.tools.flatMap((t) => t.suppliers || [])),
    hardness: uniqueSorted(db.tools.map((t) => t.hardness)),
    supRegions: uniqueSorted(db.suppliers.map((s) => s.region)),
    supCategories: uniqueSorted(db.suppliers.map((s) => s.category)),
    machRegions: uniqueSorted(db.machines.map((m) => m.region)),
    machCategories: uniqueSorted(db.machines.map((m) => m.category)),
    machTypes: uniqueSorted(db.machines.flatMap((m) => m.types || [])),
    matGroups: Object.keys(db.vcTable || {}),
  }), [db])

  const toolFilters = useMemo(() => ({
    q: tSearch,
    type: tType,
    subtype: tSubtype,
    coat: tCoat,
    substrate: tSubstrate,
    mat: tMat,
    iso: tIso,
    proc: tProc,
    app: tApp,
    machtype: tMachtype,
    sup: tSup,
    diam: tDiam,
    hard: tHard,
    sort: tSort,
  }), [tSearch, tType, tSubtype, tCoat, tSubstrate, tMat, tIso, tProc, tApp, tMachtype, tSup, tDiam, tHard, tSort])

  const resolveSupplier = useCallback(
    (label) => findSupplierByLabel(db.suppliers, label),
    [db.suppliers],
  )

  const filteredTools = useMemo(
    () => filterTools(db.tools, toolFilters),
    [db.tools, toolFilters],
  )

  const filteredSuppliers = useMemo(
    () => filterSuppliers(db.suppliers, { q: sSearch, region: sRegion, category: sCategory }),
    [sSearch, sRegion, sCategory],
  )

  const filteredMachines = useMemo(
    () => filterMachines(db.machines, { q: mSearch, region: mRegion, category: mCategory, type: mType }),
    [mSearch, mRegion, mCategory, mType],
  )

  const compareTools = useMemo(
    () => compareList.map((id) => db.tools.find((t) => t.id === id)).filter(Boolean),
    [compareList],
  )

  const compareSpecKeys = useMemo(() => {
    const keys = {}
    compareTools.forEach((t) => {
      buildToolSpecPairs(t).forEach(([k]) => { keys[k] = true })
    })
    return Object.keys(keys)
  }, [compareTools])

  const calcResult = useMemo(
    () => calcSpeedFeed(db, {
      op: calcOp,
      dia: calcDia,
      mat: calcMat,
      tool: calcTool,
      fl: calcFl,
      ap: calcAp,
      ae: calcAe,
      maxRpm: calcMaxRpm,
      cool: calcCool,
    }),
    [calcOp, calcDia, calcMat, calcTool, calcFl, calcAp, calcAe, calcMaxRpm, calcCool],
  )

  const toggleCompare = useCallback((id) => {
    setCompareList((prev) => {
      const idx = prev.indexOf(id)
      if (idx !== -1) return prev.filter((x) => x !== id)
      if (prev.length >= 6) {
        window.alert('Max 6 tools.')
        return prev
      }
      return [...prev, id]
    })
  }, [])

  const clearCompare = () => setCompareList([])

  const resetToolFilters = () => {
    setTSearch('')
    setTType('')
    setTSubtype('')
    setTCoat('')
    setTSubstrate('')
    setTMat('')
    setTIso('')
    setTProc('')
    setTApp('')
    setTMachtype('')
    setTSup('')
    setTDiam('')
    setTHard('')
    setTSort('')
  }

  const submitAi = (e) => {
    e.preventDefault()
    setAiAnswer(aiOfflineAnswer(db, aiQuestion))
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setToolModalId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const toolModal = toolModalId ? db.tools.find((t) => t.id === toolModalId) : null

  return (
    <div className="stx-mdb stx-mdb--cutdb">
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
        {tab === 'tools' && (
          <>
            {compareList.length > 0 && (
              <div className="stx-mdb-compare-bar">
                <span>Comparing:</span>
                <div className="stx-mdb-compare-chips">
                  {compareList.map((id) => {
                    const tool = db.tools.find((x) => x.id === id)
                    return (
                      <div key={id} className="stx-mdb-chip">
                        {tool ? tool.code : id}
                        <button type="button" className="x" onClick={() => toggleCompare(id)} aria-label="Remove">✕</button>
                      </div>
                    )
                  })}
                </div>
                <button type="button" className="stx-mdb-btn stx-mdb-btn-gold stx-mdb-btn-sm" onClick={() => setTab('compare')}>
                  Compare Now
                </button>
                <button type="button" className="stx-mdb-btn stx-mdb-btn-outline stx-mdb-btn-sm" onClick={clearCompare}>
                  Clear All
                </button>
              </div>
            )}

            <div className="stx-mdb-search-row">
              <div className="stx-mdb-sf wide">
                <label htmlFor="cutdb-search">Search</label>
                <input
                  id="cutdb-search"
                  type="text"
                  placeholder="Name, code, material, process, supplier…"
                  value={tSearch}
                  onChange={(e) => setTSearch(e.target.value)}
                />
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="cutdb-sup">Supplier</label>
                <select id="cutdb-sup" value={tSup} onChange={(e) => setTSup(e.target.value)}>
                  <option value="">All Suppliers</option>
                  {filterOptions.suppliers.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="cutdb-type">Type</label>
                <select id="cutdb-type" value={tType} onChange={(e) => setTType(e.target.value)}>
                  <option value="">All Types</option>
                  {filterOptions.types.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="cutdb-proc">Process</label>
                <select id="cutdb-proc" value={tProc} onChange={(e) => setTProc(e.target.value)}>
                  <option value="">All Processes</option>
                  {filterOptions.processes.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="cutdb-app">Application</label>
                <select id="cutdb-app" value={tApp} onChange={(e) => setTApp(e.target.value)}>
                  <option value="">All Applications</option>
                  {filterOptions.applications.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <button
                type="button"
                className="stx-mdb-btn stx-mdb-btn-outline stx-mdb-btn-sm stx-mdb-filter-toggle"
                onClick={() => setShowMoreToolFilters((v) => !v)}
              >
                {showMoreToolFilters ? 'Fewer filters' : 'More filters'}
              </button>
              <button type="button" className="stx-mdb-btn stx-mdb-btn-outline stx-mdb-btn-sm" onClick={resetToolFilters}>
                Reset
              </button>
            </div>

            {showMoreToolFilters && (
              <div className="stx-mdb-search-row stx-mdb-search-row--secondary">
                <div className="stx-mdb-sf">
                  <label htmlFor="cutdb-mat">Material</label>
                  <select id="cutdb-mat" value={tMat} onChange={(e) => setTMat(e.target.value)}>
                    <option value="">All Materials</option>
                    {filterOptions.materials.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="stx-mdb-sf">
                  <label htmlFor="cutdb-subtype">Subtype</label>
                  <select id="cutdb-subtype" value={tSubtype} onChange={(e) => setTSubtype(e.target.value)}>
                    <option value="">All Subtypes</option>
                    {filterOptions.subtypes.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="stx-mdb-sf">
                  <label htmlFor="cutdb-coat">Coating</label>
                  <select id="cutdb-coat" value={tCoat} onChange={(e) => setTCoat(e.target.value)}>
                    <option value="">All Coatings</option>
                    {filterOptions.coatings.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="stx-mdb-sf">
                  <label htmlFor="cutdb-substrate">Substrate</label>
                  <select id="cutdb-substrate" value={tSubstrate} onChange={(e) => setTSubstrate(e.target.value)}>
                    <option value="">All Substrates</option>
                    {filterOptions.substrates.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="stx-mdb-sf">
                  <label htmlFor="cutdb-iso">ISO</label>
                  <select id="cutdb-iso" value={tIso} onChange={(e) => setTIso(e.target.value)}>
                    <option value="">All ISO Classes</option>
                    {filterOptions.isoClasses.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="stx-mdb-sf">
                  <label htmlFor="cutdb-machtype">Machine type</label>
                  <select id="cutdb-machtype" value={tMachtype} onChange={(e) => setTMachtype(e.target.value)}>
                    <option value="">All Machine Types</option>
                    {filterOptions.machineTypes.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="stx-mdb-sf">
                  <label htmlFor="cutdb-diam">Diameter</label>
                  <select id="cutdb-diam" value={tDiam} onChange={(e) => setTDiam(e.target.value)}>
                    <option value="">All Diameters</option>
                    {DIAM_RANGES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="stx-mdb-sf">
                  <label htmlFor="cutdb-hard">Hardness</label>
                  <select id="cutdb-hard" value={tHard} onChange={(e) => setTHard(e.target.value)}>
                    <option value="">All Hardness</option>
                    {filterOptions.hardness.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="stx-mdb-sf">
                  <label htmlFor="cutdb-sort">Sort</label>
                  <select id="cutdb-sort" value={tSort} onChange={(e) => setTSort(e.target.value)}>
                    {SORT_OPTIONS.map((o) => <option key={o.value || 'default'} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="stx-mdb-stats">
              Showing <b>{filteredTools.length}</b>/<b>{db.tools.length}</b> tools
            </div>

            {filteredTools.length === 0 ? (
              <div className="stx-mdb-empty"><div className="ico">🔍</div><p>No tools match.</p></div>
            ) : (
              <div className="stx-mdb-cards-grid">
                {filteredTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    resolveSupplier={resolveSupplier}
                    inCompare={compareList.includes(tool.id)}
                    onDetail={setToolModalId}
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
                <label htmlFor="cutdb-s-search">Search</label>
                <input
                  id="cutdb-s-search"
                  type="text"
                  placeholder="Name, country, tools…"
                  value={sSearch}
                  onChange={(e) => setSSearch(e.target.value)}
                />
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="cutdb-s-region">Region</label>
                <select id="cutdb-s-region" value={sRegion} onChange={(e) => setSRegion(e.target.value)}>
                  <option value="">All regions</option>
                  {filterOptions.supRegions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="cutdb-s-cat">Category</label>
                <select id="cutdb-s-cat" value={sCategory} onChange={(e) => setSCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {filterOptions.supCategories.map((c) => <option key={c} value={c}>{c}</option>)}
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
                  {filteredSuppliers.map((s) => <SupplierCard key={s.id} supplier={s} />)}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'machines' && (
          <>
            <div className="stx-mdb-search-row">
              <div className="stx-mdb-sf wide">
                <label htmlFor="cutdb-m-search">Search</label>
                <input
                  id="cutdb-m-search"
                  type="text"
                  placeholder="Brand, type, industry…"
                  value={mSearch}
                  onChange={(e) => setMSearch(e.target.value)}
                />
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="cutdb-m-type">Type</label>
                <select id="cutdb-m-type" value={mType} onChange={(e) => setMType(e.target.value)}>
                  <option value="">All types</option>
                  {filterOptions.machTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="cutdb-m-region">Region</label>
                <select id="cutdb-m-region" value={mRegion} onChange={(e) => setMRegion(e.target.value)}>
                  <option value="">All regions</option>
                  {filterOptions.machRegions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="cutdb-m-cat">Category</label>
                <select id="cutdb-m-cat" value={mCategory} onChange={(e) => setMCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {filterOptions.machCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {filteredMachines.length === 0 ? (
              <div className="stx-mdb-empty"><div className="ico">🏭</div><p>No machine brands found.</p></div>
            ) : (
              <>
                <div className="stx-mdb-stats">
                  Showing <b>{filteredMachines.length}</b>/<b>{db.machines.length}</b> brands
                </div>
                <div className="stx-mdb-cards-grid">
                  {filteredMachines.map((m) => <MachineBrandCard key={m.id} machine={m} />)}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'compare' && (
          compareTools.length === 0 ? (
            <div className="stx-mdb-empty">
              <div className="ico">⚖️</div>
              <p>Select 2–6 tools from <strong>Tool Catalogue</strong> and click <strong>+ Compare</strong>.</p>
            </div>
          ) : (
            <div className="stx-mdb-compare-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 160 }}>Specification</th>
                    {compareTools.map((tool) => (
                      <th key={tool.id} style={{ minWidth: 180 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }} className="stx-text-wrap">{tool.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{tool.code}</div>
                        </div>
                        <button type="button" className="stx-mdb-btn stx-mdb-btn-outline stx-mdb-btn-sm" style={{ fontSize: 10, marginTop: 4 }} onClick={() => toggleCompare(tool.id)}>
                          ✕ Remove
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareSpecKeys.map((key) => (
                    <tr key={key}>
                      <td>{key}</td>
                      {compareTools.map((tool) => {
                        const sp = buildToolSpecPairs(tool).find(([k]) => k === key)
                        return <td key={tool.id}>{sp ? sp[1] : '—'}</td>
                      })}
                    </tr>
                  ))}
                  <tr className="stx-mdb-compare-section-row">
                    <td>Materials</td>
                    {compareTools.map((tool) => (
                      <td key={tool.id}>{(tool.materials || []).map((m) => <Tag key={m}>{m}</Tag>)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Processes</td>
                    {compareTools.map((tool) => (
                      <td key={tool.id}>{(tool.processes || []).map((p) => <Tag key={p} tone="green">{p}</Tag>)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Suppliers</td>
                    {compareTools.map((tool) => (
                      <td key={tool.id}>{(tool.suppliers || []).map((s) => <Tag key={s} tone="gold">{s}</Tag>)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Price</td>
                    {compareTools.map((tool) => (
                      <td key={tool.id} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{tool.price || '—'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Notes</td>
                    {compareTools.map((tool) => (
                      <td key={tool.id} style={{ fontSize: 11, color: 'var(--text2)' }}>{tool.notes || '—'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'coatings' && (
          <>
            <div className="stx-mdb-sec-title">Coating Technology Index</div>
            <div className="stx-mdb-stats" style={{ marginBottom: 12 }}>
              <b>{db.coatings.length}</b> coatings · <b>{db.materials.length}</b> ISO material classes
            </div>
            <div className="stx-mdb-cards-grid">
              {db.coatings.map((c) => (
                <div key={c.name} className="stx-mdb-card stx-cutdb-info-card">
                  <div className="stx-cutdb-info-card__hdr">
                    <span className="badge">{c.name}</span>
                    <h3 className="stx-cutdb-info-card__title stx-text-wrap">{c.fullname}</h3>
                  </div>
                  <div className="stx-mdb-card-body">
                    <div className="stx-mdb-spec-grid">
                      <div className="stx-mdb-spec-item">
                        <div className="lbl">Hardness</div>
                        <div className="val">{c.hardness}</div>
                      </div>
                      <div className="stx-mdb-spec-item">
                        <div className="lbl">Max Temp</div>
                        <div className="val">{c.maxTemp}</div>
                      </div>
                      <div className="stx-mdb-spec-item">
                        <div className="lbl">Applied</div>
                        <div className="val">{c.applied}</div>
                      </div>
                      <div className="stx-mdb-spec-item">
                        <div className="lbl">Friction</div>
                        <div className="val">{c.friction}</div>
                      </div>
                    </div>
                    <div className="stx-mdb-tags">
                      <Tag tone="amber">{c.color}</Tag>
                      <Tag>{c.materials}</Tag>
                    </div>
                    <p className="stx-cutdb-info-card__note stx-text-wrap">{c.notes}</p>
                    <p className="stx-cutdb-info-card__note stx-text-wrap">
                      <strong>Best for:</strong> {c.best}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="stx-mdb-sec-title stx-cutdb-info-card__section-title">Work Material Index (ISO Classes)</div>
            <div className="stx-mdb-cards-grid">
              {db.materials.map((m) => (
                <div
                  key={m.iso}
                  className="stx-mdb-card stx-cutdb-info-card stx-cutdb-info-card--iso"
                  style={{ '--cutdb-iso-accent': m.color }}
                >
                  <div className="stx-cutdb-info-card__hdr stx-cutdb-info-card__hdr--row">
                    <span className="stx-cutdb-iso-badge">{m.iso}</span>
                    <div className="stx-cutdb-card-text">
                      <h3 className="stx-cutdb-info-card__title stx-text-wrap">{m.name}</h3>
                      <p className="sub">{m.sub}</p>
                    </div>
                  </div>
                  <div className="stx-mdb-card-body">
                    <div className="stx-mdb-spec-grid">
                      <div className="stx-mdb-spec-item">
                        <div className="lbl">Hardness</div>
                        <div className="val">{m.hardness}</div>
                      </div>
                      <div className="stx-mdb-spec-item">
                        <div className="lbl">Chip type</div>
                        <div className="val">{m.chipType}</div>
                      </div>
                      <div className="stx-mdb-spec-item stx-mdb-spec-item--wide">
                        <div className="lbl">Recommended</div>
                        <div className="val">{m.recommended}</div>
                      </div>
                    </div>
                    <p className="stx-cutdb-info-card__note stx-text-wrap">{m.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'calc' && (
          <>
            <div className="stx-mdb-sec-title">CNC Cutting Speed & Feed Calculator</div>
            <div className="stx-mdb-search-row">
              <div className="stx-mdb-sf">
                <label htmlFor="calc-op">Operation</label>
                <select id="calc-op" value={calcOp} onChange={(e) => setCalcOp(e.target.value)}>
                  {OP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="calc-dia">Diameter (mm)</label>
                <input id="calc-dia" type="number" min="0.1" step="0.1" value={calcDia} onChange={(e) => setCalcDia(Number(e.target.value))} />
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="calc-mat">Material group</label>
                <select id="calc-mat" value={calcMat} onChange={(e) => setCalcMat(e.target.value)}>
                  {filterOptions.matGroups.map((k) => (
                    <option key={k} value={k}>{MAT_LABELS[k] || k}</option>
                  ))}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="calc-tool">Tool substrate</label>
                <select id="calc-tool" value={calcTool} onChange={(e) => setCalcTool(e.target.value)}>
                  {Object.keys(db.toolIdx || {}).map((k) => (
                    <option key={k} value={k}>{TOOL_SUBSTRATE_LABELS[k] || k}</option>
                  ))}
                </select>
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="calc-fl">Flutes</label>
                <input id="calc-fl" type="number" min="1" max="16" value={calcFl} onChange={(e) => setCalcFl(Number(e.target.value))} />
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="calc-ap">ap (mm)</label>
                <input id="calc-ap" type="number" min="0.01" step="0.01" value={calcAp} onChange={(e) => setCalcAp(Number(e.target.value))} />
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="calc-ae">ae (mm)</label>
                <input id="calc-ae" type="number" min="0.01" step="0.01" value={calcAe} onChange={(e) => setCalcAe(Number(e.target.value))} />
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="calc-maxrpm">Max RPM</label>
                <input id="calc-maxrpm" type="number" min="100" step="100" value={calcMaxRpm} onChange={(e) => setCalcMaxRpm(Number(e.target.value))} />
              </div>
              <div className="stx-mdb-sf">
                <label htmlFor="calc-cool">Coolant</label>
                <select id="calc-cool" value={calcCool} onChange={(e) => setCalcCool(e.target.value)}>
                  {COOLANT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {calcResult.error && (
              <p style={{ fontSize: 12, color: 'var(--color-danger, #b91c1c)', marginBottom: 12 }}>{calcResult.error}</p>
            )}
            {calcResult.warning && (
              <p style={{ fontSize: 12, color: 'var(--color-warning, #b45309)', marginBottom: 12 }}>{calcResult.warning}</p>
            )}

            {!calcResult.error && (
              <div className="stx-mdb-kpis" style={{ marginTop: 8 }}>
                <div className="stx-mdb-kpi">
                  <div className="num">{calcResult.vc ?? '—'}</div>
                  <div className="lbl">Vc (m/min)</div>
                </div>
                <div className="stx-mdb-kpi">
                  <div className="num">{calcResult.rpm ?? '—'}</div>
                  <div className="lbl">RPM</div>
                </div>
                <div className="stx-mdb-kpi">
                  <div className="num">{calcResult.fz ?? '—'}</div>
                  <div className="lbl">fz (mm/tooth)</div>
                </div>
                <div className="stx-mdb-kpi">
                  <div className="num">{calcResult.feed ?? '—'}</div>
                  <div className="lbl">Feed (mm/min)</div>
                </div>
                <div className="stx-mdb-kpi">
                  <div className="num">{calcResult.mrr ?? '—'}</div>
                  <div className="lbl">MRR (cm³/min)</div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'bench' && (
          <>
            <div className="stx-mdb-sec-title">Platform Benchmark</div>
            <div className="stx-mdb-cards-grid">
              {db.benchData.map((b) => {
                const scores = b.scores || {}
                const total = Math.round(Object.values(scores).reduce((a, v) => a + v, 0) / Object.keys(scores).length)
                return (
                  <div
                    key={b.name}
                    className="stx-mdb-card stx-cutdb-info-card stx-cutdb-bench-card"
                    style={{ '--cutdb-bench-accent': b.color }}
                  >
                    <div className="stx-cutdb-info-card__hdr stx-cutdb-info-card__hdr--row">
                      <h3 className="stx-cutdb-info-card__title stx-text-wrap">
                        {b.you ? '⭐ ' : ''}{b.name}
                      </h3>
                      <span className="badge stx-cutdb-bench-card__score">{total}/100</span>
                    </div>
                    <div className="stx-mdb-card-body">
                      {Object.entries(scores).map(([k, v]) => (
                        <div key={k} className="stx-cutdb-bench-row">
                          <span className="stx-cutdb-bench-row__label">{db.scoreLabels?.[k] || k}</span>
                          <div className="stx-cutdb-bench-row__track">
                            <div className="stx-cutdb-bench-row__fill" style={{ width: `${v}%` }} />
                          </div>
                          <span className="stx-cutdb-bench-row__value">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'ai' && (
          <>
            <div className="stx-mdb-sec-title">AI Advisor (Offline Knowledge Base)</div>
            <form onSubmit={submitAi} className="stx-mdb-search-row" style={{ marginBottom: 16 }}>
              <div className="stx-mdb-sf wide">
                <label htmlFor="ai-q">Question</label>
                <input
                  id="ai-q"
                  type="text"
                  placeholder="e.g. stainless steel end mill, titanium chatter, TiAlN coating…"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                />
              </div>
              <button type="submit" className="stx-mdb-btn stx-mdb-btn-primary stx-mdb-btn-sm" style={{ alignSelf: 'flex-end' }}>
                Ask
              </button>
            </form>
            {aiAnswer && (
              <div className="stx-mdb-compare-bar" style={{ alignItems: 'flex-start' }}>
                <p className="stx-text-body" style={{ lineHeight: 1.7, margin: 0 }}>{aiAnswer}</p>
              </div>
            )}
          </>
        )}
      </div>

      {toolModal && <ToolModal tool={toolModal} onClose={() => setToolModalId(null)} />}
    </div>
  )
}
