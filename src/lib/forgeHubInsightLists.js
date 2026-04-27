import { loadRoster } from './forgeCommunityRoster'
import { getProjectAssigneeIds, loadForgeProjects } from './forgeProjects'
import { listAssignableMembershipMembers } from './forgeMembershipAssignees'
import { loadMembershipAssessmentIndex } from './forgeMembershipStorage'
import { STAGE_TABS } from './forgeMembershipLogic'

/** @param {number} n */
export function getForgeStageLabel(n) {
  const row = STAGE_TABS.find((s) => s.n === n)
  return row ? row.label : '—'
}

export function listTypedCandidatesAndRosterMembers() {
  const typed = listAssignableMembershipMembers()
  const { members } = loadRoster()
  return { typed, rosterMembers: members }
}

/** @returns {Array<{ id: string, name: string, stage: number, composite: number, outcome: string | null, updatedAt?: string }>} */
export function listOngoingOnboarding() {
  const index = loadMembershipAssessmentIndex()
  return index
    .filter((r) => {
      if (!r?.id) return false
      const st = typeof r.stage === 'number' ? r.stage : 0
      return !r.outcome && st <= 1
    })
    .map((r) => ({
      id: r.id,
      name: String(r.name || '').trim() || 'Unnamed',
      stage: typeof r.stage === 'number' ? r.stage : 0,
      composite: Number(r.composite) || 0,
      outcome: r.outcome || null,
      updatedAt: r.updatedAt,
    }))
}

/**
 * @param {number | null} averageComposite
 * @returns {Array<{ id: string, name: string, stage: number, composite: number, delta: number | null }>}
 */
export function listScoreComparisonRows(averageComposite) {
  const index = loadMembershipAssessmentIndex()
  const rows = index
    .filter((r) => r?.id && Number(r.composite) > 0)
    .map((r) => {
      const composite = Number(r.composite) || 0
      return {
        id: r.id,
        name: String(r.name || '').trim() || 'Unnamed',
        stage: typeof r.stage === 'number' ? r.stage : 0,
        composite,
        delta: averageComposite != null && !Number.isNaN(averageComposite) ? composite - averageComposite : null,
      }
    })
  rows.sort((a, b) => b.composite - a.composite)
  return rows
}

/** @returns {Array<{ id: string, title: string, status: string, assigneeNames: string }>} */
export function listOpenProjectsWithAssignees() {
  const projects = loadForgeProjects().filter((p) => p && p.status !== 'done' && p.status !== 'closed')
  const byAss = listAssignableMembershipMembers()
  const map = new Map(byAss.map((a) => [a.assessmentId, a.name]))
  return projects.map((p) => {
    const names = getProjectAssigneeIds(p)
      .map((aid) => map.get(aid) || aid)
      .filter(Boolean)
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      assigneeNames: names.length ? names.join(', ') : '—',
    }
  })
}

/** @returns {Array<{ id: string, name: string, stage: number, composite: number }>} */
export function listPendingNominationReviews() {
  const index = loadMembershipAssessmentIndex()
  return index
    .filter((r) => {
      if (!r?.id) return false
      const st = typeof r.stage === 'number' ? r.stage : 0
      return !r.outcome && st === 0
    })
    .map((r) => ({
      id: r.id,
      name: String(r.name || '').trim() || 'Unnamed',
      stage: 0,
      composite: Number(r.composite) || 0,
    }))
}

/**
 * Founding-type assessments plus committee roster (typical voting body).
 * @returns {{ founding: ReturnType<typeof listAssignableMembershipMembers>, committee: Array<{ id: string, name: string }> }}
 */
export function listFoundersAndVotingRoster() {
  const founding = listAssignableMembershipMembers().filter((m) => m.memberType === 'founding')
  const { committee } = loadRoster()
  return { founding, committee }
}
