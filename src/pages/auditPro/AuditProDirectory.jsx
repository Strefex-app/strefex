import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import useAuditProStore from '../../store/auditProStore'
import { useAuthStore } from '../../store/authStore'
import { useServiceRequestStore } from '../../store/serviceRequestStore'
import { Btn } from './auditProUi'
import AppListSelect from '../../components/AppListSelect'
import { sellerCategoryLabel } from '../../utils/auditorsDirectory'
import {
  POOL_REGIONS,
  buildAssignmentPool,
  buildPanelCapacity,
  matchAuditorForJob,
  matchWholePool,
  poolKpis,
  sellerSiteCode,
  utcTodayIso,
} from '../../utils/auditorsAssignmentPool'
import { formatAuditDateLabel, normalizeAuditEmail, applyCompanyAuditCloudToSuppliers } from '../../utils/companyExternalAudit'
import { sellerCompanyName } from '../../utils/auditSellerLabel'
import { listCompanyExternalAudits, saveCompanyExternalAudit } from '../../services/companyExternalAuditService'
import { auditProUid } from '../../utils/auditProUid'
import { notifyWorkspaceKeyDirty } from '../../services/workspaceCloudSync'
import {
  filterAuditProAuditsForVisibility,
  filterAuditProAuditorsForVisibility,
  filterAuditProSuppliersForVisibility,
} from '../../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import { AUDITORS_DIRECTORY_ALIAS } from '../../utils/auditorsDirectory'

export default function AuditProDirectory() {
  const navigate = useNavigate()
  const auditsAll = useAuditProStore((s) => s.audits)
  const auditorsAll = useAuditProStore((s) => s.auditors)
  const suppliersAll = useAuditProStore((s) => s.suppliers)
  const setAudits = useAuditProStore((s) => s.setAudits)
  const setSuppliers = useAuditProStore((s) => s.setSuppliers)
  const patchAudit = useAuditProStore((s) => s.patchAudit)
  const addAuditLog = useAuditProStore((s) => s.addAuditLog)
  const showToast = useAuditProStore((s) => s.showToast)
  const authRole = useAuthStore((s) => s.role)
  const authEmail = useAuthStore((s) => String(s.user?.email || '').toLowerCase())
  const requests = useServiceRequestStore((s) => s.requests)

  const [cloudRows, setCloudRows] = useState([])
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('ALL')
  const [proposals, setProposals] = useState({})
  const [selectedId, setSelectedId] = useState('')
  const [pickedIds, setPickedIds] = useState(() => new Set())
  const [takeAsId, setTakeAsId] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    void listCompanyExternalAudits()
      .then((rows) => setCloudRows(rows || []))
      .catch(() => setCloudRows([]))
  }, [])

  const demoKitShown = useAuditProDemoKitVisible()
  const isSuperAdmin = authRole === 'superadmin'
  const canAssignOthers = isSuperAdmin

  const auditors = useMemo(
    () => filterAuditProAuditorsForVisibility(auditorsAll, demoKitShown),
    [auditorsAll, demoKitShown],
  )
  const suppliers = useMemo(
    () => filterAuditProSuppliersForVisibility(suppliersAll, demoKitShown),
    [suppliersAll, demoKitShown],
  )
  const audits = useMemo(
    () => filterAuditProAuditsForVisibility(auditsAll, auditorsAll, suppliersAll, demoKitShown),
    [auditsAll, auditorsAll, suppliersAll, demoKitShown],
  )
  const suppliersVisible = useMemo(
    () => applyCompanyAuditCloudToSuppliers(suppliers, cloudRows),
    [suppliers, cloudRows],
  )

  const todayIso = utcTodayIso()
  const pool = useMemo(
    () => buildAssignmentPool({
      suppliers: suppliersVisible,
      audits,
      requests: requests || [],
      todayIso,
      includeAssigned: true,
      includeAllSuppliers: true,
    }),
    [suppliersVisible, audits, requests, todayIso],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pool.filter((job) => {
      if (region !== 'ALL' && job.region !== region) return false
      if (!q) return true
      const seller = job.supplier || {}
      const hay = `${seller.name || ''} ${sellerSiteCode(seller)} ${seller.country || ''} ${seller.industry || ''} ${job.modules.join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
  }, [pool, query, region])

  const capacity = useMemo(
    () => buildPanelCapacity({ auditors, audits, proposals }),
    [auditors, audits, proposals],
  )
  const kpis = useMemo(
    () => poolKpis(filtered, capacity, todayIso),
    [filtered, capacity, todayIso],
  )
  const selected = filtered.find((j) => j.id === selectedId) || null
  const selectedPanel = useMemo(
    () => (selected ? matchAuditorForJob(selected, auditors, capacity).panel : []),
    [selected, auditors, capacity],
  )

  const takeAuditor = auditors.find((a) => a.id === takeAsId) || null

  const persistAssignment = async (job, auditor) => {
    if (!job || !auditor) return false
    const supplier = job.supplier
    const planned = job.plannedDate || job.targetDate
    const deadline = job.deadlineDate || job.targetDate
    let auditId = job.auditId
    if (auditId) {
      patchAudit(auditId, { auditorId: auditor.id, status: planned ? 'Planned' : 'Assigned' })
    } else {
      const audit = {
        id: auditProUid(),
        title: `${job.kindLabel} – ${supplier?.name || 'Seller'}`,
        industry: supplier?.industry || '',
        auditType: 'Manufacturing / Quality',
        standard: job.modules[0] || '',
        scope: job.modules.join(', '),
        supplierId: supplier?.id && !String(supplier.id).startsWith('req-') ? supplier.id : '',
        auditorId: auditor.id,
        plannedDate: planned,
        deadlineDate: deadline,
        status: planned ? 'Planned' : 'Assigned',
        auditDays: String(job.auditDays || 2),
        findings: [],
        responses: {},
        createdAt: todayIso,
        poolKind: job.kind,
      }
      auditId = audit.id
      setAudits([...auditsAll, audit])
      void useAuditProStore.getState().upsertAuditRemote(audit)
    }
    addAuditLog(auditId, 'Seller taken from pool', auditor.name || 'System', `${auditor.name} picked ${supplier?.name || 'seller'} (${job.kindReason}).`)
    if (supplier?.email) {
      try {
        const saved = await saveCompanyExternalAudit({
          companyId: supplier.platformCompanyId || null,
          sellerEmail: supplier.email,
          sellerName: supplier.name,
          status: planned ? 'planned' : 'pending',
          notes: job.kindReason,
          plannedAt: planned,
          deadlineAt: deadline,
          auditorEmail: auditor.email || '',
          auditorName: auditor.name || '',
          notify: true,
        })
        if (supplier.id) {
          const linkedId = saved?.id || supplier.platformCompanyId
          setSuppliers((useAuditProStore.getState().suppliers || []).map((row) => (
            row.id === supplier.id
              ? {
                ...row,
                platformCompanyId: row.platformCompanyId || linkedId || null,
                externalAuditStatus: planned ? 'planned' : 'pending',
                externalAuditPlannedAt: planned,
                externalAuditDeadlineAt: deadline,
                externalAuditAssignedAuditorEmail: auditor.email || row.externalAuditAssignedAuditorEmail,
                externalAuditAssignedAuditorName: auditor.name || row.externalAuditAssignedAuditorName,
              }
              : row
          )))
        }
      } catch {
        /* local assignment already stored */
      }
    }
    notifyWorkspaceKeyDirty('audit_pro', true)
    return true
  }

  const takeJobs = async (jobs, auditor = takeAuditor) => {
    if (!auditor) {
      showToast(canAssignOthers
        ? 'Select an auditor, then assign.'
        : 'Your auditor profile is not on the panel yet.', 'error')
      return
    }
    const rows = (jobs || []).filter(Boolean)
    if (!rows.length) return
    setAssigning(true)
    try {
      for (const job of rows) {
        await persistAssignment(job, auditor)
        setProposals((p) => {
          const next = { ...p }
          delete next[job.id]
          return next
        })
        setPickedIds((prev) => {
          const next = new Set(prev)
          next.delete(job.id)
          return next
        })
      }
      showToast(rows.length === 1
        ? `${rows[0].supplier?.name || 'Seller'} assigned to ${auditor.name}. They will see it on Calendar.`
        : `${rows.length} sellers assigned to ${auditor.name}. They will see them on Calendar.`)
    } finally {
      setAssigning(false)
    }
  }

  const commitOne = async (job, auditor) => {
    if (!canAssignOthers && normalizeAuditEmail(auditor.email) !== authEmail) {
      showToast('You can only take sellers onto your own panel seat.', 'error')
      return
    }
    await takeJobs([job], auditor)
  }

  const releaseProposals = async () => {
    const entries = Object.entries(proposals)
    if (!entries.length) return
    setAssigning(true)
    try {
      for (const [jobId, proposal] of entries) {
        const job = pool.find((j) => j.id === jobId)
        const auditor = auditors.find((a) => a.id === proposal.auditorId)
        if (job && auditor) await persistAssignment(job, auditor)
      }
      setProposals({})
      showToast('Released proposed assignments.')
    } finally {
      setAssigning(false)
    }
  }

  const proposalCount = Object.keys(proposals).length

  if (!isSuperAdmin) {
    return <Navigate to={`${AUDITORS_DIRECTORY_ALIAS}/calendar`} replace />
  }

  return (
    <div className="ap-pool">
      <div className="stx-indicator-strip ap-pool-kpis">
        <article className="ap-pool-kpi ap-pool-kpi--danger">
          <div className="ap-pool-kpi-label">Unassigned in the pool</div>
          <div className="ap-pool-kpi-value">{kpis.unassigned}</div>
          <div className="ap-pool-kpi-hint">{kpis.unassigned} unassigned visits in {kpis.programmeYear}</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--warn">
          <div className="ap-pool-kpi-label">Critical &amp; high risk</div>
          <div className="ap-pool-kpi-value">{kpis.critical}</div>
          <div className="ap-pool-kpi-hint">Take these first — shortest notice period</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--ok">
          <div className="ap-pool-kpi-label">Past target date</div>
          <div className="ap-pool-kpi-value">{kpis.pastTarget}</div>
          <div className="ap-pool-kpi-hint">Behind the approval interval</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--info">
          <div className="ap-pool-kpi-label">Panel utilisation</div>
          <div className="ap-pool-kpi-value">{kpis.utilisation}%</div>
          <div className="ap-pool-kpi-hint">Booked days against annual capacity</div>
        </article>
      </div>

      <div className="ap-pool-toolbar">
        <input
          className="ap-input ap-pool-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search seller, code, country or industry"
          aria-label="Search seller pool"
        />
        <div className="ap-pool-regions" role="group" aria-label="Region filter">
          {['ALL', ...POOL_REGIONS].map((id) => (
            <button
              key={id}
              type="button"
              className={`app-page-btn-outline stx-click-feedback${region === id ? ' is-on' : ''}`}
              onClick={() => setRegion(id)}
            >
              {id}
            </button>
          ))}
        </div>
        {canAssignOthers ? (
          <AppListSelect
            value={takeAsId}
            onChange={setTakeAsId}
            ariaLabel="Auditor to assign"
            placeholder="Select auditor"
            options={[{ value: '', label: 'Select auditor' }, ...auditors.map((a) => ({ value: a.id, label: a.name }))]}
          />
        ) : null}
        <Btn
          disabled={assigning || pickedIds.size === 0}
          onClick={() => void takeJobs(filtered.filter((j) => pickedIds.has(j.id)))}
        >
          Assign selected sellers
        </Btn>
        <Btn variant="secondary" onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/calendar`)}>
          Open calendar
        </Btn>
        {canAssignOthers ? (
          <>
            <Btn
              variant="secondary"
              onClick={() => setProposals(matchWholePool(filtered, auditors, audits, proposals))}
            >
              Suggest matches
            </Btn>
            <Btn variant="secondary" onClick={() => setProposals({})}>Clear</Btn>
          </>
        ) : null}
      </div>

      <div className={`ap-pool-banner${pickedIds.size || proposalCount ? ' ap-pool-banner--ready' : ''}`}>
        <span className="ap-pool-banner-tag">
          {pickedIds.size ? `${pickedIds.size} selected` : proposalCount ? `${proposalCount} suggested` : 'Pick sellers'}
        </span>
        <span className="ap-pool-banner-copy stx-text-wrap">
          Assign an auditor to each seller. Only that auditor sees the company on Calendar. Industry ticks on the auditor account must match the seller.
        </span>
        {proposalCount && canAssignOthers ? (
          <Btn onClick={releaseProposals}>Release suggested matches</Btn>
        ) : null}
      </div>

      <div className="ap-pool-table-wrap">
        <table className="ap-pool-table">
          <thead>
            <tr>
              <th className="ap-suphub-radio" />
              <th>Risk</th>
              <th>Supplier / site</th>
              <th>Audit</th>
              <th>Scope</th>
              <th>Target date</th>
              <th>Readiness</th>
              <th>Taken by</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="ap-pool-empty">
                  No sellers in this filter. Import or register sellers, then assign an auditor.
                </td>
              </tr>
            ) : (
              filtered.map((job) => {
                const proposal = proposals[job.id]
                const seller = job.supplier || {}
                const daysLeft = job.targetDate ? Math.round((Date.parse(`${job.targetDate}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86400000) : null
                const riskClass = `ap-pool-risk ap-pool-risk--${String(job.risk.level || 'low').toLowerCase()}`
                const holder = auditors.find((a) => a.id === job.auditorId)
                  || auditors.find((a) => normalizeAuditEmail(a.email) === normalizeAuditEmail(job.assignedEmail || seller.externalAuditAssignedAuditorEmail))
                return (
                  <tr
                    key={job.id}
                    className={`${riskClass}${selectedId === job.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedId(job.id)}
                  >
                    <td className="ap-suphub-radio" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={pickedIds.has(job.id)}
                        onChange={(e) => {
                          setPickedIds((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(job.id)
                            else next.delete(job.id)
                            return next
                          })
                        }}
                        aria-label={`Select ${seller.name || 'seller'}`}
                      />
                    </td>
                    <td>
                      <span className={`ap-pool-risk-text ap-pool-risk-text--${String(job.risk.level || 'low').toLowerCase()}`}>
                        {job.risk.level}
                      </span>
                    </td>
                    <td>
                      <div className="ap-pool-seller stx-text-wrap">{sellerCompanyName(seller)}</div>
                      {seller.platformCompanyId ? (
                        <Link
                          className="ap-pool-sub ap-pool-code ap-linkish"
                          to={`/admin-dashboard/account/${encodeURIComponent(seller.platformCompanyId)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {sellerSiteCode(seller)}
                        </Link>
                      ) : (
                        <div className="ap-pool-sub ap-pool-code">{sellerSiteCode(seller)}</div>
                      )}
                      <div className="ap-pool-sub stx-text-wrap">
                        {[sellerCategoryLabel(seller), seller.country, seller.city].filter(Boolean).join(' · ') || seller.email || '—'}
                      </div>
                    </td>
                    <td>
                      <div className="ap-pool-seller">{job.kindLabel}</div>
                      <div className="ap-pool-sub">{job.auditDays} day{job.auditDays === 1 ? '' : 's'} · {job.kindReason}</div>
                    </td>
                    <td className="stx-text-wrap">
                      {(job.modules || []).filter(Boolean).join(', ') || '—'}
                    </td>
                    <td>
                      <div className={`ap-pool-date${daysLeft != null && daysLeft < 0 ? ' is-late' : ''}`}>
                        {formatAuditDateLabel(job.targetDate) || '—'}
                      </div>
                      <div className="ap-pool-sub">
                        {daysLeft == null ? '' : daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `in ${daysLeft}d`}
                        {job.deadlineDate ? ` · deadline ${formatAuditDateLabel(job.deadlineDate)}` : ''}
                      </div>
                    </td>
                    <td>
                      <span className={`ap-pool-ready ap-pool-ready--${job.readiness.key}`}>{job.readiness.label}</span>
                    </td>
                    <td>
                      {proposal ? (
                        <>
                          <div className="ap-pool-seller stx-text-wrap">{proposal.auditorName}</div>
                          <div className="ap-pool-sub">Proposed</div>
                        </>
                      ) : holder ? (
                        <>
                          <div className="ap-pool-seller stx-text-wrap">{holder.name}</div>
                          <div className="ap-pool-sub">Assigned</div>
                        </>
                      ) : (
                        <>
                          <div className="ap-pool-seller">Unassigned</div>
                          <div className="ap-pool-sub">In the pool</div>
                        </>
                      )}
                    </td>
                    <td>
                      <Btn
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedId(job.id)
                          void takeJobs([job])
                        }}
                      >
                        Assign auditor
                      </Btn>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <section className="ap-capacity" aria-label="Panel capacity">
        <div className="ap-capacity-kicker">Panel capacity · before you commit the plan</div>
        <div className="ap-pool-table-wrap">
          <table className="ap-pool-table ap-capacity-table">
            <thead>
              <tr>
                <th>Auditor</th>
                <th>Base / region</th>
                <th>Scope</th>
                <th>Booked</th>
                <th>Assigned here</th>
                <th>Utilisation</th>
              </tr>
            </thead>
            <tbody>
              {capacity.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ap-pool-empty">
                    No auditors on the panel yet. Registered STREFEX auditors appear here automatically.
                  </td>
                </tr>
              ) : (
                (selected ? selectedPanel : capacity.map((row) => ({
                  auditor: row.auditor,
                  capacity: row,
                  blocked: false,
                  reason: '',
                }))).map((row) => {
                  const cap = row.capacity || capacity.find((c) => c.id === row.auditor.id)
                  if (!cap) return null
                  return (
                    <tr key={cap.id} className={row.blocked ? 'is-blocked' : ''}>
                      <td>
                        <div className="ap-pool-seller stx-text-wrap">{cap.name}</div>
                        <div className="ap-pool-sub">{cap.code}</div>
                        {row.blocked ? <div className="ap-pool-block stx-text-wrap">{row.reason}</div> : null}
                      </td>
                      <td>
                        <div>{cap.country || '—'}</div>
                        <div className="ap-pool-sub">{cap.region}</div>
                      </td>
                      <td className="stx-text-wrap">
                        {(cap.auditor?.certifications || [])
                          .map((c) => (typeof c === 'string' ? c : c?.name || c?.label || ''))
                          .filter(Boolean)
                          .join(', ')
                          || `${cap.qualifiedCount} qualified${cap.provisionalCount ? ` · ${cap.provisionalCount} provisional` : ''}`}
                      </td>
                      <td>{cap.booked}</td>
                      <td>{cap.assignedHere || '—'}</td>
                      <td>
                        <div className="ap-util">
                          <div className="ap-util-track">
                            <div
                              className={`ap-util-fill${cap.utilisation >= 75 ? ' is-hot' : ''}`}
                              style={{ width: `${Math.min(100, cap.utilisation)}%` }}
                            />
                          </div>
                          <span>{cap.utilisation}%</span>
                        </div>
                        {selected && !row.blocked && canAssignOthers ? (
                          <Btn
                            variant="secondary"
                            onClick={() => commitOne(selected, row.auditor)}
                          >
                            Assign this auditor
                          </Btn>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
