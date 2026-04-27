/** Mirrors member_selection_tool_Rev.01.html scoring and copy. */

export const STORE_VER = 'forge-v1'

export const VALUES = [
  {
    id: 'impact',
    name: 'Impact before ego',
    desc: 'Evidence of leading with the question "how can I help?" before "what is in this for me?"',
    interviewQ:
      "Describe a moment when you prioritised the group's outcome over your own recognition.",
  },
  {
    id: 'brotherhood',
    name: 'Brotherhood through trust',
    desc: 'Demonstrated discretion, consistency, and willingness to speak honestly within trusted relationships.',
    interviewQ: 'Tell us about a time you chose honesty in a relationship at personal cost.',
  },
  {
    id: 'lead',
    name: 'Lead by example',
    desc: 'Willingness to acknowledge falling short and hold oneself to the standards expected of others.',
    interviewQ: 'Give an example of a commitment you made that was difficult to honour. What did you do?',
  },
  {
    id: 'elevate',
    name: 'Elevate relentlessly',
    desc: 'Genuine openness to challenge, feedback, and ideas that disrupt current thinking.',
    interviewQ: 'What is the most significant piece of feedback you have acted on in the past year?',
  },
  {
    id: 'give',
    name: 'Give without keeping score',
    desc: 'Pattern of sharing introductions, knowledge, and opportunities freely, before being asked.',
    interviewQ: 'Describe the last meaningful thing you gave to someone without expectation of return.',
  },
  {
    id: 'diverse',
    name: 'Diverse minds, one mission',
    desc: "Active cultivation of perspectives different from one's own; listening before speaking.",
    interviewQ:
      "Tell us about a time you genuinely changed your view because of someone else's perspective.",
  },
]

export const REF_QUESTIONS = [
  'In what context have you known this person, and for how long?',
  'Describe a moment when you saw this person choose integrity or generosity at personal cost.',
  "Is there anything about this person's character or conduct you would want a group of peers to know before admitting them?",
]

export const FOUNDING_MEMBER_DEFAULTS = ['Member A', 'Member B', 'Member C', 'Member D', 'Member E']

export const FLAG_OPTIONS = [
  { key: 'coi', label: '⚑ Conflict of interest', tone: 'red' },
  { key: 'rep', label: '⚑ Reputational concern', tone: 'red' },
  { key: 'rel', label: '⚐ Insufficient relationship history', tone: 'amber' },
  { key: 'form', label: '⚐ Incomplete nomination form', tone: 'amber' },
  { key: 'overlap', label: '⚐ Overlap with existing member profile', tone: 'amber' },
  { key: 'endorse', label: '★ Exceptional endorsement', tone: 'green' },
  { key: 'network', label: '★ Pre-existing strong network ties', tone: 'green' },
]

export const STAGE_TABS = [
  { n: 0, label: 'Nomination Review' },
  { n: 1, label: 'Pre-Screening' },
  { n: 2, label: 'References' },
  { n: 3, label: 'Interview' },
  { n: 4, label: 'Final Decision' },
]

export function calcStageAvg(prefix, stars) {
  const scores = []
  for (const v of VALUES) {
    const v1 = stars[`${prefix}_e1_${v.id}`] || 0
    const v2 = stars[`${prefix}_e2_${v.id}`] || 0
    if (v1 > 0) scores.push(v1)
    if (v2 > 0) scores.push(v2)
  }
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
}

export function calcValueAvg(valueId, stars) {
  const vals = [
    stars[`ps_e1_${valueId}`] || 0,
    stars[`ps_e2_${valueId}`] || 0,
    stars[`int_e1_${valueId}`] || 0,
    stars[`int_e2_${valueId}`] || 0,
  ].filter((x) => x > 0)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
}

export function calcRefAvg(stars) {
  const scores = []
  for (let r = 1; r <= 2; r += 1) {
    for (let q = 1; q <= 3; q += 1) {
      const v = stars[`ref${r}_q${q}`] || 0
      if (v > 0) scores.push(v)
    }
    const ov = stars[`refOverall${r}`] || 0
    if (ov > 0) scores.push(ov)
  }
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
}

export function calcComposite(ps, ref, intv) {
  let composite = 0
  let totalW = 0
  if (ps > 0) {
    composite += ps * 0.35
    totalW += 0.35
  }
  if (ref > 0) {
    composite += ref * 0.1
    totalW += 0.1
  }
  if (intv > 0) {
    composite += intv * 0.55
    totalW += 0.55
  }
  return totalW > 0 ? composite / totalW : 0
}

export function colorClass(n) {
  if (!n) return ''
  if (n >= 3.5) return 'high'
  if (n >= 3.0) return 'mid'
  return 'low'
}

export function fmt(n) {
  return n > 0 ? n.toFixed(2) : '—'
}

/** votes: Record<index, 'proceed'|'defer'|'decline'|'abstain'> */
export function summarizeVotes(votes, memberCount) {
  const entries = Object.entries(votes || {}).filter(([, v]) => v)
  const total = entries.length
  const proceeds = entries.filter(([, x]) => x === 'proceed').length
  const declines = entries.filter(([, x]) => x === 'decline').length
  const threshold = Math.ceil(memberCount * 0.75)
  let text = 'Pending'
  let kind = 'review'
  if (total < memberCount) {
    text = 'Pending'
    kind = 'review'
  } else if (declines > 0) {
    text = 'Hold — concern raised'
    kind = 'hold'
  } else if (proceeds >= threshold) {
    text = 'Proceed'
    kind = 'proceed'
  } else {
    text = 'Insufficient votes'
    kind = 'hold'
  }
  return { total, memberCount, label: text, kind, countLabel: `${total} of ${memberCount} votes cast` }
}

export function emptyAssessmentState() {
  return {
    fields: {},
    stars: {},
    votesNom: {},
    votesFinal: {},
    flaggedKeys: [],
    outcome: null,
    stage: 0,
    memberNames: [...FOUNDING_MEMBER_DEFAULTS],
  }
}

function flaggedFromLegacy(flaggedArr) {
  if (!Array.isArray(flaggedArr)) return []
  const keys = []
  for (const text of flaggedArr) {
    const t = String(text).trim()
    const hit = FLAG_OPTIONS.find((o) => t === o.label || t.includes(o.label.slice(2)))
    if (hit) keys.push(hit.key)
  }
  return [...new Set(keys)]
}

export function mergeLoadedState(base, loaded) {
  if (!loaded || typeof loaded !== 'object') return base
  let flaggedKeys = []
  if (Array.isArray(loaded.flaggedKeys)) flaggedKeys = loaded.flaggedKeys
  else if (Array.isArray(loaded.flagged)) flaggedKeys = flaggedFromLegacy(loaded.flagged)
  return {
    ...base,
    fields: { ...base.fields, ...(loaded.fields || {}) },
    stars: { ...base.stars, ...(loaded.stars || {}) },
    votesNom: { ...(loaded.votesNom || loaded.votes?.nom || {}) },
    votesFinal: { ...(loaded.votesFinal || loaded.votes?.final || {}) },
    flaggedKeys,
    outcome: loaded.outcome ?? null,
    stage: typeof loaded.stage === 'number' ? loaded.stage : 0,
    memberNames: Array.isArray(loaded.memberNames) ? loaded.memberNames : [...FOUNDING_MEMBER_DEFAULTS],
  }
}
