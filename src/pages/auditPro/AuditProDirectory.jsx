import { useEffect, useMemo, useState } from 'react'
import useAuditProStore from '../../store/auditProStore'
import { useAuthStore } from '../../store/authStore'
import { useServiceRequestStore } from '../../store/serviceRequestStore'
import {
  filterAuditProAuditsForVisibility,
  filterAuditProAuditorsForVisibility,
  filterAuditProSuppliersForVisibility,
} from '../../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import { Btn, Tag } from './auditProUi'
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
import { listCompanyExternalAudits, saveCompanyExternalAudit } from '../../services/companyExternalAuditService'
import { auditProUid } from '../../utils/auditProUid'
import { notifyWorkspaceKeyDirty } from '../../services/workspaceCloudSync'

export default function AuditProDirectory() {
  const auditsAll = useAuditProStore((s) => s.audits)
  const auditorsAll = useAuditProStore((s) => s.auditors)
  const suppliersAll = useAuditProStore((s) => s.suppliers)
  const setAudits = useAuditProStore((s) => s.setAudits)
  const setSuppliers = useAuditProStore((s) => s.setSuppliers)
  const patchAudit = useAuditProStore((s) => s.patchAudit)
  const addAuditLog = useAuditProStore((s) => s.addAuditLog)
  const showToast = useAuditProStore((s) => s.showToast)
  const demoKitShown = useAuditProDemoKitVisible()
  const authRole = useAuthStore((s) => s.role)
  const authEmail = useAuthStore((s) => String(s.user?.email || '').toLowerCase())
  const requests = useServiceRequestStore((s) => s.requests)

  const [cloudRows, setCloudRows] = useState([])
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('ALL')
  const [proposals, setProposals] = useState({})
  const [selectedId, setSelectedId] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    void listCompanyExternalAudits()
      .then((rows) => setCloudRows(rows || []))
      .catch(() => setCloudRows([]))
  }, [])

  const auditors = useMemo(
    () => filterAuditProAuditorsForVisibility(auditorsAll, demoKitShown),
    [auditorsAll, demoKitShown],
  )
  const suppliersVisible = useMemo(
    () => applyCompanyAuditCloudToSuppliers(
      filterAuditProSuppliersForVisibility(suppliersAll, demoKitShown),
      cloudRows,
    ),
    [suppliersAll, demoKitShown, cloudRows],
  )
  const audits = useMemo(
    () => filterAuditProAuditsForVisibility(auditsAll, auditorsAll, suppliersAll, demoKitShown),
    [auditsAll, auditorsAll, suppliersAll, demoKitShown],
  )

  const todayIso = utcTodayIso()
  const pool = useMemo(
    () => buildAssignmentPool({
      suppliers: suppliersVisible,
      audits,
      requests: requests || [],
      todayIso,
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

  const canAssignOthers = authRole !== 'auditor_external'

  const persistAssignment = async (job, auditor) => {
    if (!job || !auditor) return false
    const supplier = job.supplier
    const planned = job.plannedDate || job.targetDate
    const deadline = job.deadlineDate || job.targetDate
    let auditId = job.auditId
    if (auditId) {
      patchAudit(auditId, { auditorId: auditor.id, status: 'Planned' })
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
        status: 'Planned',
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
    addAuditLog(auditId, 'Auditor assigned', auditor.name || 'System', `${auditor.name} assigned from the pool (${job.kindReason}).`)
    if (supplier?.email) {
      try {
        const saved = await saveCompanyExternalAudit({
          companyId: supplier.platformCompanyId || null,
          sellerEmail: supplier.email,
          sellerName: supplier.name,
          status: 'planned',
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
                externalAuditStatus: 'planned',
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

  const commitOne = async (job, auditor) => {
    if (!canAssignOthers && normalizeAuditEmail(auditor.email) !== authEmail) {
      showToast('You can only take jobs assigned to your own panel seat.', 'error')
      return
    }
    setAssigning(true)
    try {
      const ok = await persistAssignment(job, auditor)
      if (ok) {
        setProposals((p) => {
          const next = { ...p }
          delete next[job.id]
          return next
        })
        showToast(`Assigned ${auditor.name} to ${job.supplier?.name || 'seller'}.`)
      }
    } finally {
      setAssigning(false)
    }
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
      showToast('Released proposed assignments to the calendar.')
    } finally {
      setAssigning(false)
    }
  }

  const proposalCount = Object.keys(proposals).length

  return (
    <div className="ap-pool">
      <div className="ap-pool-kpis">
        <article className="ap-pool-kpi ap-pool-kpi--danger">
          <div className="ap-pool-kpi-label">Unassigned in the pool</div>
          <div className="ap-pool-kpi-value">{kpis.unassigned}</div>
          <div className="ap-pool-kpi-hint">{kpis.unassigned} unassigned visits in {kpis.programmeYear}</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--warn">
          <div className="ap-pool-kpi-label">Critical &amp; high risk</div>
          <div className="ap-pool-kpi-value">{kpis.critical}</div>
          <div className="ap-pool-kpi-hint">Assign these first — shortest notice period</div>
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
          placeholder="Search supplier, code, country or industry"
          aria-label="Search assignment pool"
        />
        <div className="ap-pool-regions" role="group" aria-label="Region filter">
          {['ALL', ...POOL_REGIONS].map((id) => (
            <button
              key={id}
              type="button"
              className={`ap-pool-chip${region === id ? ' is-on' : ''}`}
              onClick={() => setRegion(id)}
            >
              {id}
            </button>
          ))}
        </div>
        <Btn
          variant="secondary"
          onClick={() => setProposals(matchWholePool(filtered, auditors, audits, proposals))}
        >
          Match the whole pool
        </Btn>
        <Btn variant="secondary" onClick={() => setProposals({})}>Clear proposals</Btn>
      </div>

      <div className={`ap-pool-banner${proposalCount ? ' ap-pool-banner--ready' : ''}`}>
        <span className="ap-pool-banner-tag">{proposalCount ? `${proposalCount} to release` : 'Nothing to release'}</span>
        <span className="ap-pool-banner-copy stx-text-wrap">
          {proposalCount
            ? 'Review the proposals against panel capacity, then release them to notify sellers and auditors.'
            : 'Nothing proposed yet. Assign by hand, or let the system match the whole pool and review what it proposes.'}
        </span>
        {proposalCount ? (
          <Btn onClick={releaseProposals}>Release assignments</Btn>
        ) : null}
      </div>

      <div className="ap-pool-table-wrap">
        <table className="ap-pool-table">
          <thead>
            <tr>
              <th>Risk</th>
              <th>Supplier / site</th>
              <th>Audit</th>
              <th>Scope modules</th>
              <th>Target date</th>
              <th>Readiness</th>
              <th>Assigned to</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="ap-pool-empty">
                  No unassigned seller audits in the pool. New joiners, yearly/reoccurred visits, and audit-by-request rows appear here when they are linked in the seller database.
                </td>
              </tr>
            ) : (
              filtered.map((job) => {
                const proposal = proposals[job.id]
                const seller = job.supplier || {}
                const daysLeft = job.targetDate ? Math.round((Date.parse(`${job.targetDate}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86400000) : null
                const riskClass = `ap-pool-risk ap-pool-risk--${String(job.risk.level || 'low').toLowerCase()}`
                return (
                  <tr
                    key={job.id}
                    className={`${riskClass}${selectedId === job.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedId(job.id)}
                  >
                    <td>
                      <span className={`ap-pool-risk-tag ap-pool-risk-tag--${String(job.risk.level || 'low').toLowerCase()}`}>
                        {job.risk.level}
                      </span>
                    </td>
                    <td>
                      <div className="ap-pool-seller stx-text-wrap">{seller.name || 'Unnamed seller'}</div>
                      <div className="ap-pool-sub stx-text-wrap">
                        {sellerSiteCode(seller)}
                        {seller.country ? ` · ${seller.country}` : ''}
                        {seller.city ? ` · ${seller.city}` : ''}
                      </div>
                    </td>
                    <td>
                      <div className="ap-pool-seller">{job.kindLabel}</div>
                      <div className="ap-pool-sub">{job.auditDays} day{job.auditDays === 1 ? '' : 's'} · {job.kindReason}</div>
                    </td>
                    <td>
                      <div className="ap-pool-modules">
                        {job.modules.map((m) => (
                          <Tag key={m} color="var(--color-secondary)" small>{m}</Tag>
                        ))}
                      </div>
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
                          const { pick } = matchAuditorForJob(job, auditors, capacity)
                          if (pick && canAssignOthers) {
                            setProposals((p) => ({
                              ...p,
                              [job.id]: {
                                auditorId: pick.auditor.id,
                                auditorName: pick.auditor.name,
                                auditorEmail: pick.auditor.email,
                                auditDays: job.auditDays,
                              },
                            }))
                          }
                        }}
                      >
                        Assign
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
                <th>Qualified modules</th>
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
                      <td>
                        {cap.qualifiedCount} qualified
                        {cap.provisionalCount ? ` · ${cap.provisionalCount} provisional` : ''}
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
                        {selected && !row.blocked ? (
                          <Btn
                            variant="secondary"
                            onClick={() => commitOne(selected, row.auditor)}
                          >
                            Confirm
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
