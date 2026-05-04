/** Map industry hub ids (from industryStore) to exhibition catalog industry labels */
export const INDUSTRY_ID_TO_EXHIBITION_LABEL = {
  automotive: 'Automotive',
  machinery: 'Manufacturing',
  electronics: 'Electronics',
  medical: 'Medical Equipment',
  'raw-materials': 'Raw Materials',
  'oil-gas': 'Oil & Gas',
  'green-energy': 'Green Energy',
  'household-products': 'Household Products',
  plastic: 'Plastic',
  metal: 'Metal',
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function normalizeDateStr(v) {
  if (!v || typeof v !== 'string') return null
  const s = v.trim().slice(0, 10)
  return ISO_DATE.test(s) ? s : null
}

function isNdaContract(c) {
  return (
    c?.type === 'nda' ||
    /\bnda\b/i.test(c?.title || '') ||
    /non-disclosure/i.test(c?.title || '')
  )
}

function isNdaHrDocument(d) {
  return (
    /\bnda\b/i.test(d?.name || '') ||
    /non-disclosure/i.test(d?.name || '') ||
    /\bnda\b/i.test(d?.category || '')
  )
}

/** YYYY-MM-DD for each calendar day from start through end (inclusive) */
export function eachDateInRange(startStr, endStr) {
  const start = normalizeDateStr(startStr)
  const end = normalizeDateStr(endStr)
  if (!start || !end) return []
  const out = []
  const d = new Date(`${start}T12:00:00`)
  const endT = new Date(`${end}T12:00:00`)
  while (d <= endT) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}

/**
 * @typedef {{ id: string, type: string, title: string, detail?: string, meta?: string, color?: string, href?: string }} PlatformCalendarEvent
 */

/**
 * @param {object} input
 * @returns {PlatformCalendarEvent[]}
 */
export function collectPlatformCalendarEvents({
  projects = [],
  rfqs = [],
  receivedRfqs = [],
  serviceRequests = [],
  onboardingTasks = [],
  exhibitions = [],
  industryIdsForExpo = [],
  contracts = [],
  hrDocuments = [],
  trainingRecords = [],
  goals = [],
  employees = [],
}) {
  /** @type {PlatformCalendarEvent[]} */
  const events = []

  const push = (dateStr, ev) => {
    const d = normalizeDateStr(dateStr)
    if (!d) return
    const id =
      ev.id ||
      `${ev.type}-${d}-${events.length}-${String(ev.title || '').slice(0, 20)}`
    events.push({ ...ev, date: d, id })
  }

  projects.forEach((p) => {
    const pname = p.name || 'Project'
    ;(p.tasks || []).forEach((t) => {
      const end = normalizeDateStr(t.endDate)
      const start = normalizeDateStr(t.startDate)
      if (end) {
        push(end, {
          type: 'task',
          title: t.name || 'Task',
          detail: pname,
          meta: t.status === 'complete' ? 'Done' : 'Deadline',
          color: '#00d4ff',
        })
      } else if (start) {
        push(start, {
          type: 'task',
          title: t.name || 'Task',
          detail: pname,
          meta: 'Starts',
          color: '#5c6bc0',
        })
      }
    })
  })

  rfqs.forEach((r) => {
    const dd = normalizeDateStr(r.dueDate)
    if (dd && (r.status === 'sent' || r.status === 'active' || r.status === 'draft')) {
      push(dd, {
        type: 'rfq_deadline',
        title: r.title || 'RFQ',
        detail: 'Sent RFQ deadline',
        color: '#2e7d32',
        href: '/buyer-dashboard',
      })
    }
  })

  receivedRfqs.forEach((r) => {
    const dd = normalizeDateStr(r.dueDate)
    if (dd && r.status === 'pending') {
      push(dd, {
        type: 'rfq_incoming',
        title: r.title || 'RFQ',
        detail: r.buyerCompany || 'Respond by',
        color: '#c62828',
        href: '/seller-dashboard',
      })
    }
  })

  serviceRequests.forEach((r) => {
    const pd = normalizeDateStr(r.preferredDate)
    if (pd) {
      push(pd, {
        type: 'service_request',
        title: r.title || 'Service request',
        detail: r.status || 'Preferred date',
        color: '#e65100',
        href: '/service-provider-dashboard',
      })
    }
  })

  onboardingTasks.forEach((t) => {
    const dd = normalizeDateStr(t.dueDate)
    if (dd && !t.done) {
      push(dd, {
        type: 'onboarding',
        title: t.title || 'Onboarding task',
        detail: 'HR onboarding',
        color: '#6a1b9a',
        href: '/hr-space',
      })
    }
  })

  const industrySet = new Set(
    industryIdsForExpo
      .map((id) => INDUSTRY_ID_TO_EXHIBITION_LABEL[id])
      .filter(Boolean)
  )

  exhibitions.forEach((ex) => {
    if (industrySet.size > 0 && !industrySet.has(ex.industry)) return
    const days = eachDateInRange(ex.startDate, ex.endDate)
    days.forEach((day, i) => {
      push(day, {
        id: `${ex.id}-${day}`,
        type: 'exhibition',
        title: ex.name,
        detail: `${ex.city || ''}${ex.city && ex.country ? ', ' : ''}${ex.country || ''}`.trim() || 'Trade fair',
        meta: i === 0 ? 'Starts' : 'Ongoing',
        color: ex.color || '#e67e22',
        href: '/profile/calendar',
      })
    })
  })

  const empNameById = Object.fromEntries((employees || []).map((e) => [e.id, e.name || e.fullName || '']))

  contracts.forEach((c) => {
    if (c.status === 'terminated') return
    const nda = isNdaContract(c)
    const end = normalizeDateStr(c.endDate)
    if (end) {
      push(end, {
        id: `ctr-end-${c.id}`,
        type: nda ? 'nda_contract' : 'ai_contract',
        title: nda ? `NDA — review or re-sign: ${c.title}` : `Contract end: ${c.title}`,
        detail: [c.vendorName, c.category].filter(Boolean).join(' · ') || 'Contract management',
        meta: 'AI Insights · Contract management',
        color: nda ? '#ad1457' : '#4527a0',
        href: '/contracts',
      })
    }
    const ren = normalizeDateStr(c.renewalDate)
    if (ren) {
      push(ren, {
        id: `ctr-ren-${c.id}`,
        type: 'contract_renewal',
        title: `Renewal decision: ${c.title}`,
        detail: c.vendorName || 'Contract management',
        meta: 'AI Insights · Contract management',
        color: '#7e57c2',
        href: '/contracts',
      })
    }
    ;(c.milestones || []).forEach((m, idx) => {
      const st = (m.status || '').toLowerCase()
      if (st === 'completed' || st === 'done') return
      const md = normalizeDateStr(m.date)
      if (!md) return
      push(md, {
        id: `ctr-ms-${c.id}-${m.id || idx}`,
        type: 'contract_milestone',
        title: m.title || 'Contract milestone',
        detail: c.title,
        meta: 'Contract · Milestone',
        color: '#283593',
        href: '/contracts',
      })
    })
  })

  hrDocuments.forEach((d) => {
    const exp = normalizeDateStr(d.expiryDate)
    if (!exp) return
    const nda = isNdaHrDocument(d)
    const who = d.employeeId ? empNameById[d.employeeId] || '' : ''
    push(exp, {
      id: `hr-doc-${d.id}`,
      type: nda ? 'nda_hr_doc' : 'hr_doc_expiry',
      title: nda ? `NDA / policy — renew or re-sign: ${d.name}` : `Document due: ${d.name}`,
      detail: [d.category, who].filter(Boolean).join(' · ') || 'HR documentation',
      meta: 'HR · Document expiry',
      color: nda ? '#c2185b' : '#7b1fa2',
      href: '/hr-space/hr-docs',
    })
  })

  trainingRecords.forEach((tr) => {
    const exp = normalizeDateStr(tr.expiryDate)
    if (!exp) return
    const who = tr.employeeId ? empNameById[tr.employeeId] || '' : ''
    push(exp, {
      id: `train-${tr.id}`,
      type: 'training_expiry',
      title: `Training / cert due: ${tr.title || 'Training'}`,
      detail: [tr.provider, who].filter(Boolean).join(' · ') || 'Training & certification',
      meta: 'HR · Training expiry',
      color: '#00838f',
      href: '/hr-space/training',
    })
  })

  goals.forEach((g) => {
    if (g.status === 'Completed') return
    const td = normalizeDateStr(g.targetDate)
    if (!td) return
    const who = g.employeeId ? empNameById[g.employeeId] || '' : ''
    push(td, {
      id: `goal-${g.id}`,
      type: 'hr_goal',
      title: `Goal target: ${g.title || 'Goal'}`,
      detail: [g.category, who].filter(Boolean).join(' · ') || 'HR goals',
      meta: 'HR · Goal due date',
      color: '#5e35b1',
      href: '/hr-space',
    })
  })

  return events
}

/** Group events by YYYY-MM-DD (each event must have `.date`) */
export function groupEventsByDate(events) {
  /** @type {Record<string, PlatformCalendarEvent[]>} */
  const map = {}
  ;(events || []).forEach((e) => {
    const d = normalizeDateStr(e.date)
    if (!d) return
    if (!map[d]) map[d] = []
    map[d].push(e)
  })
  return map
}

/** Exhibitions that overlap a given calendar month */
export function filterExhibitionsForMonth(exhibitions, year, monthIndex0) {
  const startM = new Date(year, monthIndex0, 1)
  const endM = new Date(year, monthIndex0 + 1, 0, 23, 59, 59)
  return (exhibitions || []).filter((ex) => {
    const s = new Date(`${normalizeDateStr(ex.startDate)}T12:00:00`)
    const e = new Date(`${normalizeDateStr(ex.endDate)}T12:00:00`)
    return s <= endM && e >= startM
  })
}
