import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { IATF_CONTROL_PATH } from '../data/iatfControlCatalog'
import { COMPANY_WORKFLOWS_PATH, hrCanon } from '../data/companyWorkflows'
import { PLANT_QMS_SPACE } from '../data/companyDatabaseSpaces'
import useCompanyDepartments, { useCompanyDepartmentRecords } from '../hooks/useCompanyDepartments'
import { useCompanyWorkflowContext } from '../hooks/useCompanyWorkflows'
import useHrSpaceStore from '../store/hrSpaceStore'
import useIatfControlStore from '../store/iatfControlStore'
import {
  buildDepartmentHome,
  DEPARTMENTS_PATH,
  departmentSlug,
  findDepartmentBySlug,
} from '../utils/departmentHome'
import { folderStoragePath } from '../utils/companyFolders'
import { collectDepartmentLogs } from '../utils/recordChangeLog'
import { nextPeopleStepsForDepartment, nextQualityStepsForDepartment } from '../utils/companyWorkflowCompute'
import { IatfEditDialog } from '../components/iatf/IatfChangeLog'
import IatfChangeLog from '../components/iatf/IatfChangeLog'
import IatfTrackedActions from '../components/iatf/IatfTrackedActions'
import './DepartmentHomes.css'
import './IatfControl.css'
import './QualityExcellence.css'
import '../styles/app-page.css'

export default function DepartmentHomes() {
  const { deptKey } = useParams()
  const names = useCompanyDepartments()
  const records = useCompanyDepartmentRecords()
  const employees = useHrSpaceStore((s) => s.employees)
  const openPositions = useHrSpaceStore((s) => s.openPositions)
  const workforcePlans = useHrSpaceStore((s) => s.workforcePlans)
  const addDepartment = useHrSpaceStore((s) => s.addDepartment)
  const documents = useIatfControlStore((s) => s.documents)
  const lots = useIatfControlStore((s) => s.lots)
  const ncrs = useIatfControlStore((s) => s.ncrs)

  const homes = useMemo(
    () => records.map((dept) => buildDepartmentHome(dept, {
      employees, documents, lots, ncrs, openPositions, workforcePlans,
    })),
    [records, employees, documents, lots, ncrs, openPositions, workforcePlans],
  )

  if (deptKey) {
    const name = findDepartmentBySlug(records.length ? records : names, deptKey)
    const home = name
      ? buildDepartmentHome(name, { employees, documents, lots, ncrs, openPositions, workforcePlans })
      : null
    return (
      <AppLayout>
        <DepartmentDetail home={home} slug={deptKey} />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <DepartmentIndex homes={homes} onAdd={addDepartment} />
    </AppLayout>
  )
}

function DepartmentIndex({ homes, onAdd }) {
  const [name, setName] = useState('')
  const [showLog, setShowLog] = useState(false)
  const departmentLogs = useHrSpaceStore((s) => s.departmentLogs)
  return (
    <div className="dept-page">
      <header className="dept-head">
        <div className="min-width-0">
          <h1 className="app-page-title">Departments</h1>
          <p className="stx-text-caption stx-text-wrap">
            One home per department: people from HR, QMS documents, lots, and open NCRs.
          </p>
        </div>
        <button type="button" className="qe-btn" onClick={() => setShowLog((v) => !v)}>
          Change log{(departmentLogs || []).length ? ` (${departmentLogs.length})` : ''}
        </button>
      </header>

      {showLog && (
        <section className="app-page-card">
          <h2 className="stx-text-heading">Department tracking log</h2>
          <IatfChangeLog entries={departmentLogs || []} />
        </section>
      )}

      <form
        className="app-page-card iatf-card dept-add"
        onSubmit={(e) => {
          e.preventDefault()
          onAdd(name)
          setName('')
        }}
      >
        <label className="iatf-field">
          <span className="stx-text-caption">Add department</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Purchasing, Logistics…" />
        </label>
        <button type="submit" className="app-page-btn-primary" disabled={!name.trim()}>Add</button>
      </form>

      <div className="dept-grid">
        {homes.map((home) => (
          <Link key={home.id || home.slug} className="dept-card stx-click-feedback" to={home.path}>
            <strong>{home.name}</strong>
            <span className="stx-text-caption">
              {home.people.length} people · {home.documents.length} docs · {home.lots.length} lots
              {home.ncrs.length ? ` · ${home.ncrs.length} NCR` : ''}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function DepartmentWorkflows({ home }) {
  const ctx = useCompanyWorkflowContext()
  const peopleNext = nextPeopleStepsForDepartment(home.name, ctx)
  const qualityNext = nextQualityStepsForDepartment(home.ncrs, ctx)
  if (peopleNext.length === 0 && qualityNext.length === 0 && home.positions.length === 0) {
    return (
      <section className="app-page-card">
        <h2 className="stx-text-heading">Workflow next steps</h2>
        <p className="stx-text-caption stx-text-wrap">
          No open hire or quality steps for this department.
          {' '}
          <Link className="iatf-link" to={COMPANY_WORKFLOWS_PATH}>Company workflows</Link>
        </p>
      </section>
    )
  }
  return (
    <section className="app-page-card">
      <h2 className="stx-text-heading">Workflow next steps</h2>
      <p className="stx-text-caption stx-text-wrap">
        Each person and NCR continues in the existing module — not a separate tool.
      </p>
      {home.positions.length > 0 && (
        <ul className="dept-list">
          {home.positions.map((pos) => (
            <li key={pos.id}>
              <Link className="iatf-link" to={`${hrCanon('hiring')}?department=${encodeURIComponent(home.name)}`}>
                Hire: {pos.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {peopleNext.length > 0 && (
        <ul className="dept-list">
          {peopleNext.map((row) => (
            <li key={row.employeeId}>
              <Link className="iatf-link" to={row.path}>
                {row.name} · {row.label}
              </Link>
              <span className="stx-text-caption"> {row.doneCount}/{row.total}</span>
            </li>
          ))}
        </ul>
      )}
      {qualityNext.length > 0 && (
        <ul className="dept-list">
          {qualityNext.map((row) => (
            <li key={row.ncrId}>
              <Link className="iatf-link" to={row.path}>
                {row.title} · {row.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DepartmentDetail({ home, slug }) {
  const navigate = useNavigate()
  const employees = useHrSpaceStore((s) => s.employees)
  const departmentLogs = useHrSpaceStore((s) => s.departmentLogs)
  const renameHr = useHrSpaceStore((s) => s.renameDepartment)
  const updateEmployee = useHrSpaceStore((s) => s.updateEmployee)
  const renameIatf = useIatfControlStore((s) => s.renameDepartment)
  const folders = useIatfControlStore((s) => s.folders)
  const updateDocument = useIatfControlStore((s) => s.updateDocument)
  const updateLot = useIatfControlStore((s) => s.updateLot)
  const updateNcr = useIatfControlStore((s) => s.updateNcr)
  const [editing, setEditing] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [draftName, setDraftName] = useState(home?.name || '')
  const [reason, setReason] = useState('')
  const [moveId, setMoveId] = useState('')

  if (!home) {
    return (
      <div className="dept-page">
        <p className="stx-text-caption">Department “{slug}” was not found.</p>
        <Link className="iatf-link" to={DEPARTMENTS_PATH}>Back to departments</Link>
      </div>
    )
  }

  const logs = collectDepartmentLogs(home.name, {
    documents: home.documents,
    lots: home.lots,
    ncrs: home.ncrs,
    departmentLogs,
  }).slice(0, 40)
  const outsiders = employees.filter((row) => row.department !== home.name)
  const docAttachPath = (doc) => folderStoragePath(folders || [], doc.folderId || '')

  const saveRename = () => {
    const next = draftName.trim()
    if (!next || next === home.name) {
      setEditing(false)
      return
    }
    const ok = renameHr(home.name, next, { reason })
    if (ok === false) return
    renameIatf(home.name, next, { reason })
    setEditing(false)
    navigate(buildDepartmentHome(next).path)
  }

  return (
    <div className="dept-page">
      <header className="dept-head">
        <div className="min-width-0">
          <button type="button" className="app-page-back-link" onClick={() => navigate(DEPARTMENTS_PATH)}>
            ← Departments
          </button>
          <h1 className="app-page-title">{home.name}</h1>
          <p className="stx-text-caption stx-text-wrap">
            {home.people.length} people · {home.documents.length} QMS documents · {home.lots.length} lots
          </p>
        </div>
        <div className="dept-head__actions">
          <button type="button" className="qe-btn" onClick={() => { setDraftName(home.name); setReason(''); setEditing(true) }}>
            Edit
          </button>
          <button type="button" className="qe-btn" onClick={() => setShowLog((v) => !v)}>
            Change log{logs.length ? ` (${logs.length})` : ''}
          </button>
          <Link className="qe-btn" to={home.hrefCompanyDatabase}>Company Database</Link>
          <Link className="qe-btn" to={IATF_CONTROL_PATH}>IATF Control</Link>
          <Link className="qe-btn" to="/management/people/hr-space">HR Space</Link>
          <Link className="qe-btn" to={COMPANY_WORKFLOWS_PATH}>Workflows</Link>
        </div>
      </header>

      {editing && (
        <IatfEditDialog
          title={`Edit ${home.name}`}
          fields={[{ key: 'name', label: 'Department name' }]}
          values={{ name: draftName }}
          onChange={(_key, value) => setDraftName(value)}
          reason={reason}
          onReason={setReason}
          requireReason
          onClose={() => setEditing(false)}
          onSave={saveRename}
        />
      )}

      {showLog && (
        <section className="app-page-card">
          <h2 className="stx-text-heading">Tracking log</h2>
          <p className="stx-text-caption">IATF 7.5.3 — people moves, QMS document edits, and lot changes for this department.</p>
          <IatfChangeLog entries={logs} />
        </section>
      )}

      <div className="dept-stats">
        <div className="dept-stat"><strong>{home.people.length}</strong><span className="stx-text-caption">People</span></div>
        <div className="dept-stat"><strong>{home.documents.length}</strong><span className="stx-text-caption">QMS docs</span></div>
        <div className="dept-stat"><strong>{home.lots.length}</strong><span className="stx-text-caption">Lots</span></div>
        <div className="dept-stat"><strong>{home.ncrs.length}</strong><span className="stx-text-caption">NCRs</span></div>
      </div>

      <DepartmentWorkflows home={home} />

      <section className="app-page-card">
        <h2 className="stx-text-heading">People</h2>
        {outsiders.length > 0 && (
          <form
            className="iatf-inline"
            onSubmit={(e) => {
              e.preventDefault()
              if (!moveId) return
              updateEmployee(moveId, { department: home.name }, { reason: `Assigned to ${home.name}` })
              setMoveId('')
            }}
          >
            <select value={moveId} onChange={(e) => setMoveId(e.target.value)}>
              <option value="">Move someone here…</option>
              {outsiders.map((row) => (
                <option key={row.id} value={row.id}>{row.name} ({row.department || 'unassigned'})</option>
              ))}
            </select>
            <button type="submit" className="qe-btn" disabled={!moveId}>Assign</button>
          </form>
        )}
        {home.people.length === 0 ? (
          <p className="stx-text-caption">No HR employees tagged to this department yet.</p>
        ) : (
          <ul className="dept-list">
            {home.people.map((row) => (
              <li key={row.id}>
                <Link className="iatf-link" to={`/management/people/hr-space/employees/${row.id}`}>
                  {row.name}
                </Link>
                <span className="stx-text-caption"> {row.role || row.email || ''}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="app-page-card">
        <h2 className="stx-text-heading">QMS documents</h2>
        {home.documents.length === 0 ? (
          <p className="stx-text-caption">
            No controlled documents owned by this department.
            {' '}
            <Link className="iatf-link" to={home.hrefCompanyDatabase}>Add them in Company Database</Link>
            {' '}
            or IATF Control Library.
          </p>
        ) : (
          <ul className="dept-list">
            {home.documents.map((doc) => (
              <li key={doc.id} className="stx-text-wrap">
                <Link
                  className="iatf-link"
                  to={doc.folderId
                    ? `/management/company-database/${doc.space || PLANT_QMS_SPACE}/${doc.folderId}`
                    : home.hrefCompanyDatabase}
                >
                  {doc.docNumber} · {doc.title}
                </Link>
                {' '}
                · {doc.status}
                <IatfTrackedActions
                  record={doc}
                  title={`Edit ${doc.docNumber || doc.title}`}
                  requireReason={doc.status === 'approved'}
                  attachKind="iatf-document"
                  attachOptions={{
                    space: doc.space || PLANT_QMS_SPACE,
                    folderStoragePath: docAttachPath(doc),
                  }}
                  fields={[
                    { key: 'title', label: 'Title' },
                    { key: 'revision', label: 'Revision' },
                    { key: 'notes', label: 'Notes' },
                  ]}
                  onSave={(values, meta) => updateDocument(doc.id, values, meta)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="dept-split">
        <section className="app-page-card">
          <h2 className="stx-text-heading">Lots</h2>
          {home.lots.length === 0 ? (
            <p className="stx-text-caption">No lots tagged to this department.</p>
          ) : (
            <ul className="dept-list">
              {home.lots.map((lot) => (
                <li key={lot.id}>
                  {lot.lotNumber} · {lot.status}
                  <IatfTrackedActions
                    record={lot}
                    title={`Edit ${lot.lotNumber}`}
                    fields={[
                      { key: 'lotNumber', label: 'Lot number' },
                      { key: 'materialCert', label: 'Material cert / heat' },
                      { key: 'status', label: 'Status' },
                    ]}
                    onSave={(values, meta) => updateLot(lot.id, values, meta)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="app-page-card">
          <h2 className="stx-text-heading">Open NCRs</h2>
          {home.ncrs.length === 0 ? (
            <p className="stx-text-caption">No contained lots for this department.</p>
          ) : (
            <ul className="dept-list">
              {home.ncrs.map((ncr) => (
                <li key={ncr.id} className="stx-text-wrap">
                  {ncr.number}: {ncr.description || ncr.status}
                  <IatfTrackedActions
                    record={ncr}
                    title={`Edit ${ncr.number}`}
                    fields={[{ key: 'description', label: 'Description' }]}
                    onSave={(values, meta) => updateNcr(ncr.id, values, meta)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {(home.positions.length > 0 || home.workforce.length > 0) && (
        <section className="app-page-card">
          <h2 className="stx-text-heading">Hiring / workforce</h2>
          {home.positions.map((pos) => (
            <p key={pos.id} className="stx-text-caption stx-text-wrap">
              Open: {pos.title}
              {' · '}
              <Link className="iatf-link" to={`${hrCanon('hiring')}?department=${encodeURIComponent(home.name)}`}>
                Continue hiring
              </Link>
            </p>
          ))}
          {home.workforce.map((row) => (
            <p key={row.id} className="stx-text-caption stx-text-wrap">{row.title} · target {row.targetHeadcount}</p>
          ))}
        </section>
      )}
    </div>
  )
}
