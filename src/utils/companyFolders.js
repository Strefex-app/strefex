import {
  COMMERCIAL_SPACE,
  COMPANY_DATABASE_PATH,
  DEPARTMENT_FOLDER_HINTS,
  DOC_TYPE_FOLDER_HINTS,
  HR_PEOPLE_SPACE,
  PLANT_QMS_SPACE,
  SPACE_ROOT_FOLDER_IDS,
  seedAllCompanyFolders,
  spaceRootFolderId,
} from '../data/companyDatabaseSpaces'
import { industryPlantFolderSeed } from '../data/industryQualityProfiles'

export {
  COMPANY_DATABASE_PATH,
  PLANT_QMS_SPACE,
  HR_PEOPLE_SPACE,
  spaceRootFolderId,
  SPACE_ROOT_FOLDER_IDS,
}

export function slugifyFolderName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildFolderIndex(folders = []) {
  const byId = new Map()
  ;(folders || []).forEach((row) => {
    if (row?.id) byId.set(row.id, row)
  })
  return byId
}

export function listChildFolders(folders = [], parentId = '') {
  const pid = parentId || ''
  return (folders || [])
    .filter((row) => (row.parentId || '') === pid)
    .sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.name.localeCompare(b.name))
}

export function folderAncestors(folders = [], folderId) {
  const byId = buildFolderIndex(folders)
  const chain = []
  let cur = folderId ? byId.get(folderId) : null
  while (cur) {
    chain.unshift(cur)
    cur = cur.parentId ? byId.get(cur.parentId) : null
  }
  return chain
}

export function folderBreadcrumbs(folders = [], folderId) {
  return folderAncestors(folders, folderId)
}

export function isSpaceRootFolder(folder) {
  if (!folder) return false
  if (!folder.parentId) return true
  return Object.values(SPACE_ROOT_FOLDER_IDS).includes(folder.id)
}

export function folderStoragePath(folders = [], folderId) {
  const chain = folderAncestors(folders, folderId)
  return chain
    .filter((row) => !isSpaceRootFolder(row))
    .map((row) => row.slug || slugifyFolderName(row.name))
    .join('/')
}

export function companyDatabasePath(space = PLANT_QMS_SPACE, folderId = '') {
  if (!folderId) return `${COMPANY_DATABASE_PATH}/${space}`
  return `${COMPANY_DATABASE_PATH}/${space}/${folderId}`
}

export function findSpaceRootFolder(folders = [], space = PLANT_QMS_SPACE) {
  const rootId = spaceRootFolderId(space)
  return (folders || []).find((row) => row.id === rootId)
    || (folders || []).find((row) => row.space === space && !row.parentId)
    || null
}

export function inferFolderIdForDocument(doc = {}, folders = []) {
  if (doc.folderId && folders.some((f) => f.id === doc.folderId)) return doc.folderId
  const byType = DOC_TYPE_FOLDER_HINTS[doc.type]
  if (byType && folders.some((f) => f.id === byType)) return byType
  const byDept = DEPARTMENT_FOLDER_HINTS[doc.department]
  if (byDept && folders.some((f) => f.id === byDept)) return byDept
  const space = doc.space || PLANT_QMS_SPACE
  const root = findSpaceRootFolder(folders, space)
  if (space === HR_PEOPLE_SPACE) return 'folder-hr-01-policies'
  if (space === COMMERCIAL_SPACE) return 'folder-com-01-projects'
  return root?.id === 'folder-plant-qms' ? 'folder-01-forms' : (root?.id || 'folder-01-forms')
}

export function documentsInFolder(documents = [], folderId, folders = []) {
  const ids = new Set([folderId])
  const collect = (pid) => {
    listChildFolders(folders, pid).forEach((child) => {
      ids.add(child.id)
      collect(child.id)
    })
  }
  collect(folderId)
  return (documents || []).filter((doc) => ids.has(doc.folderId))
}

export function migrateDocumentsToFolders(documents = [], folders = []) {
  return (documents || []).map((doc) => {
    if (doc.folderId && folders.some((f) => f.id === doc.folderId)) return doc
    const folderId = inferFolderIdForDocument(doc, folders)
    const folder = folders.find((f) => f.id === folderId)
    return {
      ...doc,
      space: doc.space || folder?.space || PLANT_QMS_SPACE,
      folderId,
    }
  })
}

export function ensureSeedFolders(existing = [], plantIndustry = 'general') {
  const seed = [
    ...seedAllCompanyFolders(),
    ...industryPlantFolderSeed(plantIndustry),
  ]
  const byId = buildFolderIndex(existing)
  const merged = [...(existing || [])]
  seed.forEach((row) => {
    if (!byId.has(row.id)) merged.push({ ...row })
  })
  return merged.sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.name.localeCompare(b.name))
}

export function makeUserFolder({ parentId, name, space = PLANT_QMS_SPACE, folders = [] }) {
  const slug = slugifyFolderName(name)
  const siblings = listChildFolders(folders, parentId)
  return {
    id: `folder-user-${slug}-${Date.now().toString(36)}`,
    parentId: parentId || spaceRootFolderId(space),
    space,
    name: String(name || '').trim() || 'New folder',
    slug,
    sort: (siblings[siblings.length - 1]?.sort || 0) + 1,
    system: false,
    department: '',
    docTypes: [],
  }
}
