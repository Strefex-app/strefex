/**
 * HR Space insights for AI Insights (client-side heuristics).
 * Covers documents/agreements, training & requalification, goals, dialogue, onboarding, workforce, hiring.
 */
import { normalizeDateStr } from './platformCalendarEvents'

const fmtCurrency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v || 0)

function daysFromToday(dateStr) {
  const d = normalizeDateStr(dateStr)
  if (!d) return null
  return Math.ceil((new Date(`${d}T12:00:00`) - new Date()) / 86400000)
}

function isAgreementDoc(doc) {
  const blob = `${doc.name || ''} ${doc.category || ''}`.toLowerCase()
  return (
    /contract|employment|nda|non-disclosure|agreement|policy|handbook|addendum/i.test(blob)
  )
}

/** @returns {Array<{ id: string, domain: string, title: string, simulation: string, recommendation: string, activities: string[], priority: string, href: string }>} */
export function deriveHrSpaceInsights({
  employees = [],
  hrDocuments = [],
  trainingRecords = [],
  goals = [],
  dialogues = [],
  onboardingTasks = [],
  ratings = {},
  qualificationNames = [],
  workforcePlans = [],
  openPositions = [],
  candidates = [],
}) {
  const out = []

  const empName = Object.fromEntries(employees.map((e) => [e.id, e.name || e.fullName || e.id]))

  /* HR documents & agreements — expiry */
  hrDocuments.forEach((doc) => {
    const exp = doc.expiryDate ? daysFromToday(doc.expiryDate) : null
    if (exp == null || doc.status === 'Archived') return
    const label = isAgreementDoc(doc) ? 'Agreement / document' : 'HR document'
    if (exp < 0) {
      out.push({
        id: `hr-doc-exp-${doc.id}`,
        domain: 'hr',
        title: `Expired — ${doc.name}`,
        simulation: `${label} expired ${Math.abs(exp)} days ago. Renewal or archive required for compliance.`,
        recommendation: 'Re-issue, re-sign, or supersede with a new version; update status in HR Documentation.',
        activities: ['Open HR Documentation and locate this file.', 'Assign owner and due date.', 'Link replacement document ID when uploaded.'],
        priority: 'high',
        href: '/hr-space/hr-docs',
      })
    } else if (exp <= 90) {
      out.push({
        id: `hr-doc-soon-${doc.id}`,
        domain: 'hr',
        title: `Renewal window — ${doc.name}`,
        simulation: `Expires in ${exp} days (${doc.category || 'General'}).`,
        recommendation: 'Start internal approval and employee acknowledgment if terms change.',
        activities: ['Notify employee/manager.', 'Schedule signing or policy attestation.'],
        priority: exp <= 30 ? 'high' : 'medium',
        href: '/hr-space/hr-docs',
      })
    }
  })

  /* Training & certification expiry (requalification) */
  trainingRecords.forEach((tr) => {
    const exp = tr.expiryDate ? daysFromToday(tr.expiryDate) : null
    if (exp == null) return
    const who = empName[tr.employeeId] || 'Employee'
    if (exp < 0) {
      out.push({
        id: `hr-tr-exp-${tr.id}`,
        domain: 'hr',
        title: `Training lapsed — ${tr.title}`,
        simulation: `${who}: certification expired ${Math.abs(exp)} days ago. Requalification may be required for role or audit readiness.`,
        recommendation: 'Schedule refresher or exam; block high-risk tasks until valid.',
        activities: ['Training module → assign refresher.', 'Update record with new completion/expiry dates.'],
        priority: 'high',
        href: '/hr-space/training',
      })
    } else if (exp <= 90) {
      out.push({
        id: `hr-tr-soon-${tr.id}`,
        domain: 'hr',
        title: `Requalification due — ${tr.title}`,
        simulation: `${who}: expires in ${exp} days (${tr.provider || 'provider TBD'}).`,
        recommendation: 'Book session before line-down or customer audit windows.',
        activities: ['Export list of expiring trainings for supervisors.', 'Prefer internal catalog if available.'],
        priority: exp <= 30 ? 'high' : 'medium',
        href: '/hr-space/training',
      })
    }
  })

  /* Goals */
  goals.forEach((g) => {
    if (g.status === 'Completed') return
    const due = g.targetDate ? daysFromToday(g.targetDate) : null
    if (g.status === 'Overdue' || (due != null && due < 0 && g.status !== 'Completed')) {
      out.push({
        id: `hr-goal-${g.id}`,
        domain: 'hr',
        title: `Goal off-track — ${g.title}`,
        simulation: `Target date ${g.targetDate || 'n/a'} (${g.status}). Progress ${g.progress ?? 0}%.`,
        recommendation: 'Re-scope, extend with justification, or close with documented outcome.',
        activities: ['Goals: review with employee.', 'Break into smaller milestones.'],
        priority: 'high',
        href: '/hr-space/goals',
      })
    } else if (g.status === 'Not Started' && due != null && due <= 60) {
      out.push({
        id: `hr-goal-ns-${g.id}`,
        domain: 'hr',
        title: `Goal not started — ${g.title}`,
        simulation: `Due in ${due} days but status is Not Started.`,
        recommendation: 'Kick off with a short plan and first measurable step.',
        activities: ['1:1 to align priority.', 'Set first checkpoint date.'],
        priority: 'medium',
        href: '/hr-space/goals',
      })
    }
  })

  /* Performance dialogue — open cycles */
  const openDialogues = dialogues.filter((d) => d.status === 'In Progress')
  if (openDialogues.length > 0) {
    out.push({
      id: 'hr-dialogue-open',
      domain: 'hr',
      title: `${openDialogues.length} performance dialogue(s) in progress`,
      simulation: 'Open review cycles increase compliance risk if left unsigned past policy deadlines.',
      recommendation: 'Complete employee feedback, signatures, and development plan handoff.',
      activities: ['Dialogue module: filter In Progress.', 'Escalate to HRBP for stale items >45 days.'],
      priority: openDialogues.length > 3 ? 'high' : 'medium',
      href: '/hr-space/dialogue',
    })
  }

  /* Onboarding tasks overdue */
  const lateOnboarding = onboardingTasks.filter((t) => !t.done && t.dueDate && daysFromToday(t.dueDate) < 0)
  if (lateOnboarding.length > 0) {
    out.push({
      id: 'hr-onboarding-late',
      domain: 'hr',
      title: `${lateOnboarding.length} onboarding task(s) past due`,
      simulation: 'Delayed onboarding correlates with safety and systems-access gaps.',
      recommendation: 'Clear blockers (IT, manager, HR) and reset dates realistically.',
      activities: ['Onboarding board: sort by due date.', 'Mark done or reassign.'],
      priority: 'high',
      href: '/hr-space/onboarding',
    })
  }

  /* Qualification matrix — low scores → requalification */
  const qn = qualificationNames.length
  const weak = []
  if (qn > 0) {
    employees.forEach((e) => {
      if (e.status && e.status !== 'active') return
      let sum = 0
      let n = 0
      for (let q = 0; q < qn; q += 1) {
        const v = ratings[`${e.id}-${q}`]
        if (v != null) {
          sum += v
          n += 1
        }
      }
      if (n > 0) {
        const avg = sum / n
        if (avg < 2.5) weak.push({ name: e.name, avg: avg.toFixed(1) })
      }
    })
  }
  if (weak.length > 0) {
    out.push({
      id: 'hr-qual-weak',
      domain: 'hr',
      title: `${weak.length} employee(s) below qualification threshold`,
      simulation: `Average matrix score below 2.5/5 for: ${weak.slice(0, 4).map((w) => `${w.name} (${w.avg})`).join('; ')}${weak.length > 4 ? '…' : ''}`,
      recommendation: 'Plan targeted requalification: training, coaching, or reassignment of tasks.',
      activities: ['Open Qualification Matrix.', 'Sort by lowest stars.', 'Create training tickets.'],
      priority: weak.length > 2 ? 'high' : 'medium',
      href: '/hr-space/qualification-matrix',
    })
  }

  /* Workforce plans — headcount gap */
  workforcePlans.forEach((wp) => {
    const tgt = wp.targetHeadcount || 0
    const cur = wp.currentAssigned || 0
    if (tgt > 0 && cur < tgt * 0.75) {
      const gap = tgt - cur
      out.push({
        id: `hr-wf-${wp.id}`,
        domain: 'hr',
        title: `Workforce gap — ${wp.title || wp.department}`,
        simulation: `${cur}/${tgt} assigned (${gap} open vs plan). At full payroll cost of typical role, illustrative gap cost ${fmtCurrency(gap * 4500)}/mo (placeholder).`,
        recommendation: 'Align hiring pipeline and internal transfers; update plan if demand changed.',
        activities: ['Workforce planning view.', 'Link open requisitions.'],
        priority: gap > 8 ? 'high' : 'medium',
        href: '/hr-space/workforce',
      })
    }
  })

  /* Hiring pipeline */
  const openPos = openPositions.filter((p) => p.status === 'open' || !p.status)
  const screening = candidates.filter((c) => c.status === 'screening' || c.status === 'interview')
  if (openPos.length > 0) {
    out.push({
      id: 'hr-hiring-open',
      domain: 'hr',
      title: `${openPos.length} open position(s)`,
      simulation: `${screening.length} candidate(s) in active screening/interview stages.`,
      recommendation: 'Keep SLA for feedback to candidates; prioritize roles tied to production ramp-up.',
      activities: ['Hiring module: review aging reqs.', 'Sync with managers on must-haves.'],
      priority: openPos.length > 2 ? 'medium' : 'low',
      href: '/hr-space/hiring',
    })
  }

  return out
}
