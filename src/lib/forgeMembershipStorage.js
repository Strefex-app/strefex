import { STORE_VER } from './forgeMembershipLogic'

const INDEX_KEY = `${STORE_VER}-index`

export function loadMembershipAssessmentIndex() {
  try {
    const r = localStorage.getItem(INDEX_KEY)
    return r ? JSON.parse(r) : []
  } catch {
    return []
  }
}

export function saveMembershipAssessmentIndex(index) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch {
    /* ignore */
  }
}
