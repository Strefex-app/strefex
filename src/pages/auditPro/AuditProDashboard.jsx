import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuditProStore from '../../store/auditProStore'
import { auditProReminderTouchesDemoReminder, filterAuditProAuditsForVisibility } from '../../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import { Card, StatusBadge, FINDING_TYPES, INDUSTRIES, Btn } from './auditProUi'



function plansUrl(params = {}) {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  if (params.industry) q.set('industry', params.industry)
  const qs = q.toString()
  return qs ? `/management/auditors/plans?${qs}` : '/management/auditors/plans'
}

function conductFindingsUrl(auditId, findingId) {
  const q = new URLSearchParams({ tab: 'findings' })
  if (findingId) q.set('finding', findingId)
  return `/management/auditors/conduct/${auditId}?${q}`
}

const INDUSTRY_CHART_COLORS = {
  'Platform / SaaS': '#0ea5e9',
  Automotive: 'var(--accent)',
  Machinery: '#6366f1',
  Electronics: '#8b5cf6',
  Medical: 'var(--danger)',
  'Raw Materials': '#0d9488',
  'Oil & Gas': 'var(--rfqi-amber)',
  Nuclear: '#7c3aed',
  'Green Energy': '#22c55e',
  'Household Products': '#db2777',
  Aerospace: '#64748b',
}

export default function AuditProDashboard() {
  const navigate = useNavigate()
  const remindersRef = useRef(null)

  const auditsAll = useAuditProStore((s) => s.audits)
  const auditors = useAuditProStore((s) => s.auditors)
  const suppliers = useAuditProStore((s) => s.suppliers)
  const reminders = useAuditProStore((s) => s.reminders)
  const dismissReminder = useAuditProStore((s) => s.dismissReminder)

  const demoKitShown = useAuditProDemoKitVisible()
  const audits = useMemo(
    () => filterAuditProAuditsForVisibility(auditsAll, auditors, suppliers, demoKitShown),
    [auditsAll, auditors, suppliers, demoKitShown],
  )

  const [drill, setDrill] = useState(null)

  const supplierById = useMemo(() => {
    const m = new Map()
    ;(suppliers || []).forEach((s) => m.set(s.id, s))
    return m
  }, [suppliers])

  const totalFindings = audits.reduce((s, a) => s + (a.findings?.length || 0), 0)
  const openFindingCount = audits.reduce(
    (s, a) => s + (a.findings?.filter((f) => f.status === 'Open').length || 0),
    0,
  )
  const majors = audits.reduce(
    (s, a) => s + (a.findings?.filter((f) => f.type === 'Major NC').length || 0),
    0,
  )
  const openRemsAll = (reminders || []).filter((r) => r.status === 'Open')
  const openRems = demoKitShown
    ? openRemsAll
    : openRemsAll.filter(
        (r) => !auditProReminderTouchesDemoReminder(r, auditsAll, auditors, suppliers),
      )
  const overdueRems = openRems.filter((r) => new Date(r.dueDate) < new Date())
  const upcoming = audits
    .filter((a) => ['Planned', 'In Progress'].includes(a.status))
    .sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate))
    .slice(0, 6)

  const kpis = useMemo(
    () => [
      {
        key: 'kpi_total',
        l: 'Total Audits',
        v: audits.length,
        i: '◫',
        br: 'var(--accent)',
        val: 'var(--accent)',
      },
      {
        key: 'kpi_in_progress',
        l: 'In Progress',
        v: audits.filter((a) => a.status === 'In Progress').length,
        i: '⟳',
        br: 'var(--rfqi-amber)',
        val: 'var(--rfqi-amber)',
      },
      {
        key: 'kpi_completed',
        l: 'Completed',
        v: audits.filter((a) => a.status === 'Completed').length,
        i: '✓',
        br: 'var(--badge-success-text)',
        val: 'var(--badge-success-text)',
      },
      {
        key: 'kpi_open_findings',
        l: 'Open Findings',
        v: openFindingCount,
        i: '!',
        br: openFindingCount > 0 ? 'var(--danger)' : 'var(--badge-success-text)',
        val: openFindingCount > 0 ? 'var(--danger-text)' : 'var(--badge-success-text)',
      },
      {
        key: 'kpi_major',
        l: 'Major NCs',
        v: majors,
        i: '⚠',
        br: majors > 0 ? 'var(--danger)' : 'var(--badge-success-text)',
        val: majors > 0 ? 'var(--danger-text)' : 'var(--badge-success-text)',
      },
      {
        key: 'kpi_reminders',
        l: 'Reminders',
        v: openRems.length,
        i: '⏰',
        br: 'var(--rfqi-purple)',
        val: 'var(--rfqi-purple)',
      },
    ],
    [audits, openFindingCount, majors, openRems.length],
  )

  const openReminderTarget = (r) => {
    if (!r.auditId) {
      navigate('/management/auditors/calendar')
      return
    }
    navigate(conductFindingsUrl(r.auditId, r.findingId || null))
  }

  const onKpiClick = (key) => {
    if (key === 'kpi_reminders') {
      setDrill({ k: 'kpi_reminders' })
      window.setTimeout(() => {
        remindersRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
      }, 120)
      return
    }
    setDrill((prev) => (prev?.k === key ? null : { k: key }))
  }

  const resolveDrillRows = () => {
    if (!drill?.k) return { title: '', rows: [], mode: '' }

    /** @returns {{ title: string, rows: object[], mode: string }} */
    const auditRows = (list, mode) =>
      list.map((a) => ({
        audit: a,
        supplier: supplierById.get(a.supplierId),
        auditor: auditors.find((x) => x.id === a.auditorId),
        mode,
      }))

    switch (drill.k) {
      case 'kpi_total':
        return { title: 'All audits', rows: auditRows([...audits], 'audit'), mode: 'audit' }
      case 'kpi_in_progress':
        return {
          title: 'Audits in progress',
          rows: auditRows(
            audits.filter((a) => a.status === 'In Progress'),
            'audit',
          ),
          mode: 'audit',
        }
      case 'kpi_completed':
        return {
          title: 'Completed audits',
          rows: auditRows(
            audits.filter((a) => a.status === 'Completed'),
            'audit',
          ),
          mode: 'audit',
        }
      case 'kpi_open_findings': {
        const list = audits.filter((a) => (a.findings || []).some((f) => f.status === 'Open'))
        return { title: 'Audits with open findings', rows: auditRows(list, 'audit'), mode: 'audit' }
      }
      case 'kpi_major': {
        const list = audits.filter((a) => (a.findings || []).some((f) => f.type === 'Major NC'))
        return {
          title: 'Audits with Major NC findings',
          rows: auditRows(list, 'audit'),
          mode: 'audit',
        }
      }
      case 'finding_bucket_open': {
        const list = audits.filter((a) => (a.findings || []).some((f) => f.status === 'Open'))
        return { title: 'Open findings — audits affected', rows: auditRows(list, 'audit'), mode: 'audit' }
      }
      case 'finding_bucket_closed': {
        const list = audits.filter(
          (a) =>
            (a.findings?.length || 0) > 0 && !(a.findings || []).some((f) => f.status === 'Open'),
        )
        return { title: 'Closed-out findings scope (audits)', rows: auditRows(list, 'audit'), mode: 'audit' }
      }
      case 'finding_bucket_total': {
        const list = audits.filter((a) => (a.findings?.length || 0) > 0)
        return { title: 'Audits reporting any findings', rows: auditRows(list, 'audit'), mode: 'audit' }
      }
      case 'finding_type': {
        const ft = drill.findingType
        const list = audits.filter((a) => (a.findings || []).some((f) => f.type === ft))
        return {
          title: `${ft} — program coverage`,
          rows: auditRows(list, 'audit'),
          mode: 'audit',
        }
      }
      case 'industry': {
        const ind = drill.industry
        const matched = audits.filter((a) => a.industry === ind)
        const seen = new Set()
        /** @type {object[]} */
        const supRows = []
        matched.forEach((a) => {
          const sid = a.supplierId
          if (!sid || seen.has(sid)) return
          seen.add(sid)
          supRows.push({
            supplier: supplierById.get(sid),
            supplierId: sid,
            auditsInIndustry: matched.filter((x) => x.supplierId === sid).length,
            mode: 'supplier',
          })
        })
        return { title: `${ind} — suppliers in scope`, rows: supRows, mode: 'supplier' }
      }
      case 'standard': {
        const std = drill.standard
        return {
          title: `${std} — audits`,
          rows: auditRows(
            audits.filter((a) => a.standard === std),
            'audit',
          ),
          mode: 'audit',
        }
      }
      case 'kpi_reminders':
        return { title: 'Open reminders — jump to CAPA', rows: [...openRems], mode: 'reminder' }
      default:
        return { title: '', rows: [], mode: '' }
    }
  }

  const { title: drillTitle, rows: drillRows, mode: drillMode } = resolveDrillRows()

  const closeDrill = () => setDrill(null)

  const openAuditFromRow = (a) => navigate(`/management/auditors/conduct/${a.id}`)

  return (
    <div>
      <div className="am-dash-kpi-strip">
        {kpis.map((srow) => (
          <button
            key={srow.key}
            type="button"
            tabIndex={0}
            aria-pressed={drill?.k === srow.key}
            aria-label={`${srow.l}: ${srow.v}. Tap for details`}
            className={`ap-kpi-tile ap-kpi-tile--dash ap-kpi-tile--interactive${drill?.k === srow.key ? ' ap-kpi-tile--dash-active' : ''}`}
            style={{ borderLeftColor: srow.br }}
            onClick={() => onKpiClick(srow.key)}
          >
            <div className="ap-kpi-tile__icon" aria-hidden="true">{srow.i}</div>
            <div className="ap-kpi-tile__value" style={{ color: srow.val }}>{srow.v}</div>
            <div className="ap-kpi-tile__label stx-text-wrap">{srow.l}</div>
          </button>
        ))}
      </div>

      {drill && drill.k !== 'kpi_reminders' && (
        <div className="am-dash-drill">
          <div className="am-dash-drill__head">
            <div className="stx-text-section" style={{ fontWeight: 'var(--font-semibold)', margin: 0 }}>
              {drillTitle}
            </div>
            <Btn variant="secondary" onClick={closeDrill}>
              Close
            </Btn>
          </div>
          {drillRows.length === 0 && (
            <div className="stx-text-caption ap-text-muted">Nothing in this slice yet.</div>
          )}
          {drillRows.length > 0 && (
            <div className="am-dash-table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-small)' }}>
                <thead>
                  <tr>
                    {drillMode === 'supplier'
                      ? ['Supplier site', 'Email', 'Audits', ''].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: 'left',
                              padding: '8px 10px',
                              borderBottom: '1px solid var(--ap-border)',
                              color: 'var(--color-muted)',
                              fontWeight: 'var(--font-semibold)',
                            }}
                          >
                            {h}
                          </th>
                        ))
                      : ['Audit', 'Supplier', 'Industry', 'Status', ''].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: 'left',
                              padding: '8px 10px',
                              borderBottom: '1px solid var(--ap-border)',
                              color: 'var(--color-muted)',
                              fontWeight: 'var(--font-semibold)',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  {drillMode === 'supplier' &&
                    drillRows.map((row) => {
                      const sup = row.supplier
                      const nm = sup?.name || '(Unknown site)'
                      return (
                        <tr key={String(row.supplierId)} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '8px 10px', minWidth: 0 }} className="stx-text-wrap">{nm}</td>
                          <td style={{ padding: '8px 10px', minWidth: 0 }} className="stx-text-wrap">{sup?.email || '—'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 'var(--font-semibold)', color: 'var(--accent)' }}>
                            {row.auditsInIndustry}
                          </td>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                            <Btn
                              variant="secondary"
                              onClick={() => navigate(plansUrl({ industry: drill.industry }))}
                            >
                              Plans
                            </Btn>
                          </td>
                        </tr>
                      )
                    })}
                  {(drillMode === 'audit' || drillMode === '') &&
                    drillRows.map(({ audit: a, supplier: sup }) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '8px 10px', minWidth: 0 }} className="stx-text-wrap">
                          {(a.title || '').slice(0, 72)}
                          {(a.title || '').length > 72 ? '…' : ''}
                        </td>
                        <td style={{ padding: '8px 10px', minWidth: 0 }} className="stx-text-wrap">
                          {sup?.name || '—'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>{a.industry || '—'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <StatusBadge status={a.status} />
                        </td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                          <Btn
                            variant="primary"
                            onClick={() =>
                              navigate(
                                (a.findings || []).some((f) => f.status === 'Open')
                                  ? conductFindingsUrl(a.id, null)
                                  : `/management/auditors/conduct/${a.id}`,
                              )
                            }
                          >
                            Open
                          </Btn>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {drill?.k === 'kpi_reminders' && (
        <div className="am-dash-drill">
          <div className="am-dash-drill__head">
            <div className="stx-text-section" style={{ fontWeight: 'var(--font-semibold)', margin: 0 }}>
              Open reminders — open the linked finding to record auditee evidence
            </div>
            <Btn variant="secondary" onClick={closeDrill}>
              Close
            </Btn>
          </div>
          {drillRows.length === 0 ? (
            <div className="stx-text-caption ap-text-muted">No open reminders.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-small)' }}>
              <thead>
                <tr>
                  {['Reminder', 'Due', 'Finding', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderBottom: '1px solid var(--ap-border)',
                        color: 'var(--color-muted)',
                        fontWeight: 'var(--font-semibold)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drillRows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}>
                    <td style={{ padding: '8px 10px', minWidth: 0 }} className="stx-text-wrap">
                      {r.title || 'Reminder'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>{r.dueDate}</td>
                    <td style={{ padding: '8px 10px' }}>{r.findingId ? 'Linked' : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <Btn variant="success" onClick={() => openReminderTarget(r)}>
                        Open in audit
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="am-dash-two-col">
        <Card title="Upcoming & Active Audits" icon="◫">
          {upcoming.map((a) => {
            const days = Math.ceil((new Date(a.plannedDate) - new Date()) / 86400000)
            const aud = auditors.find((x) => x.id === a.auditorId)
            const sup = supplierById.get(a.supplierId)
            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openAuditFromRow(a)}
                className="ap-hovrow"
                onClick={() => openAuditFromRow(a)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 11px',
                  borderRadius: 7,
                  marginBottom: 5,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                }}
              >
                <div style={{ minWidth: 0 }} className="stx-text-wrap">
                  <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 500 }}>
                    {a.title.slice(0, 48)}
                    {a.title.length > 48 ? '…' : ''}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 1 }} className="stx-text-wrap">
                    {a.standard} · {aud?.name || 'TBD'} · {sup?.name || 'TBD'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
                  <StatusBadge status={a.status} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 'var(--font-semibold)',
                      color:
                        days <= 0
                          ? 'var(--danger-text)'
                          : days <= 14
                            ? 'var(--callout-warn-text)'
                            : 'var(--badge-success-text)',
                      minWidth: 36,
                      textAlign: 'right',
                    }}
                  >
                    {days <= 0 ? 'TODAY' : `${days}d`}
                  </span>
                </div>
              </div>
            )
          })}
          {!upcoming.length && <div className="stx-text-caption ap-text-muted">No upcoming audits scheduled.</div>}
        </Card>

        <div ref={remindersRef}>
          <Card
            title={`Reminders (${openRems.length} open${overdueRems.length > 0 ? `, ${overdueRems.length} overdue` : ''})`}
            icon="⏰"
          >
            <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginTop: -4, marginBottom: 10 }}>
              Tap a row to open the audit findings tab — add verification comments when evidence is received from the auditee.
            </p>
            {openRems.slice(0, 6).map((r) => {
              const days = Math.ceil((new Date(r.dueDate) - new Date()) / 86400000)
              const isOD = days < 0
              return (
                <div
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  className="am-dash-reminder-card"
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openReminderTarget(r)}
                  onClick={() => openReminderTarget(r)}
                  style={{
                    background: isOD ? 'var(--surface-danger-soft)' : 'var(--bg-surface)',
                    border: `1px solid ${isOD ? 'var(--danger)' : 'var(--border-light)'}`,
                    borderRadius: 10,
                    padding: '8px 10px',
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: isOD ? 'var(--danger-text)' : 'var(--color-primary)',
                      fontWeight: 500,
                      marginBottom: 3,
                      lineHeight: 1.35,
                    }}
                    className="stx-text-wrap"
                  >
                    {r.title.slice(0, 52)}
                    {r.title.length > 52 ? '…' : ''}
                    {r.findingId ? (
                      <span className="stx-text-caption" style={{ marginLeft: 6, opacity: 0.85 }}>
                        → finding
                      </span>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: isOD ? 'var(--danger-text)' : 'var(--color-muted)' }}>
                      {r.dueDate}
                      {isOD ? ` (${Math.abs(days)}d late)` : days === 0 ? ' (today)' : ''}
                    </span>
                    <button
                      type="button"
                      aria-label="Dismiss reminder"
                      onClick={(e) => {
                        e.stopPropagation()
                        dismissReminder(r.id)
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-secondary)', cursor: 'pointer', fontSize: 12 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
            {!openRems.length && <div style={{ color: 'var(--color-muted)', fontSize: 11 }}>All clear!</div>}
            {openRems.length > 6 ? (
              <Btn variant="secondary" onClick={() => onKpiClick('kpi_reminders')} style={{ marginTop: 6 }}>
                View all reminders
              </Btn>
            ) : null}
          </Card>
        </div>
      </div>

      <div className="am-dash-three-col">
        <Card title="Findings breakdown" icon="⚠">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { l: 'Open', drill: { k: 'finding_bucket_open' }, val: openFindingCount, vc: 'var(--danger-text)' },
              {
                l: 'Closed-out',
                drill: { k: 'finding_bucket_closed' },
                v: audits.filter(
                  (a) =>
                    (a.findings?.length || 0) > 0 && !(a.findings || []).some((f) => f.status === 'Open'),
                ).length,
                vc: 'var(--badge-success-text)',
              },
              {
                l: 'With findings',
                drill: { k: 'finding_bucket_total' },
                v: audits.filter((a) => (a.findings?.length || 0) > 0).length,
                vc: 'var(--accent)',
              },
            ].map((f) => {
              const vv = 'v' in f ? f.v : f.val
              return (
                <button
                  key={f.l}
                  type="button"
                  aria-label={`${f.l}: ${vv}. Tap for list`}
                  className="am-dash-mini-stat"
                  onClick={() => setDrill(f.drill)}
                >
                  <div style={{ fontSize: 18, fontWeight: 'var(--font-semibold)', color: f.vc }}>{vv}</div>
                  <div className="stx-text-caption ap-text-muted" style={{ marginTop: 2 }}>{f.l}</div>
                </button>
              )
            })}
          </div>
          <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginBottom: 8 }}>
            Tap a type to see which audits contribute to that slice.
          </p>
          {FINDING_TYPES.map((type) => {
            const cnt = audits.reduce(
              (s, a) => s + (a.findings?.filter((fitem) => fitem.type === type).length || 0),
              0,
            )
            const colors = {
              'Major NC': 'var(--danger-text)',
              'Minor NC': 'var(--callout-warn-text)',
              Observation: 'var(--link-color)',
              'Opportunity for Improvement': 'var(--rfqi-purple)',
              'Positive Finding': 'var(--badge-success-text)',
            }
            return (
              <button
                key={type}
                type="button"
                className="ap-border-row"
                onClick={() => setDrill({ k: 'finding_type', findingType: type })}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 4px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  font: 'inherit',
                  textAlign: 'left',
                }}
              >
                <span className="stx-text-small" style={{ color: 'var(--color-muted)' }}>{type}</span>
                <span className="stx-text-small" style={{ fontWeight: 'var(--font-semibold)', color: colors[type] }}>{cnt}</span>
              </button>
            )
          })}
        </Card>
        <Card title="By industry" icon="◉">
          <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginBottom: 10 }}>
            Tap an industry to list supplier sites with audits in that sector.
          </p>
          {INDUSTRIES.map((ind) => {
            const cnt = audits.filter((a) => a.industry === ind).length
            const pct = audits.length ? Math.round((cnt / audits.length) * 100) : 0
            const barColor = INDUSTRY_CHART_COLORS[ind] || '#64748b'
            return (
              <button
                key={ind}
                type="button"
                onClick={() => setDrill({ k: 'industry', industry: ind })}
                className="stx-click-feedback"
                style={{
                  display: 'block',
                  width: '100%',
                  marginBottom: 11,
                  border: 'none',
                  padding: '4px 0',
                  background: 'transparent',
                  cursor: 'pointer',
                  font: 'inherit',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span className="stx-text-small" style={{ color: 'var(--color-muted)' }}>{ind}</span>
                  <span className="stx-text-small" style={{ color: barColor, fontWeight: 'var(--font-semibold)' }}>{cnt}</span>
                </div>
                <div style={{ background: 'var(--border-light)', borderRadius: 4, height: 5 }}>
                  <div style={{ background: barColor, width: `${pct}%`, height: '100%', borderRadius: 4 }} />
                </div>
              </button>
            )
          })}
        </Card>
        <Card title="By standard" icon="⬗">
          <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginBottom: 10 }}>
            Tap a standard for the audit list in that slice.
          </p>
          {Object.entries(
            audits.reduce((acc, a) => {
              acc[a.standard] = (acc[a.standard] || 0) + 1
              return acc
            }, {}),
          )
            .sort((x, y) => y[1] - x[1])
            .slice(0, 12)
            .map(([std, cnt]) => (
              <button
                key={std}
                type="button"
                onClick={() => setDrill({ k: 'standard', standard: std })}
                className="ap-border-row stx-click-feedback"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 4px',
                  border: 'none',
                  borderBottomWidth: '1px',
                  background: 'transparent',
                  cursor: 'pointer',
                  font: 'inherit',
                }}
              >
                <span className="stx-text-small ap-text-muted stx-text-wrap" style={{ minWidth: 0 }}>
                  {std}
                </span>
                <span className="stx-text-small" style={{ fontWeight: 'var(--font-semibold)', color: 'var(--accent)', flexShrink: 0 }}>
                  {cnt}
                </span>
              </button>
            ))}
        </Card>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Btn variant="secondary" onClick={() => navigate(plansUrl())}>
          All audit plans
        </Btn>
        <Btn variant="secondary" onClick={() => navigate('/management/auditors/suppliers')}>
          Supplier registry
        </Btn>
        <Btn variant="secondary" onClick={() => navigate('/management/auditors/reports')}>
          Reports
        </Btn>
      </div>
    </div>
  )
}
