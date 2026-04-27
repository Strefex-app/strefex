import { STORE_VER } from './forgeMembershipLogic'

export const FORGE_PROJECTS_KEY = `${STORE_VER}-open-projects`

function uid() {
  return `fp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** @typedef {'open'|'in_progress'|'done'|'closed'} ForgeProjectStatus */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   description: string,
 *   assigneeAssessmentIds: string[],
 *   status: ForgeProjectStatus,
 *   createdAt: string,
 *   updatedAt: string,
 * }} ForgeProject
 */

/**
 * @param {unknown} p
 * @returns {string[]}
 */
export function getProjectAssigneeIds(p) {
  if (!p || typeof p !== 'object') return []
  const o = /** @type {{ assigneeAssessmentIds?: unknown, assigneeAssessmentId?: unknown }} */ (p)
  if (Array.isArray(o.assigneeAssessmentIds) && o.assigneeAssessmentIds.length) {
    return [...new Set(o.assigneeAssessmentIds.map((x) => String(x || '').trim()).filter(Boolean))]
  }
  const legacy = String(o.assigneeAssessmentId || '').trim()
  return legacy ? [legacy] : []
}

/** @param {unknown} raw */
function migrateRawProject(raw) {
  if (!raw || typeof raw !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (raw)
  const ids = getProjectAssigneeIds(r)
  return {
    ...r,
    assigneeAssessmentIds: ids,
  }
}

/** @returns {ForgeProject[]} */
export function loadForgeProjects() {
  try {
    const stored = localStorage.getItem(FORGE_PROJECTS_KEY)
    const arr = stored ? JSON.parse(stored) : []
    if (!Array.isArray(arr)) return []
    return arr.map(migrateRawProject).filter(Boolean)
  } catch {
    return []
  }
}

/** @param {ForgeProject[]} list */
function saveForgeProjectsList(list) {
  const normalized = list.map((p) => {
    const ids = getProjectAssigneeIds(p)
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      assigneeAssessmentIds: ids,
    }
  })
  localStorage.setItem(FORGE_PROJECTS_KEY, JSON.stringify(normalized))
}

/**
 * @param {string[] | undefined} ids
 * @param {string | undefined} legacySingle
 */
function normalizeAssigneeInput(ids, legacySingle) {
  const fromArr = Array.isArray(ids) ? ids : []
  const merged = [...fromArr.map((x) => String(x || '').trim()).filter(Boolean)]
  const one = String(legacySingle || '').trim()
  if (one) merged.push(one)
  return [...new Set(merged)]
}

/**
 * @param {Omit<ForgeProject, 'id'|'createdAt'|'updatedAt'> & { id?: string, assigneeAssessmentId?: string }} input
 * @returns {ForgeProject | null}
 */
export function addForgeProject(input) {
  const title = String(input.title || '').trim()
  const assigneeAssessmentIds = normalizeAssigneeInput(input.assigneeAssessmentIds, input.assigneeAssessmentId)
  if (!title || !assigneeAssessmentIds.length) return null
  const now = new Date().toISOString()
  /** @type {ForgeProject} */
  const row = {
    id: input.id || uid(),
    title,
    description: String(input.description || '').trim(),
    assigneeAssessmentIds,
    status: input.status === 'in_progress' || input.status === 'done' || input.status === 'closed' ? input.status : 'open',
    createdAt: now,
    updatedAt: now,
  }
  const list = loadForgeProjects()
  list.unshift(row)
  saveForgeProjectsList(list)
  return row
}

/**
 * @param {string} id
 * @param {Partial<Pick<ForgeProject, 'title'|'description'|'assigneeAssessmentIds'|'assigneeAssessmentId'|'status'>>} patch
 */
export function updateForgeProject(id, patch) {
  const list = loadForgeProjects()
  const i = list.findIndex((p) => p.id === id)
  if (i < 0) return null
  const cur = list[i]
  let nextIds = getProjectAssigneeIds(cur)
  if (patch.assigneeAssessmentIds != null) {
    nextIds = [...new Set(patch.assigneeAssessmentIds.map((x) => String(x || '').trim()).filter(Boolean))]
  } else if (patch.assigneeAssessmentId != null) {
    const one = String(patch.assigneeAssessmentId).trim()
    nextIds = one ? [one] : []
  }
  const next = {
    ...cur,
    title: patch.title != null ? String(patch.title).trim() : cur.title,
    description: patch.description != null ? String(patch.description).trim() : cur.description,
    assigneeAssessmentIds: nextIds,
    status: patch.status != null ? patch.status : cur.status,
    updatedAt: new Date().toISOString(),
  }
  list[i] = next
  saveForgeProjectsList(list)
  return next
}

/** @param {string} id */
export function removeForgeProject(id) {
  const list = loadForgeProjects().filter((p) => p.id !== id)
  saveForgeProjectsList(list)
}

export function countOpenForgeProjects() {
  return loadForgeProjects().filter((p) => p && p.status !== 'done' && p.status !== 'closed').length
}
