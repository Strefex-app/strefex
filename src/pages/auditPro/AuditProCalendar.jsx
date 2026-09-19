import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuditProStore from '../../store/auditProStore'
import {
  filterAuditProAuditsForVisibility,
  filterAuditProAuditorsForVisibility,
  filterAuditProSuppliersForVisibility,
} from '../../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import { useAuthStore } from '../../store/authStore'
import { sellerCategoryLabel, AUDITORS_DIRECTORY_ALIAS } from '../../utils/auditorsDirectory'
import { utcTodayIso } from '../../utils/auditorsAssignmentPool'
import { formatAuditDateLabel } from '../../utils/companyExternalAudit'
import { sellerCompanyName } from '../../utils/auditSellerLabel'
import { sellersWaitingToPlan } from '../../utils/auditJourney'
import { planSellerAudit } from './auditJourneyActions'
import { Btn } from './auditProUi'
import {
  buildCapaRows,
  buildFindingsReports,
  buildScheduleEvents,
  capaKpis,
  filterCapaRows,
  findingsKpis,
  nextCommitments,
} from '../../utils/auditProgrammeViews'

function useProgrammeData() {
  const auditsAll = useAuditProStore((s) => s.audits)
  const auditorsAll = useAuditProStore((s) => s.auditors)
  const suppliersAll = useAuditProStore((s) => s.suppliers)
  const reminders = useAuditProStore((s) => s.reminders)
  const demoKitShown = useAuditProDemoKitVisible()
  const authRole = useAuthStore((s) => s.role)
  const authEmail = useAuthStore((s) => String(s.user?.email || '').toLowerCase())

  const auditors = useMemo(
    () => filterAuditProAuditorsForVisibility(auditorsAll, demoKitShown),
    [auditorsAll, demoKitShown],
  )
  const suppliers = useMemo(
    () => filterAuditProSuppliersForVisibility(suppliersAll, demoKitShown),
    [suppliersAll, demoKitShown],
  )
  const audits = useMemo(() => {
    const visible = filterAuditProAuditsForVisibility(auditsAll, auditorsAll, suppliersAll, demoKitShown)
    if (authRole !== 'auditor_external' && authRole !== 'auditor_internal') return visible
    const selfIds = new Set(
      (auditorsAll || [])
        .filter((a) => String(a.email || '').toLowerCase() === authEmail)
        .map((a) => a.id),
    )
    return visible.filter((a) => selfIds.has(a.auditorId) || selfIds.has(a.secondaryAuditorId))
  }, [auditsAll, auditorsAll, suppliersAll, demoKitShown, authRole, authEmail])

  return { audits, auditors, suppliers, reminders, authEmail }
}

function ProgrammeTabs({ view, capaCount, onChange }) {
  return (
    <div className="ap-prog-tabs" role="tablist">
      {[
        { id: 'calendar', label: 'Calendar' },
        { id: 'findings', label: 'Audits & findings' },
        { id: 'capa', label: 'CAPA tracker', count: capaCount },
      ].map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={view === tab.id}
          className={`ap-prog-tab${view === tab.id ? ' is-on' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count ? <span className="ap-prog-tab-count">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  )
}

function CalendarBoard({ events, month, year, onPrev, onNext, onOpen, onPickDay, selectedIso, onDropSeller }) {
  const first = new Date(year, month, 1)
  const dim = new Date(year, month + 1, 0).getDate()
  const mondayPad = (first.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < mondayPad; i += 1) cells.push(null)
  for (let d = 1; d <= dim; d += 1) cells.push(d)
  const today = new Date()
  const monthEvents = events.filter((e) => {
    const [y, m] = String(e.date || '').split('-').map(Number)
    return y === year && m === month + 1
  })
  const mName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="ap-sched-cal">
      <div className="ap-sched-cal-head">
        <button type="button" className="ap-input ap-sched-nav" onClick={onPrev}>←</button>
        <h3 className="ap-sched-month">{mName}</h3>
        <button type="button" className="ap-input ap-sched-nav" onClick={onNext}>→</button>
        <span className="ap-sched-count">{monthEvents.length} entries this month</span>
      </div>
      <div className="ap-sched-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="ap-sched-dow">{d}</div>
        ))}
        {cells.map((day, i) => {
          const iso = day
            ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            : ''
          const dayEvents = day ? events.filter((e) => e.date === iso) : []
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const isPick = iso && iso === selectedIso
          return (
            <div
              key={i}
              className={`ap-sched-cell${isToday ? ' is-today' : ''}${isPick ? ' is-pick' : ''}${day ? ' is-day' : ''}`}
              onClick={() => { if (iso) onPickDay?.(iso) }}
              onDragOver={iso ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } : undefined}
              onDrop={iso ? (e) => {
                e.preventDefault()
                const sellerId = e.dataTransfer.getData('text/seller-id')
                if (sellerId) onDropSeller?.(iso, sellerId)
              } : undefined}
            >
              {day ? <div className="ap-sched-daynum">{day}</div> : null}
              {dayEvents.slice(0, 3).map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className={`ap-sched-chip ap-sched-chip--${ev.type}`}
                  onClick={(e) => { e.stopPropagation(); onOpen(ev) }}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          )
        })}
      </div>
      <div className="ap-sched-legend">
        <span><i className="ap-sched-dot ap-sched-chip--performed" /> Audit performed</span>
        <span><i className="ap-sched-dot ap-sched-chip--planned" /> Audit planned</span>
        <span><i className="ap-sched-dot ap-sched-chip--questionnaire" /> Questionnaire due</span>
        <span><i className="ap-sched-dot ap-sched-chip--capa" /> CAPA due</span>
      </div>
    </div>
  )
}

function FindingsTable({ reports, onReport, onSeller }) {
  const kpis = findingsKpis(reports)
  return (
    <>
      <div className="ap-pool-kpis">
        <article className="ap-pool-kpi ap-pool-kpi--info">
          <div className="ap-pool-kpi-label">Reports on file</div>
          <div className="ap-pool-kpi-value">{kpis.reports}</div>
          <div className="ap-pool-kpi-hint">Since first completed visit — all signed</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--ok">
          <div className="ap-pool-kpi-label">Average score {kpis.year}</div>
          <div className="ap-pool-kpi-value">{kpis.yearAvg}%</div>
          <div className="ap-pool-kpi-hint">Weighted conformity</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--warn">
          <div className="ap-pool-kpi-label">Open corrective actions</div>
          <div className="ap-pool-kpi-value">{kpis.openCapa}</div>
          <div className="ap-pool-kpi-hint">{kpis.majorOpen} of them major</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--danger">
          <div className="ap-pool-kpi-label">Rejected / suspended</div>
          <div className="ap-pool-kpi-value">{kpis.rejected}</div>
          <div className="ap-pool-kpi-hint">Removed from sourcing until re-audit</div>
        </article>
      </div>
      <div className="ap-pool-table-wrap">
        <table className="ap-pool-table">
          <thead>
            <tr>
              <th>Report no.</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Type</th>
              <th>Lead auditor</th>
              <th>Score</th>
              <th>Maj / min / obs</th>
              <th>Result</th>
              <th>CAPA</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr><td colSpan={10} className="ap-pool-empty">No performed audits with findings yet. Complete a visit to raise a report.</td></tr>
            ) : reports.map((row) => (
              <tr key={row.id}>
                <td>{row.reportNo}</td>
                <td>
                  <button type="button" className="ap-linkish" onClick={() => onSeller(row.supplier?.id)}>
                    {row.supplierName}
                  </button>
                  <div className="ap-pool-sub stx-text-wrap">{row.site}</div>
                </td>
                <td>{formatAuditDateLabel(row.date) || '—'}</td>
                <td>{row.kind}</td>
                <td className="stx-text-wrap">{row.auditorLabel}</td>
                <td>{row.score != null ? `${row.score}%` : '—'}</td>
                <td>{row.counts.major} / {row.counts.minor} / {row.counts.obs}</td>
                <td><span className={`ap-result ap-result--${row.result.key}`}>{row.result.label}</span></td>
                <td className={row.capaOpen ? 'ap-capa-open' : 'ap-capa-closed'}>
                  {row.capaOpen ? `${row.capaOpen} open` : 'Closed'}
                </td>
                <td><Btn onClick={() => onReport(row.id)}>Report</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function CapaTable({ rows, kpis, filter, onFilter, onSeller }) {
  return (
    <>
      <div className="ap-pool-kpis">
        <article className="ap-pool-kpi ap-pool-kpi--info">
          <div className="ap-pool-kpi-label">Open corrective actions</div>
          <div className="ap-pool-kpi-value">{kpis.open}</div>
          <div className="ap-pool-kpi-hint">{kpis.raised} raised this year</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--warn">
          <div className="ap-pool-kpi-label">Past their due date</div>
          <div className="ap-pool-kpi-value">{kpis.overdue}</div>
          <div className="ap-pool-kpi-hint">Supplier owes evidence</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--danger">
          <div className="ap-pool-kpi-label">Major and late</div>
          <div className="ap-pool-kpi-value">{kpis.majorLate}</div>
          <div className="ap-pool-kpi-hint">Escalate — approval status at risk</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--ok">
          <div className="ap-pool-kpi-label">Suppliers affected</div>
          <div className="ap-pool-kpi-value">{kpis.suppliersAffected}</div>
          <div className="ap-pool-kpi-hint">Of {kpis.suppliersTotal} in the register</div>
        </article>
      </div>
      <div className="ap-pool-regions" style={{ marginBottom: 10 }}>
        {['open', 'overdue', 'major', 'mine', 'all'].map((id) => (
          <button key={id} type="button" className={`ap-pool-chip${filter === id ? ' is-on' : ''}`} onClick={() => onFilter(id)}>
            {id === 'all' ? 'All' : id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>
      <div className="ap-pool-table-wrap">
        <table className="ap-pool-table">
          <thead>
            <tr>
              <th>Finding</th>
              <th>Supplier</th>
              <th>Clause</th>
              <th>Corrective action</th>
              <th>Due</th>
              <th>Escalation</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="ap-pool-empty">No corrective actions in this filter.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className={row.isMajor ? 'ap-pool-risk--critical' : ''}>
                <td>
                  <div>{row.findingNo}</div>
                  <span className={`ap-pool-risk-tag ap-pool-risk-tag--${row.isMajor ? 'critical' : 'high'}`}>
                    {row.isMajor ? 'MAJOR' : row.type}
                  </span>
                </td>
                <td>
                  <button type="button" className="ap-linkish" onClick={() => onSeller(row.supplierId)}>
                    {row.supplierName}
                  </button>
                  <div className="ap-pool-sub">{row.supplierCode}</div>
                </td>
                <td className="stx-text-wrap">{row.clause}</td>
                <td className="stx-text-wrap">
                  <div className="ap-pool-seller">{row.action}</div>
                  {row.description && row.description !== row.action ? (
                    <div className="ap-pool-sub">Finding: {row.description}</div>
                  ) : null}
                </td>
                <td>
                  <div className={row.overdue ? 'ap-pool-date is-late' : ''}>{formatAuditDateLabel(row.due) || '—'}</div>
                  {row.overdue ? <div className="ap-pool-sub is-late">{row.daysLate} d overdue</div> : null}
                </td>
                <td className={`stx-text-wrap${row.open ? ' ap-capa-open' : ''}`}>{row.escalation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function AuditProCalendar() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { audits, auditors, suppliers, reminders, authEmail } = useProgrammeData()
  const todayIso = utcTodayIso()
  const view = ['calendar', 'findings', 'capa'].includes(searchParams.get('view'))
    ? searchParams.get('view')
    : 'calendar'
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [capaFilter, setCapaFilter] = useState('open')
  const [pickIso, setPickIso] = useState('')
  const [schedBusy, setSchedBusy] = useState(false)

  const industry = searchParams.get('industry') || ''
  const scopedAudits = useMemo(() => {
    if (!industry) return audits
    const byId = new Map((suppliers || []).map((s) => [s.id, s]))
    return audits.filter(
      (a) => sellerCategoryLabel(byId.get(a.supplierId) || { industry: a.industry }) === industry,
    )
  }, [audits, suppliers, industry])

  const events = useMemo(
    () => buildScheduleEvents({ audits: scopedAudits, suppliers, auditors, reminders, todayIso }),
    [scopedAudits, suppliers, auditors, reminders, todayIso],
  )
  const upcoming = useMemo(() => nextCommitments(events, todayIso, 8), [events, todayIso])
  const reports = useMemo(
    () => buildFindingsReports({ audits: scopedAudits, suppliers, auditors }),
    [scopedAudits, suppliers, auditors],
  )
  const capaAll = useMemo(
    () => buildCapaRows({ audits: scopedAudits, suppliers, auditors, todayIso }),
    [scopedAudits, suppliers, auditors, todayIso],
  )
  const capaRows = useMemo(
    () => filterCapaRows(capaAll, capaFilter, authEmail),
    [capaAll, capaFilter, authEmail],
  )
  const capaCounts = capaKpis(capaAll)

  const waitingToPlan = useMemo(
    () => sellersWaitingToPlan(suppliers, audits),
    [suppliers, audits],
  )
  const selfAuditor = useMemo(
    () => (auditors || []).find((a) => String(a.email || '').toLowerCase() === authEmail) || auditors?.[0] || null,
    [auditors, authEmail],
  )

  const setView = (next) => {
    const nextParams = new URLSearchParams(searchParams)
    if (next === 'calendar') nextParams.delete('view')
    else nextParams.set('view', next)
    setSearchParams(nextParams)
  }

  const openSeller = (supplierId) => {
    if (!supplierId) return
    navigate(`${AUDITORS_DIRECTORY_ALIAS}/record/${encodeURIComponent(supplierId)}`)
  }
  const openEvent = (ev) => {
    if (ev.type === 'capa' && ev.supplierId) {
      navigate(`${AUDITORS_DIRECTORY_ALIAS}/calendar?view=capa`)
      return
    }
    if (ev.type === 'performed' && ev.auditId) {
      navigate(`${AUDITORS_DIRECTORY_ALIAS}/findings/${encodeURIComponent(ev.auditId)}`)
      return
    }
    if (ev.auditId) navigate(`${AUDITORS_DIRECTORY_ALIAS}/conduct/${encodeURIComponent(ev.auditId)}`)
  }

  const pickDay = (iso) => {
    setPickIso(iso)
  }

  const dropSellerOnDay = async (iso, sellerId) => {
    const seller = (suppliers || []).find((s) => s.id === sellerId)
    if (!seller || !iso || !selfAuditor) return
    setSchedBusy(true)
    try {
      await planSellerAudit({ supplier: seller, date: iso, auditor: selfAuditor })
      setPickIso(iso)
    } finally {
      setSchedBusy(false)
    }
  }

  return (
    <div className="ap-prog">
      <ProgrammeTabs view={view} capaCount={capaCounts.open} onChange={setView} />

      {view === 'calendar' ? (
        <>
          <select
            className="ap-select"
            value={industry}
            onChange={(e) => {
              const nextParams = new URLSearchParams(searchParams)
              if (!e.target.value) nextParams.delete('industry')
              else nextParams.set('industry', e.target.value)
              setSearchParams(nextParams)
            }}
            aria-label="Filter by seller category"
            style={{ width: 'auto', minWidth: 180, marginBottom: 8 }}
          >
            <option value="">All seller categories</option>
            {[...new Set((suppliers || []).map((s) => sellerCategoryLabel(s)))].sort().map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="ap-sched">
            <CalendarBoard
              events={events}
              month={month}
              year={year}
              onPrev={() => {
                if (month === 0) { setMonth(11); setYear((y) => y - 1) }
                else setMonth((m) => m - 1)
              }}
              onNext={() => {
                if (month === 11) { setMonth(0); setYear((y) => y + 1) }
                else setMonth((m) => m + 1)
              }}
              onOpen={openEvent}
              onPickDay={pickDay}
              selectedIso={pickIso}
              onDropSeller={dropSellerOnDay}
            />
            <aside className="ap-sched-side">
              <div className="ap-capacity-kicker">To plan · drag onto a day</div>
              {waitingToPlan.length === 0 ? (
                <p className="ap-dir-empty">Every seller has a visit date. New and Need action rows appear here.</p>
              ) : waitingToPlan.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="ap-commit ap-sched-drag"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/seller-id', s.id)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => {
                    if (pickIso && selfAuditor) void dropSellerOnDay(pickIso, s.id)
                  }}
                >
                  <div className="ap-pool-seller stx-text-wrap">{sellerCompanyName(s)}</div>
                  <div className="ap-pool-sub stx-text-wrap">{s.email || s.industry || '—'}</div>
                </button>
              ))}
              {pickIso ? (
                <p className="ap-dir-empty">Selected day {formatAuditDateLabel(pickIso)}. Drop a seller here or click one in the list.</p>
              ) : null}
              {schedBusy ? <p className="ap-dir-empty">Planning…</p> : null}
              <div className="ap-capacity-kicker">Upcoming audits</div>
              {upcoming.length === 0 ? (
                <p className="ap-dir-empty">No upcoming visit dates.</p>
              ) : upcoming.map((ev) => (
                <button key={ev.id} type="button" className="ap-commit" onClick={() => openEvent(ev)}>
                  <div className="ap-commit-top">
                    <span>{ev.date}</span>
                    <span className={`ap-result ap-result--${ev.type === 'planned' ? 'planned' : ev.type}`}>{ev.statusLabel}</span>
                  </div>
                  <div className="ap-pool-seller stx-text-wrap">{ev.label}</div>
                  <div className="ap-pool-sub stx-text-wrap">{ev.detail}</div>
                </button>
              ))}
            </aside>
          </div>
        </>
      ) : null}

      {view === 'findings' ? (
        <FindingsTable
          reports={reports}
          onReport={(id) => navigate(`${AUDITORS_DIRECTORY_ALIAS}/findings/${encodeURIComponent(id)}`)}
          onSeller={openSeller}
        />
      ) : null}

      {view === 'capa' ? (
        <CapaTable
          rows={capaRows}
          kpis={capaCounts}
          filter={capaFilter}
          onFilter={setCapaFilter}
          onSeller={openSeller}
        />
      ) : null}
    </div>
  )
}
