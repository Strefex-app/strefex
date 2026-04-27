import { STORE_VER } from './forgeMembershipLogic'

export const COMMUNITY_KEY = `${STORE_VER}-community`
export const ROSTER_KEY = `${STORE_VER}-roster`

/** @typedef {{ id: string, name: string, note?: string }} RosterPerson */

function uid() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function loadCommunity() {
  try {
    const r = localStorage.getItem(COMMUNITY_KEY)
    if (!r) return { name: '', registrationComplete: false, registeredAt: null }
    const o = JSON.parse(r)
    return {
      name: typeof o.name === 'string' ? o.name : '',
      registrationComplete: !!o.registrationComplete,
      registeredAt: o.registeredAt || null,
    }
  } catch {
    return { name: '', registrationComplete: false, registeredAt: null }
  }
}

export function saveCommunity(data) {
  localStorage.setItem(COMMUNITY_KEY, JSON.stringify(data))
}

/** @returns {{ members: RosterPerson[], committee: RosterPerson[] }} */
export function loadRoster() {
  try {
    const r = localStorage.getItem(ROSTER_KEY)
    if (!r) return { members: [], committee: [] }
    const o = JSON.parse(r)
    return {
      members: Array.isArray(o.members) ? o.members.filter((x) => x && x.name) : [],
      committee: Array.isArray(o.committee) ? o.committee.filter((x) => x && x.name) : [],
    }
  } catch {
    return { members: [], committee: [] }
  }
}

export function saveRoster(roster) {
  localStorage.setItem(ROSTER_KEY, JSON.stringify(roster))
}

/**
 * @param {{ communityName: string, membersLines?: string, committeeLines?: string }} input
 */
export function completeCommunityRegistration({ communityName, membersLines = '', committeeLines = '' }) {
  const name = (communityName || '').trim()
  if (!name) return false

  const parseLines = (text) => {
    const lines = String(text || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    return lines.map((line) => ({ id: uid(), name: line }))
  }

  const roster = {
    members: parseLines(membersLines),
    committee: parseLines(committeeLines),
  }
  saveRoster(roster)
  saveCommunity({
    name,
    registrationComplete: true,
    registeredAt: new Date().toISOString(),
  })
  return true
}

export function addRosterPerson(kind, name) {
  const n = (name || '').trim()
  if (!n) return
  const roster = loadRoster()
  const list = kind === 'committee' ? [...roster.committee] : [...roster.members]
  list.push({ id: uid(), name: n })
  saveRoster({
    ...roster,
    [kind === 'committee' ? 'committee' : 'members']: list,
  })
}

export function removeRosterPerson(kind, id) {
  const roster = loadRoster()
  if (kind === 'committee') {
    saveRoster({ ...roster, committee: roster.committee.filter((p) => p.id !== id) })
  } else {
    saveRoster({ ...roster, members: roster.members.filter((p) => p.id !== id) })
  }
}
