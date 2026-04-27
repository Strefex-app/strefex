import { STORE_VER } from './forgeMembershipLogic'
import { loadMembershipAssessmentIndex } from './forgeMembershipStorage'

/**
 * Resolve membership type for an index row (prefers denormalized index.memberType, else full payload).
 * @param {{ id: string, memberType?: string | null }} row
 * @returns {'founding' | 'club' | null}
 */
export function resolveMemberTypeForIndexRow(row) {
  if (!row?.id) return null
  const direct = row.memberType
  if (direct === 'founding' || direct === 'club') return direct
  try {
    const raw = localStorage.getItem(`${STORE_VER}-${row.id}`)
    if (!raw) return null
    const o = JSON.parse(raw)
    const mt = String(o.fields?.memberType || '').trim()
    return mt === 'founding' || mt === 'club' ? mt : null
  } catch {
    return null
  }
}

/**
 * Candidates from membership onboarding with a membership type (assignable in Forge projects).
 * @returns {Array<{ assessmentId: string, name: string, memberType: 'founding'|'club', memberTypeLabel: string }>}
 */
export function listAssignableMembershipMembers() {
  const index = loadMembershipAssessmentIndex()
  const out = []
  for (const row of index) {
    if (!row?.id) continue
    const memberType = resolveMemberTypeForIndexRow(row)
    if (!memberType) continue
    const name = String(row.name || '').trim() || 'Unnamed'
    out.push({
      assessmentId: row.id,
      name,
      memberType,
      memberTypeLabel: memberType === 'founding' ? 'Founding Member' : 'Club Member',
    })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

export function countTypedMembershipCandidates() {
  return listAssignableMembershipMembers().length
}
