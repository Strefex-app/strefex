import { useMyCalendarStore } from '../store/myCalendarStore'
import { addDaysIso } from './auditProgrammeViews'
import { sellerCompanyName, auditDaysForStandard } from './auditSellerLabel'

/**
 * Mirror a planned supplier visit onto the signed-in auditor's profile calendar.
 * Supplier visits also live on management_audits (company programme calendar).
 */
export function syncPlannedVisitToProfileCalendar({ audit, supplier, standard, date, days }) {
  if (!audit?.id || !date) return null
  const n = Math.max(1, Number(days) || auditDaysForStandard(standard || audit.standard) || 1)
  const end = n > 1 ? addDaysIso(date, n - 1) : date
  const name = supplier ? sellerCompanyName(supplier) : (audit.title || 'Supplier')
  return useMyCalendarStore.getState().upsertEntry({
    sourceId: `audit-visit:${audit.id}`,
    date,
    kind: 'meeting',
    title: `Audit · ${name}`,
    detail: [standard || audit.standard, n > 1 ? `${n} days` : ''].filter(Boolean).join(' · '),
    timeLabel: n > 1 ? `${date}–${end}` : '',
  })
}

export function scheduleEventsFromPersonalCalendar(entries = []) {
  return (entries || [])
    .filter((e) => e?.date)
    .map((e) => ({
      id: `personal:${e.id}`,
      date: e.date,
      type: 'personal',
      label: e.title || 'Calendar',
      detail: e.detail || e.kind || 'Profile calendar',
      statusLabel: e.kind === 'meeting' ? 'Busy' : (e.kind || 'Event'),
      personal: true,
    }))
}
