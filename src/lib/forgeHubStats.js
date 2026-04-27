import { loadCommunity, loadRoster } from './forgeCommunityRoster'
import { FOUNDING_MEMBER_DEFAULTS } from './forgeMembershipLogic'
import { loadMembershipAssessmentIndex } from './forgeMembershipStorage'
import { countTypedMembershipCandidates } from './forgeMembershipAssignees'
import { countOpenForgeProjects } from './forgeProjects'

/**
 * Aggregates for Forge hub indicators and tracking.
 * @returns {{
 *   memberCases: number,
 *   foundingSeats: number,
 *   averageComposite: number | null,
 *   openProjects: number,
 *   pendingReviews: number,
 *   ongoingOnboarding: number,
 *   community: { name: string, registrationComplete: boolean, registeredAt: string | null },
 *   roster: { members: Array<{ id: string, name: string }>, committee: Array<{ id: string, name: string }> },
 *   communityMemberCount: number,
 *   membershipCandidatesWithType: number,
 *   index: Array<{ id: string, name?: string, stage?: number, outcome?: string | null, composite?: number, updatedAt?: string }>,
 *   trackingRows: Array<{ id: string, name: string, stage: number, outcome: string | null, composite: number, updatedAt?: string }>,
 * }}
 */
export function getForgeHubStats() {
  const index = loadMembershipAssessmentIndex()
  const openProjects = countOpenForgeProjects()
  const membershipCandidatesWithType = countTypedMembershipCandidates()

  const composites = index.map((r) => Number(r.composite)).filter((n) => n > 0 && !Number.isNaN(n))
  const averageComposite =
    composites.length > 0 ? composites.reduce((a, b) => a + b, 0) / composites.length : null

  const pendingReviews = index.filter((r) => {
    const st = typeof r.stage === 'number' ? r.stage : 0
    return !r.outcome && st === 0
  }).length

  const ongoingOnboarding = index.filter((r) => {
    const st = typeof r.stage === 'number' ? r.stage : 0
    return !r.outcome && st <= 1
  }).length

  const community = loadCommunity()
  const roster = loadRoster()
  const communityMemberCount = community.registrationComplete ? roster.members.length : 0

  const trackingRows = index.slice(0, 8).map((r) => ({
    id: r.id,
    name: r.name || 'Unnamed',
    stage: typeof r.stage === 'number' ? r.stage : 0,
    outcome: r.outcome || null,
    composite: Number(r.composite) || 0,
    updatedAt: r.updatedAt,
  }))

  return {
    memberCases: index.length,
    foundingSeats: FOUNDING_MEMBER_DEFAULTS.length,
    averageComposite,
    openProjects,
    pendingReviews,
    ongoingOnboarding,
    community,
    roster,
    communityMemberCount,
    membershipCandidatesWithType,
    index,
    trackingRows,
  }
}
