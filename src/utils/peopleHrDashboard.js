/**
 * Compact People overview — same layout as ManagementDashboardMetrics.
 * Headcount, departments, open roles, and hiring are derived from HR Space
 * plus account-registry team members.
 */

function isActive(emp) {
  const s = String(emp?.status || 'active').toLowerCase()
  return s === 'active' || s === 'onboarding'
}

function hasLeft(emp) {
  const s = String(emp?.status || '').toLowerCase()
  return s === 'left' || s === 'inactive' || s === 'terminated' || s === 'resigned' || Boolean(emp?.leftDate)
}

function deptName(row) {
  if (row == null) return ''
  if (typeof row === 'string') return row.trim()
  return String(row.name || row.label || '').trim()
}

function positionStatus(row) {
  const s = String(row?.status || 'open').toLowerCase()
  if (s === 'filled' || s === 'hired') return 'filled'
  if (s === 'on-hold' || s === 'onhold' || s === 'paused' || s === 'hold') return 'onHold'
  if (s === 'cancelled' || s === 'canceled' || s === 'closed') return 'closed'
  return 'open'
}

function candidateLane(row) {
  const s = String(row?.status || 'applied').toLowerCase()
  if (row?.archived) return 'archived'
  if (s === 'hired' || s === 'offer_accepted') return 'hired'
  if (s === 'offer' || s === 'offered') return 'offer'
  if (s === 'interview' || s === 'interviewing') return 'interview'
  if (s === 'screening' || s === 'screen') return 'screening'
  if (s === 'rejected' || s === 'declined') return 'rejected'
  return 'applied'
}

function countBy(list, keyFn) {
  const map = new Map()
  list.forEach((item) => {
    const key = keyFn(item) || 'Unassigned'
    map.set(key, (map.get(key) || 0) + 1)
  })
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * @param {object} input
 * @param {object[]} [input.employees]
 * @param {object[]} [input.departments]
 * @param {object[]} [input.openPositions]
 * @param {object[]} [input.candidates]
 * @param {object[]} [input.talentPool]
 * @param {number} [input.teamMembers]
 * @param {number} [input.forumPosts]
 */
export function buildPeopleManagementMetrics({
  employees = [],
  departments = [],
  openPositions = [],
  candidates = [],
  talentPool = [],
  teamMembers = 0,
  forumPosts = 0,
} = {}) {
  const list = Array.isArray(employees) ? employees : []
  const depts = Array.isArray(departments) ? departments : []
  const positions = Array.isArray(openPositions) ? openPositions : []
  const cand = Array.isArray(candidates) ? candidates : []
  const pool = Array.isArray(talentPool) ? talentPool : []

  const active = list.filter(isActive)
  const left = list.filter(hasLeft)
  const onboarding = list.filter((e) => String(e.status || '').toLowerCase() === 'onboarding')

  const deptLabels = new Set(depts.map(deptName).filter(Boolean))
  active.forEach((e) => {
    const n = String(e.department || '').trim()
    if (n) deptLabels.add(n)
  })
  positions.forEach((p) => {
    const n = String(p.department || '').trim()
    if (n) deptLabels.add(n)
  })

  const openRoles = positions.filter((p) => positionStatus(p) === 'open')
  const filledRoles = positions.filter((p) => positionStatus(p) === 'filled')
  const onHoldRoles = positions.filter((p) => positionStatus(p) === 'onHold')
  const closedRoles = positions.filter((p) => positionStatus(p) === 'closed')
  const liveCandidates = cand.filter((c) => !c.archived && candidateLane(c) !== 'hired' && candidateLane(c) !== 'rejected')

  const departmentBars = countBy(active, (e) => String(e.department || '').trim() || 'Unassigned')
    .slice(0, 8)
    .map((row) => ({ ...row, tone: 'pm' }))

  if (departmentBars.length === 0 && deptLabels.size) {
    ;[...deptLabels].slice(0, 8).forEach((label) => {
      departmentBars.push({ label, value: 0, tone: 'pm' })
    })
  }

  const positionBars = [
    { label: 'Open', value: openRoles.length, tone: 'proc' },
    { label: 'On hold', value: onHoldRoles.length, tone: 'warning' },
    { label: 'Filled', value: filledRoles.length, tone: 'success' },
    { label: 'Closed', value: closedRoles.length, tone: 'primary' },
  ]

  const rolesByDept = countBy(openRoles, (p) => String(p.department || '').trim() || 'Unassigned')
    .slice(0, 6)
    .map((row) => ({ ...row, tone: 'proc' }))

  const teamBars = [
    { label: 'Active', value: active.length, tone: 'success' },
    { label: 'Onboarding', value: onboarding.length, tone: 'warning' },
    { label: 'Left', value: left.length, tone: 'danger' },
    { label: 'Team seats', value: Number(teamMembers) || 0, tone: 'vendor' },
    { label: 'Talent pool', value: pool.length, tone: 'pm' },
  ]

  const pipelineBars = [
    { label: 'Applied', value: cand.filter((c) => candidateLane(c) === 'applied').length, tone: 'primary' },
    { label: 'Screening', value: cand.filter((c) => candidateLane(c) === 'screening').length, tone: 'proc' },
    { label: 'Interview', value: cand.filter((c) => candidateLane(c) === 'interview').length, tone: 'warning' },
    { label: 'Offer', value: cand.filter((c) => candidateLane(c) === 'offer').length, tone: 'success' },
    { label: 'Hired', value: cand.filter((c) => candidateLane(c) === 'hired').length, tone: 'vendor' },
  ]

  const roleBars = countBy(active, (e) => String(e.role || e.title || '').trim() || 'Unassigned')
    .slice(0, 8)
    .map((row) => ({ ...row, tone: 'vendor' }))

  const jobTitles = new Set(
    active.map((e) => String(e.role || e.title || '').trim()).filter(Boolean),
  )

  return {
    kpis: {
      teamMembers: Number(teamMembers) || 0,
      employees: list.length,
      active: active.length,
      departments: deptLabels.size,
      jobTitles: jobTitles.size,
      openRoles: openRoles.length,
      positions: positions.length,
      candidates: liveCandidates.length,
      talentPool: pool.length,
      forumPosts: Number(forumPosts) || 0,
    },
    departmentBars,
    positionBars,
    rolesByDept,
    roleBars,
    teamBars,
    pipelineBars,
  }
}

function isOpenGoal(row) {
  const s = String(row?.status || '').toLowerCase()
  return s !== 'completed' && s !== 'cancelled' && s !== 'canceled'
}

function isPendingReview(row) {
  const s = String(row?.status || '').toLowerCase()
  return s !== 'completed' && s !== 'cancelled' && s !== 'canceled'
}

export function buildHrHubIndicators({
  employees = [],
  ratings = {},
  goals = [],
  dialogues = [],
} = {}) {
  const activeCount = (Array.isArray(employees) ? employees : []).filter(isActive).length
  const values = Object.values(ratings || {}).filter((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
  const avg = values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : 0
  const openGoals = (Array.isArray(goals) ? goals : []).filter(isOpenGoal).length
  const pendingReviews = (Array.isArray(dialogues) ? dialogues : []).filter(isPendingReview).length

  return [
    { id: 'employees', labelKey: 'headcount.totalEmployees', value: String(activeCount), icon: 'team', iconClass: 'blue' },
    {
      id: 'qualification',
      labelKey: 'headcount.averageQualification',
      value: `${avg.toFixed(1)} / 5.0`,
      icon: 'quality',
      iconClass: 'orange',
    },
    { id: 'goals', labelKey: 'headcount.openGoals', value: String(openGoals), icon: 'target', iconClass: 'green' },
    { id: 'reviews', labelKey: 'headcount.pendingReviews', value: String(pendingReviews), icon: 'clipboard', iconClass: 'purple' },
  ]
}
