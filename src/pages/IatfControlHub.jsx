import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import ManufacturerReliabilityCard from '../components/iatf/ManufacturerReliabilityCard'
import IatfPpapPanel from '../components/iatf/IatfPpapPanel'
import IatfChangePanel from '../components/iatf/IatfChangePanel'
import IatfGaugePanel from '../components/iatf/IatfGaugePanel'
import IatfAwardsPanel from '../components/iatf/IatfAwardsPanel'
import IatfTrackedActions from '../components/iatf/IatfTrackedActions'
import IatfChangeLog from '../components/iatf/IatfChangeLog'
import CompanyWorkflowRail from '../components/company/CompanyWorkflowRail'
import PublishTrustPreview from '../components/trust/PublishTrustPreview'
import EvidenceInboxPanel from '../components/trust/EvidenceInboxPanel'
import { COMPANY_DATABASE_PATH, PLANT_QMS_SPACE } from '../data/companyDatabaseSpaces'
import { PLATFORM_HUB_INDUSTRY_SLUGS } from '../data/platformHubIndustries'
import { getIndustryQualityProfile } from '../data/industryQualityProfiles'
import { COMPANY_WORKFLOWS_PATH } from '../data/companyWorkflows'
import {
  IATF_CERT_STANDARDS,
  IATF_CONTROL_PATH,
  IATF_LOT_KINDS,
  IATF_LOT_STATUSES,
  IATF_PPAP_LEVELS,
  IATF_PPAP_STATUSES,
  labelOf,
} from '../data/iatfControlCatalog'
import useCompanyDepartments from '../hooks/useCompanyDepartments'
import { useCompanyWorkflowInstances } from '../hooks/useCompanyWorkflows'
import { findLotByScan, formatLotLabel } from '../utils/shopFloorScan'
import { findCostProductForPart, costProductDraftFromPart } from '../utils/itemMaster'
import useCostStore from '../store/costStore'
import useIatfControlStore from '../store/iatfControlStore'
import useQualityExcellenceStore from '../store/qualityExcellenceStore'
import { useAuthStore } from '../store/authStore'
import { DEPARTMENTS_PATH, makeDepartmentId } from '../utils/departmentHome'
import { folderStoragePath } from '../utils/companyFolders'
import { getTenantId } from '../utils/tenantStorage'
import {
  buildReliabilityCard,
  coreToolsMaturity,
  liveStandardStatus,
  lotGenealogy,
  lotReleaseBlocked,
} from '../utils/iatfControlCompute'
import { writePublishedReliability } from '../utils/publishedReliability'
import { collectRecordLogs } from '../utils/recordChangeLog'
import './IatfControl.css'
import './QualityExcellence.css'
import '../styles/app-page.css'
import '../styles/managementShell.css'

const PRIMARY_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'library', label: 'Library' },
  { id: 'masters', label: 'Masters' },
  { id: 'run', label: 'Run' },
  { id: 'network', label: 'Network' },
]

const RUN_TABS = [
  { id: 'ppap', label: 'PPAP' },
  { id: 'changes', label: 'Changes' },
  { id: 'gauges', label: 'Gauges' },
  { id: 'lots', label: 'Lots' },
  { id: 'awards', label: 'Awards' },
  { id: 'certificates', label: 'Certificates' },
]

function Field({ label, children }) {
  return (
    <label className="iatf-field">
      <span className="stx-text-caption">{label}</span>
      {children}
    </label>
  )
}

export default function IatfControlHub() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState('overview')
  const [runTab, setRunTab] = useState('lots')
  const [publishNote, setPublishNote] = useState('')
  const user = useAuthStore((s) => s.user)
  const ensureFolders = useIatfControlStore((s) => s.ensureFolders)
  const plantIndustry = useIatfControlStore((s) => s.plantIndustry) || 'general'
  const setPlantIndustry = useIatfControlStore((s) => s.setPlantIndustry)
  const industryProfile = useMemo(() => getIndustryQualityProfile(plantIndustry), [plantIndustry])

  useEffect(() => {
    ensureFolders()
  }, [ensureFolders])

  useEffect(() => {
    const nextTab = searchParams.get('tab')
    if (nextTab && PRIMARY_TABS.some((row) => row.id === nextTab)) {
      setTab(nextTab)
    }
    const nextRunTab = searchParams.get('run')
    if (nextRunTab && RUN_TABS.some((row) => row.id === nextRunTab)) {
      setTab('run')
      setRunTab(nextRunTab)
    }
  }, [searchParams])

  const processes = useIatfControlStore((s) => s.processes)
  const parts = useIatfControlStore((s) => s.parts)
  const documents = useIatfControlStore((s) => s.documents)
  const lots = useIatfControlStore((s) => s.lots)
  const ncrs = useIatfControlStore((s) => s.ncrs)
  const certificates = useIatfControlStore((s) => s.certificates)
  const ppapPackages = useIatfControlStore((s) => s.ppapPackages) || []
  const changes = useIatfControlStore((s) => s.changes) || []
  const gauges = useIatfControlStore((s) => s.gauges) || []
  const awards = useIatfControlStore((s) => s.awards) || []
  const share = useIatfControlStore((s) => s.share)
  const publishedCard = useIatfControlStore((s) => s.publishedCard)
  const readOnly = useIatfControlStore((s) => s.isReadOnly())

  const qeRecords = useQualityExcellenceStore((s) => s.records)

  const iatfStatus = useMemo(
    () => liveStandardStatus(certificates, industryProfile.primaryStandardId),
    [certificates, industryProfile.primaryStandardId],
  )
  const tools = useMemo(
    () => coreToolsMaturity(qeRecords, parts, ppapPackages),
    [qeRecords, parts, ppapPackages],
  )
  const avgMaturity = tools.length
    ? Math.round(tools.reduce((sum, row) => sum + row.maturity, 0) / tools.length)
    : 0

  const previewCard = useMemo(
    () => buildReliabilityCard({
      certificates,
      processes,
      lots,
      parts,
      qeRecords,
      share,
      companyId: getTenantId(),
      companyName: user?.companyName || user?.company || '',
      industryId: plantIndustry,
    }),
    [certificates, processes, lots, parts, qeRecords, share, user, plantIndustry],
  )

  const publish = () => {
    const card = previewCard
    useIatfControlStore.getState().setPublishedCard(card)
    writePublishedReliability(card)
    setPublishNote('Published to the Network. Buyers see only the opted-in fields.')
  }

  return (
    <AppLayout>
      <div className="iatf-page">
        <header className="iatf-head">
          <div className="iatf-head__copy min-width-0">
            <h1 className="app-page-title">Plant QMS Control</h1>
            <p className="stx-text-caption stx-text-wrap">
              {industryProfile.plantWorkspaceHint}
            </p>
          </div>
          <div className="iatf-head__actions">
            <label className="iatf-industry-select">
              <span className="stx-text-caption">Plant industry</span>
              <select
                value={plantIndustry}
                disabled={readOnly}
                onChange={(e) => setPlantIndustry(e.target.value)}
              >
                {PLATFORM_HUB_INDUSTRY_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {getIndustryQualityProfile(slug).label}
                  </option>
                ))}
                <option value="general">General manufacturing</option>
              </select>
            </label>
            <Link className="qe-btn" to={COMPANY_DATABASE_PATH}>Company Database</Link>
            <button type="button" className="qe-btn" onClick={() => navigate('/management/ops/quality-excellence')}>
              Quality tools
            </button>
            <button type="button" className="qe-btn" onClick={() => navigate('/management/ops/production/iatf16949')}>
              IATF overview
            </button>
          </div>
        </header>

        <div className="qe-stage-pills">
          {PRIMARY_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`qe-pill${tab === item.id ? ' is-active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'run' && (
          <div className="qe-stage-pills iatf-run-pills">
            {RUN_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`qe-pill${runTab === item.id ? ' is-active' : ''}`}
                onClick={() => setRunTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {tab === 'overview' && (
          <OverviewPanel
            iatfStatus={iatfStatus}
            tools={tools}
            avgMaturity={avgMaturity}
            documents={documents}
            lots={lots}
            parts={parts}
            ncrs={ncrs}
            ppapPackages={ppapPackages}
            changes={changes}
            gauges={gauges}
            certificates={certificates}
            publishedCard={publishedCard}
          />
        )}
        {tab === 'library' && (
          <LibraryLinkPanel documents={documents} />
        )}
        {tab === 'masters' && (
          <MastersPanel parts={parts} processes={processes} readOnly={readOnly} />
        )}
        {tab === 'run' && runTab === 'ppap' && (
          <IatfPpapPanel parts={parts} packages={ppapPackages} readOnly={readOnly} />
        )}
        {tab === 'run' && runTab === 'changes' && (
          <IatfChangePanel
            parts={parts}
            processes={processes}
            documents={documents}
            changes={changes}
            readOnly={readOnly}
          />
        )}
        {tab === 'run' && runTab === 'gauges' && (
          <IatfGaugePanel parts={parts} gauges={gauges} qeRecords={qeRecords} readOnly={readOnly} />
        )}
        {tab === 'run' && runTab === 'lots' && (
          <LotsPanel lots={lots} parts={parts} processes={processes} ncrs={ncrs} qeRecords={qeRecords} gauges={gauges} readOnly={readOnly} />
        )}
        {tab === 'run' && runTab === 'awards' && (
          <IatfAwardsPanel parts={parts} awards={awards} readOnly={readOnly} />
        )}
        {tab === 'run' && runTab === 'certificates' && (
          <CertificatesPanel certificates={certificates} readOnly={readOnly} plantIndustry={plantIndustry} />
        )}
        {tab === 'network' && (
          <ReliabilityPanel
            share={share}
            previewCard={previewCard}
            publishedCard={publishedCard}
            publishNote={publishNote}
            readOnly={readOnly}
            onShare={(patch) => useIatfControlStore.getState().setShare(patch)}
            onPublish={publish}
          />
        )}
      </div>
    </AppLayout>
  )
}

function LibraryLinkPanel({ documents = [] }) {
  const recent = [...documents]
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
    .slice(0, 6)
  return (
    <section className="app-page-card iatf-card">
      <h2 className="stx-text-heading">QMS library</h2>
      <p className="stx-text-caption stx-text-wrap">
        Controlled documents live in Company Database. IATF Control links here so the folder tree is not maintained twice.
      </p>
      <div className="iatf-inline">
        <Link className="app-page-btn-primary" to={COMPANY_DATABASE_PATH}>Open Company Database</Link>
      </div>
      {recent.length > 0 && (
        <ul className="iatf-list" style={{ marginTop: 16 }}>
          {recent.map((doc) => (
            <li key={doc.id} className="stx-text-small stx-text-wrap">
              {doc.title || doc.name || doc.id}
              {doc.status ? ` · ${doc.status}` : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function OverviewPanel({ iatfStatus, tools, avgMaturity, documents, lots, parts, ncrs, ppapPackages, changes, gauges, publishedCard, certificates }) {
  const approvedDocs = documents.filter((d) => d.status === 'approved').length
  const holdLots = lots.filter((l) => l.status === 'hold').length
  const openChanges = (changes || []).filter((c) => c.status !== 'closed').length
  const overdueGauges = (gauges || []).filter((g) => {
    if (!g.calibrationDue) return false
    return new Date(g.calibrationDue).getTime() < Date.now()
  }).length
  const recentLog = collectRecordLogs([
    ...documents, ...lots, ...parts, ...ncrs, ...(ppapPackages || []), ...(changes || []), ...(gauges || []), ...(certificates || []),
  ]).slice(0, 12)
  const instances = useCompanyWorkflowInstances().filter((row) => (
    row.chainId === 'quality-contain' || row.chainId === 'production-release' || row.chainId === 'sourcing-award'
  ))
  return (
    <div className="iatf-stack">
      <EvidenceInboxPanel />
      <div className="iatf-stats">
        <div className="iatf-stat">
          <strong>{iatfStatus.label}</strong>
          <span className="stx-text-caption">IATF 16949 certificate</span>
        </div>
        <div className="iatf-stat">
          <strong>{avgMaturity}%</strong>
          <span className="stx-text-caption">Core tools from live records</span>
        </div>
        <div className="iatf-stat">
          <strong>{approvedDocs}</strong>
          <span className="stx-text-caption">Approved documents</span>
        </div>
        <div className="iatf-stat">
          <strong>{lots.length}</strong>
          <span className="stx-text-caption">Lots · {holdLots} on hold</span>
        </div>
        <div className="iatf-stat">
          <strong>{(ppapPackages || []).length}</strong>
          <span className="stx-text-caption">PPAP packs</span>
        </div>
        <div className="iatf-stat">
          <strong>{openChanges}</strong>
          <span className="stx-text-caption">Open changes · {overdueGauges} gauges overdue</span>
        </div>
      </div>
      <section className="app-page-card iatf-card">
        <h2 className="stx-text-heading">QMS library</h2>
        <p className="stx-text-caption">
          {documents.length} controlled documents indexed in folder spaces.
          Browse and edit the full tree in Company Database (single QMS library).
        </p>
        <div className="iatf-inline">
          <Link className="app-page-btn-primary" to={COMPANY_DATABASE_PATH}>Open Company Database</Link>
        </div>
      </section>
      <section className="app-page-card iatf-card">
        <h2 className="stx-text-heading">Core tools (from Quality Excellence + PPAP status)</h2>
        <p className="stx-text-caption">Scores stay at 0 until you create and verify records. Seed “Certified” dashboards are not used here.</p>
        <div className="iatf-tools">
          {tools.map((tool) => (
            <div key={tool.id} className="iatf-tool">
              <div className="iatf-tool__row">
                <span>{tool.name}</span>
                <span>{tool.maturity}%</span>
              </div>
              <div className="iatf-bar" aria-hidden="true">
                <span style={{ width: `${tool.maturity}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="stx-text-caption">{parts.length} parts · {ncrs.length} NCRs</p>
        <Link className="app-page-btn-outline" to="/management/ops/quality-excellence">Open Quality Excellence</Link>
      </section>
      <CompanyWorkflowRail chainId="quality-contain" />
      <CompanyWorkflowRail chainId="production-release" />
      {instances.length > 0 && (
        <section className="app-page-card iatf-card">
          <h2 className="stx-text-heading">Open sequences</h2>
          <ul>
            {instances.map((row) => (
              <li key={row.id}>
                <Link className="iatf-link" to={row.path}>{row.title} · {row.hint}</Link>
              </li>
            ))}
          </ul>
          <Link className="app-page-btn-outline" to={COMPANY_WORKFLOWS_PATH}>All company workflows</Link>
        </section>
      )}
      <section className="app-page-card iatf-card">
        <h2 className="stx-text-heading">What buyers currently see</h2>
        <ManufacturerReliabilityCard card={publishedCard} />
      </section>
      <section className="app-page-card iatf-card">
        <h2 className="stx-text-heading">Change tracking log</h2>
        <p className="stx-text-caption">IATF 7.5.3 — who changed plant records, when, and why.</p>
        <IatfChangeLog entries={recentLog} empty="No edits recorded yet. Use Edit on a document, lot, or certificate." />
      </section>
    </div>
  )
}

function MastersPanel({ parts, processes, readOnly }) {
  const addProcess = useIatfControlStore((s) => s.addProcess)
  const addOperation = useIatfControlStore((s) => s.addOperation)
  const updateProcess = useIatfControlStore((s) => s.updateProcess)
  const addPart = useIatfControlStore((s) => s.addPart)
  const updatePart = useIatfControlStore((s) => s.updatePart)
  const costProducts = useCostStore((s) => s.products)
  const addProduct = useCostStore((s) => s.addProduct)
  const [processName, setProcessName] = useState('')
  const [partForm, setPartForm] = useState({
    partNumber: '', name: '', revision: 'A', processId: '', ppapLevel: '3', ppapStatus: 'none',
  })
  const [masterNote, setMasterNote] = useState('')

  return (
    <div className="iatf-grid-2">
      <section className="app-page-card iatf-card">
        <h2 className="stx-text-heading">Processes</h2>
        {!readOnly && (
          <form
            className="iatf-inline"
            onSubmit={(e) => {
              e.preventDefault()
              addProcess({ name: processName || 'Process' })
              setProcessName('')
            }}
          >
            <input value={processName} onChange={(e) => setProcessName(e.target.value)} placeholder="Turning, molding…" />
            <button type="submit" className="qe-btn">Add process</button>
          </form>
        )}
        {processes.length === 0 && <p className="stx-text-caption">Add the operations an auditor will walk.</p>}
        {processes.map((prc) => (
          <div key={prc.id} className="iatf-process">
            <strong>{prc.name}</strong>
            <p className="stx-text-caption">
              {(prc.operations || []).map((op) => `${op.seq}. ${op.name}`).join(' · ') || 'No operations yet'}
            </p>
            <IatfTrackedActions
              record={prc}
              title={`Edit ${prc.name}`}
              readOnly={readOnly}
              fields={[
                { key: 'name', label: 'Name' },
                { key: 'code', label: 'Code' },
              ]}
              onSave={(values, meta) => updateProcess(prc.id, values, meta)}
            />
            {!readOnly && (
              <button type="button" className="qe-btn" onClick={() => addOperation(prc.id)}>Add operation</button>
            )}
          </div>
        ))}
      </section>
      <section className="app-page-card iatf-card">
        <h2 className="stx-text-heading">Parts</h2>
        {!readOnly && (
          <form
            className="iatf-form"
            onSubmit={(e) => {
              e.preventDefault()
              addPart(partForm)
              setPartForm({ ...partForm, partNumber: '', name: '' })
            }}
          >
            <div className="iatf-form-grid">
              <Field label="Part number">
                <input value={partForm.partNumber} onChange={(e) => setPartForm({ ...partForm, partNumber: e.target.value })} required />
              </Field>
              <Field label="Name">
                <input value={partForm.name} onChange={(e) => setPartForm({ ...partForm, name: e.target.value })} />
              </Field>
              <Field label="Rev">
                <input value={partForm.revision} onChange={(e) => setPartForm({ ...partForm, revision: e.target.value })} />
              </Field>
              <Field label="Process">
                <select value={partForm.processId} onChange={(e) => setPartForm({ ...partForm, processId: e.target.value })}>
                  <option value="">—</option>
                  {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="PPAP level">
                <select value={partForm.ppapLevel} onChange={(e) => setPartForm({ ...partForm, ppapLevel: e.target.value })}>
                  {IATF_PPAP_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </Field>
              <Field label="PPAP status">
                <select value={partForm.ppapStatus} onChange={(e) => setPartForm({ ...partForm, ppapStatus: e.target.value })}>
                  {IATF_PPAP_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
            </div>
            <button type="submit" className="app-page-btn-primary">Add part</button>
          </form>
        )}
        <div className="iatf-table-wrap">
          <table className="iatf-table">
            <thead>
              <tr><th>Number</th><th>Rev</th><th>Process</th><th>PPAP</th><th>Cost item</th><th> </th></tr>
            </thead>
            <tbody>
              {parts.map((part) => {
                const costHit = findCostProductForPart(part, costProducts)
                return (
                <tr key={part.id}>
                  <td className="stx-text-wrap">{part.partNumber} {part.name}</td>
                  <td>{part.revision}</td>
                  <td>{processes.find((p) => p.id === part.processId)?.name || '—'}</td>
                  <td>
                    <select
                      className="iatf-mini"
                      value={part.ppapStatus}
                      disabled={readOnly}
                      onChange={(e) => updatePart(part.id, { ppapStatus: e.target.value })}
                    >
                      {IATF_PPAP_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    {' '}L{part.ppapLevel}
                  </td>
                  <td className="stx-text-wrap">
                    {costHit ? (
                      <Link className="iatf-link" to="/management/finance/cost">{costHit.sku || costHit.name}</Link>
                    ) : (
                      !readOnly && part.partNumber ? (
                        <button
                          type="button"
                          className="app-page-btn-outline app-page-btn-sm"
                          onClick={() => {
                            addProduct(costProductDraftFromPart(part))
                            setMasterNote(`Cost product created for ${part.partNumber}`)
                          }}
                        >
                          Link to Cost BOM
                        </button>
                      ) : '—'
                    )}
                  </td>
                  <td>
                    <IatfTrackedActions
                      record={part}
                      title={`Edit ${part.partNumber || part.name}`}
                      readOnly={readOnly}
                      fields={[
                        { key: 'partNumber', label: 'Part number' },
                        { key: 'name', label: 'Name' },
                        { key: 'revision', label: 'Rev' },
                        {
                          key: 'processId',
                          label: 'Process',
                          type: 'select',
                          options: [{ value: '', label: '—' }, ...processes.map((p) => ({ value: p.id, label: p.name }))],
                        },
                        {
                          key: 'ppapLevel',
                          label: 'PPAP level',
                          type: 'select',
                          options: IATF_PPAP_LEVELS.map((lvl) => ({ value: lvl, label: String(lvl) })),
                        },
                      ]}
                      onSave={(values, meta) => updatePart(part.id, values, meta)}
                    />
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {masterNote ? <p className="stx-text-caption">{masterNote}</p> : null}
      </section>
    </div>
  )
}

function LotsPanel({ lots, parts, processes, ncrs, qeRecords, gauges = [], readOnly }) {
  const addLot = useIatfControlStore((s) => s.addLot)
  const updateLot = useIatfControlStore((s) => s.updateLot)
  const addNcr = useIatfControlStore((s) => s.addNcr)
  const updateNcr = useIatfControlStore((s) => s.updateNcr)
  const deptNames = useCompanyDepartments()
  const [form, setForm] = useState({
    lotNumber: '',
    kind: 'incoming',
    partId: '',
    processId: '',
    parentId: '',
    materialCert: '',
    serialNumber: '',
    quantity: '',
    department: 'Production',
  })
  const deptOptions = form.department && !deptNames.includes(form.department)
    ? [form.department, ...deptNames]
    : deptNames
  const [ncrForm, setNcrForm] = useState({ lotId: '', description: '', eightDRecordId: '' })
  const [walkId, setWalkId] = useState('')
  const [lotNote, setLotNote] = useState('')
  const [scanCode, setScanCode] = useState('')
  const [scanHitId, setScanHitId] = useState('')
  const chain = walkId ? lotGenealogy(lots, walkId) : []
  const eightDs = (qeRecords || []).filter((r) => r.toolId === 't4-8d')

  const runScan = (raw) => {
    const hit = findLotByScan(lots, raw)
    if (!hit) {
      setLotNote(`No lot matches scan “${String(raw || '').trim()}”.`)
      setScanHitId('')
      return
    }
    setScanHitId(hit.id)
    setWalkId(hit.id)
    setLotNote(`Scanned ${formatLotLabel(hit)}`)
  }

  return (
    <div className="iatf-stack">
      {!readOnly && (
        <form
          className="app-page-card iatf-card iatf-form"
          onSubmit={(e) => {
            e.preventDefault()
            addLot({
              ...form,
              parentLotIds: form.parentId ? [form.parentId] : [],
              quantity: form.quantity,
              departmentId: form.department ? makeDepartmentId(form.department) : '',
            })
            setForm({ ...form, lotNumber: '', materialCert: '', serialNumber: '', quantity: '' })
          }}
        >
          <h2 className="stx-text-heading">New lot</h2>
          <div className="iatf-form-grid">
            <Field label="Lot number">
              <input value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="Auto if empty" />
            </Field>
            <Field label="Kind">
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {IATF_LOT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </Field>
            <Field label="Part">
              <select value={form.partId} onChange={(e) => setForm({ ...form, partId: e.target.value })}>
                <option value="">—</option>
                {parts.map((p) => <option key={p.id} value={p.id}>{p.partNumber || p.name}</option>)}
              </select>
            </Field>
            <Field label="Process">
              <select value={form.processId} onChange={(e) => setForm({ ...form, processId: e.target.value })}>
                <option value="">—</option>
                {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Parent lot">
              <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                <option value="">—</option>
                {lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.lotNumber}</option>)}
              </select>
            </Field>
            <Field label="Material cert / heat">
              <input value={form.materialCert} onChange={(e) => setForm({ ...form, materialCert: e.target.value })} />
            </Field>
            <Field label="Serial number">
              <input
                value={form.serialNumber || ''}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                placeholder="Optional unit serial"
              />
            </Field>
            <Field label="Quantity">
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </Field>
            <Field label="Department">
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="">—</option>
                {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          <button type="submit" className="app-page-btn-primary">Record lot</button>
        </form>
      )}

      <div className="iatf-grid-2">
        <section className="app-page-card iatf-card">
          <h2 className="stx-text-heading">Lot register</h2>
          <p className="stx-text-caption stx-text-wrap">
            Product lot traceability (incoming cert → WIP → finished → ship). Purchasing OPP→PO stays in Control Hub commercial register.
            Release is blocked when a gauge for the part is overdue.
          </p>
          <form
            className="iatf-inline iatf-scan"
            onSubmit={(e) => {
              e.preventDefault()
              runScan(scanCode)
            }}
          >
            <input
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              placeholder="Scan lot or serial…"
              aria-label="Scan lot or serial number"
              autoComplete="off"
            />
            <button type="submit" className="app-page-btn-outline app-page-btn-sm">Find</button>
          </form>
          {lotNote && <p className="stx-text-caption stx-text-wrap">{lotNote}</p>}
          {lots.length === 0 ? (
            <p className="stx-text-caption">No lots on file yet.</p>
          ) : (
            <div className="iatf-table-wrap">
              <table className="iatf-table">
                <thead>
                  <tr><th>Lot</th><th>Kind</th><th>Status</th><th>Dept</th><th>Cert / heat</th><th> </th></tr>
                </thead>
                <tbody>
                  {lots.map((lot) => (
                    <tr key={lot.id} className={scanHitId === lot.id ? 'iatf-row--hit' : undefined}>
                      <td>
                        <button type="button" className="iatf-link" onClick={() => setWalkId(lot.id)}>
                          {formatLotLabel(lot)}
                        </button>
                      </td>
                      <td>{labelOf(IATF_LOT_KINDS, lot.kind)}</td>
                      <td>{labelOf(IATF_LOT_STATUSES, lot.status)}</td>
                      <td>
                        {lot.department ? (
                          <Link className="iatf-link" to={`${DEPARTMENTS_PATH}/${lot.departmentId || makeDepartmentId(lot.department)}`}>
                            {lot.department}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="stx-text-wrap">{lot.materialCert || '—'}</td>
                      <td>
                        <IatfTrackedActions
                          record={lot}
                          title={`Edit ${lot.lotNumber}`}
                          readOnly={readOnly}
                          fields={[
                            { key: 'lotNumber', label: 'Lot number' },
                            { key: 'kind', label: 'Kind', type: 'select', options: IATF_LOT_KINDS.map((k) => ({ value: k.id, label: k.label })) },
                            { key: 'status', label: 'Status', type: 'select', options: IATF_LOT_STATUSES.map((k) => ({ value: k.id, label: k.label })) },
                            { key: 'department', label: 'Department', type: 'select', options: [{ value: '', label: '—' }, ...deptOptions.map((d) => ({ value: d, label: d }))] },
                            { key: 'materialCert', label: 'Material cert / heat' },
                            { key: 'serialNumber', label: 'Serial number' },
                            { key: 'quantity', label: 'Quantity', type: 'number' },
                          ]}
                          onSave={(values, meta) => {
                            const next = { ...lot, ...values, quantity: Number(values.quantity) || 0 }
                            if (lotReleaseBlocked(next, gauges)) {
                              setLotNote('Cannot release or ship: a gauge for this part is overdue.')
                              return
                            }
                            setLotNote('')
                            updateLot(lot.id, next, meta)
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {chain.length > 0 && (
            <p className="stx-text-caption stx-text-wrap">
              Genealogy: {chain.map((lot) => lot.lotNumber).join(' → ')}
            </p>
          )}
        </section>
        <section className="app-page-card iatf-card">
          <h2 className="stx-text-heading">NCR — freeze lots</h2>
          {!readOnly && (
            <form
              className="iatf-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (!ncrForm.lotId) return
                addNcr({
                  lotIds: [ncrForm.lotId],
                  description: ncrForm.description,
                  eightDRecordId: ncrForm.eightDRecordId,
                  partId: lots.find((l) => l.id === ncrForm.lotId)?.partId,
                  department: lots.find((l) => l.id === ncrForm.lotId)?.department || '',
                })
                setNcrForm({ lotId: '', description: '', eightDRecordId: '' })
              }}
            >
              <Field label="Suspect lot">
                <select value={ncrForm.lotId} onChange={(e) => setNcrForm({ ...ncrForm, lotId: e.target.value })} required>
                  <option value="">—</option>
                  {lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.lotNumber}</option>)}
                </select>
              </Field>
              <Field label="Description">
                <input value={ncrForm.description} onChange={(e) => setNcrForm({ ...ncrForm, description: e.target.value })} />
              </Field>
              <Field label="Linked 8D">
                <select value={ncrForm.eightDRecordId} onChange={(e) => setNcrForm({ ...ncrForm, eightDRecordId: e.target.value })}>
                  <option value="">—</option>
                  {eightDs.map((r) => <option key={r.id} value={r.id}>{r.title || r.number}</option>)}
                </select>
              </Field>
              <button type="submit" className="app-page-btn-primary">Contain lot</button>
            </form>
          )}
          {ncrs.map((ncr) => (
            <div key={ncr.id}>
              <p className="stx-text-caption stx-text-wrap">
                {ncr.number}: {ncr.description || 'contained'} ({ncr.status})
              </p>
              <IatfTrackedActions
                record={ncr}
                title={`Edit ${ncr.number}`}
                readOnly={readOnly}
                fields={[
                  { key: 'description', label: 'Description' },
                  { key: 'status', label: 'Status' },
                ]}
                onSave={(values, meta) => updateNcr(ncr.id, values, meta)}
              />
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

function CertificatesPanel({ certificates, readOnly, plantIndustry = 'general' }) {
  const addCertificate = useIatfControlStore((s) => s.addCertificate)
  const updateCertificate = useIatfControlStore((s) => s.updateCertificate)
  const deleteCertificate = useIatfControlStore((s) => s.deleteCertificate)
  const folders = useIatfControlStore((s) => s.folders)
  const profile = getIndustryQualityProfile(plantIndustry)
  const certFolderId = plantIndustry === 'medical' ? 'folder-06-13485' : 'folder-06-iatf'
  const certFolderPath = folderStoragePath(folders || [], certFolderId)
  const [form, setForm] = useState({
    standard: profile.primaryStandardId,
    number: '',
    certifyingBody: '',
    scope: '',
    issuedAt: '',
    expiresAt: '',
    fileName: '',
  })

  useEffect(() => {
    setForm((prev) => ({ ...prev, standard: profile.primaryStandardId }))
  }, [profile.primaryStandardId])

  return (
    <div className="iatf-stack">
      {!readOnly && (
        <form
          className="app-page-card iatf-card iatf-form"
          onSubmit={(e) => {
            e.preventDefault()
            addCertificate(form)
            setForm({ ...form, number: '', scope: '', fileName: '' })
          }}
        >
          <h2 className="stx-text-heading">Certificate vault</h2>
          <p className="stx-text-caption">Requires certificate number, certification body, and expiry. The IATF page will not show Certified until a valid row exists.</p>
          <div className="iatf-form-grid">
            <Field label="Standard">
              <select value={form.standard} onChange={(e) => setForm({ ...form, standard: e.target.value })}>
                {IATF_CERT_STANDARDS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Certificate number">
              <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
            </Field>
            <Field label="Certification body">
              <input value={form.certifyingBody} onChange={(e) => setForm({ ...form, certifyingBody: e.target.value })} required />
            </Field>
            <Field label="Scope">
              <input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="e.g. manufacture of machined parts" />
            </Field>
            <Field label="Issued">
              <input type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} />
            </Field>
            <Field label="Expires">
              <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} required />
            </Field>
            <Field label="File name">
              <input value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} placeholder="IATF-certificate.pdf" />
            </Field>
          </div>
          <button type="submit" className="app-page-btn-primary">Save certificate</button>
        </form>
      )}
      <div className="app-page-card iatf-card">
        {certificates.length === 0 ? (
          <p className="stx-text-caption">No certificates on file.</p>
        ) : (
          <div className="iatf-table-wrap">
            <table className="iatf-table">
              <thead>
                <tr><th>Standard</th><th>Number</th><th>CB</th><th>Expires</th><th>File</th><th> </th></tr>
                </thead>
                <tbody>
                  {certificates.map((cert) => (
                    <tr key={cert.id}>
                      <td>{labelOf(IATF_CERT_STANDARDS, cert.standard)}</td>
                      <td>{cert.number}</td>
                      <td>{cert.certifyingBody}</td>
                      <td>{cert.expiresAt || '—'}</td>
                      <td className="stx-text-wrap">{cert.fileName || '—'}</td>
                      <td>
                        <IatfTrackedActions
                          record={cert}
                          title={`Edit ${cert.number || 'certificate'}`}
                          readOnly={readOnly}
                          requireReason
                          attachKind="iatf-certificate"
                          attachOptions={{
                            space: PLANT_QMS_SPACE,
                            folderStoragePath: certFolderPath,
                          }}
                          fields={[
                            { key: 'number', label: 'Certificate number' },
                            { key: 'certifyingBody', label: 'Certification body' },
                            { key: 'scope', label: 'Scope' },
                            { key: 'issuedAt', label: 'Issued', type: 'date' },
                            { key: 'expiresAt', label: 'Expires', type: 'date' },
                          ]}
                          onSave={(values, meta) => updateCertificate(cert.id, values, meta)}
                          onAttachMeta={(fileMeta, reason) => updateCertificate(cert.id, {
                            fileName: fileMeta.fileName,
                            storagePath: fileMeta.storagePath || cert.storagePath || '',
                          }, { action: 'file_attached', reason })}
                        />
                        {!readOnly && (
                          <button type="button" className="qe-btn qe-btn--danger" onClick={() => deleteCertificate(cert.id)}>Remove</button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ReliabilityPanel({ share, previewCard, publishedCard, publishNote, readOnly, onShare, onPublish }) {
  const toggles = [
    { key: 'shareCert', label: 'Certificate validity, CB, expiry, scope' },
    { key: 'shareProcesses', label: 'Process names' },
    { key: 'shareTraceMethod', label: 'Traceability method (lot / serial / none)' },
    { key: 'sharePpap', label: 'PPAP levels in use' },
    { key: 'shareCapability', label: 'Capability record count (not Cpk values)' },
  ]
  return (
    <div className="iatf-stack">
      <PublishTrustPreview />
      <div className="iatf-grid-2">
      <section className="app-page-card iatf-card">
        <h2 className="stx-text-heading">Opt in what buyers may see</h2>
        <p className="stx-text-caption">Lots, NCRs, other-customer PPAP, and drawings stay internal.</p>
        {toggles.map((row) => (
          <label key={row.key} className="iatf-check">
            <input
              type="checkbox"
              checked={share[row.key] !== false}
              disabled={readOnly}
              onChange={(e) => onShare({ [row.key]: e.target.checked })}
            />
            <span>{row.label}</span>
          </label>
        ))}
        {!readOnly && (
          <button type="button" className="app-page-btn-primary" onClick={onPublish}>Publish reliability card</button>
        )}
        {publishNote && <p className="stx-text-caption">{publishNote}</p>}
      </section>
      <section className="app-page-card iatf-card">
        <h2 className="stx-text-heading">Preview</h2>
        <ManufacturerReliabilityCard card={previewCard} />
        {publishedCard?.publishedAt && (
          <p className="stx-text-caption">Last published {new Date(publishedCard.publishedAt).toLocaleString()}</p>
        )}
        <p className="stx-text-caption">
          Path for plant users: <code>{IATF_CONTROL_PATH}</code>
        </p>
      </section>
      </div>
    </div>
  )
}
