import { describe, it, expect } from 'vitest'
import {
  COMMERCIAL_SPACE,
  HR_PEOPLE_SPACE,
  seedAllCompanyFolders,
  seedCommercialFolders,
  seedHrPeopleFolders,
  seedPlantQmsFolders,
} from '../data/companyDatabaseSpaces'
import {
  companyDatabasePath,
  documentsInFolder,
  ensureSeedFolders,
  folderBreadcrumbs,
  folderStoragePath,
  inferFolderIdForDocument,
  listChildFolders,
  makeUserFolder,
  migrateDocumentsToFolders,
} from '../utils/companyFolders'
import { resolveManagementBreadcrumb } from '../utils/managementRoutes'
import { departmentFolderPath } from '../utils/departmentHome'

describe('company folder tree', () => {
  const folders = seedPlantQmsFolders()

  it('seeds a hierarchical plant QMS tree', () => {
    expect(folders.length).toBeGreaterThan(20)
    expect(listChildFolders(folders, 'folder-plant-qms').length).toBeGreaterThan(5)
    expect(listChildFolders(folders, 'folder-03-prod').some((row) => row.id === 'folder-03-wi')).toBe(true)
  })

  it('builds breadcrumbs and storage paths', () => {
    const crumbs = folderBreadcrumbs(folders, 'folder-03-wi')
    expect(crumbs.map((row) => row.name)).toEqual([
      'Plant / QMS',
      '03 — Production',
      'Work instructions',
    ])
    expect(folderStoragePath(folders, 'folder-03-wi')).toBe('03-prod/03-wi')
  })

  it('infers folder ids from document type and department', () => {
    expect(inferFolderIdForDocument({ type: 'work_instruction' }, folders)).toBe('folder-03-wi')
    expect(inferFolderIdForDocument({ department: 'Engineering' }, folders)).toBe('folder-02-eng')
    expect(inferFolderIdForDocument({ title: 'Misc' }, folders)).toBe('folder-01-forms')
  })

  it('migrates legacy documents without folder ids', () => {
    const migrated = migrateDocumentsToFolders([
      { id: 'd1', type: 'procedure', title: 'QMS manual' },
      { id: 'd2', department: 'Quality', title: 'Inspection plan' },
    ], folders)
    expect(migrated[0].folderId).toBe('folder-01-procedures')
    expect(migrated[1].folderId).toBe('folder-04-quality')
    expect(migrated[0].space).toBe('plant-qms')
  })

  it('lists documents in a folder subtree', () => {
    const docs = [
      { id: 'd1', folderId: 'folder-03-wi' },
      { id: 'd2', folderId: 'folder-03-cp' },
      { id: 'd3', folderId: 'folder-02-eng' },
    ]
    const hits = documentsInFolder(docs, 'folder-03-prod', folders)
    expect(hits.map((row) => row.id)).toEqual(['d1', 'd2'])
  })

  it('merges user folders into the seed tree', () => {
    const merged = ensureSeedFolders([
      makeUserFolder({ parentId: 'folder-03-prod', name: 'Night shift', folders }),
    ])
    expect(merged.some((row) => row.name === 'Night shift')).toBe(true)
    expect(merged.length).toBeGreaterThan(folders.length)
  })

  it('builds company database deep links', () => {
    expect(companyDatabasePath('plant-qms')).toBe('/management/company-database/plant-qms')
    expect(companyDatabasePath('plant-qms', 'folder-03-wi')).toContain('folder-03-wi')
    expect(departmentFolderPath('Quality')).toContain('folder-04-quality')
  })
})

describe('HR and commercial spaces', () => {
  it('seeds HR and commercial folder trees', () => {
    const hr = seedHrPeopleFolders()
    const commercial = seedCommercialFolders()
    expect(hr.some((row) => row.id === 'folder-hr-people')).toBe(true)
    expect(listChildFolders(hr, 'folder-hr-people').length).toBeGreaterThan(4)
    expect(commercial.some((row) => row.id === 'folder-commercial')).toBe(true)
    expect(listChildFolders(commercial, 'folder-commercial').length).toBeGreaterThan(3)
  })

  it('ensureSeedFolders merges all three spaces', () => {
    const merged = ensureSeedFolders([])
    const all = seedAllCompanyFolders()
    expect(merged.length).toBe(all.length)
    expect(merged.some((row) => row.space === HR_PEOPLE_SPACE)).toBe(true)
    expect(merged.some((row) => row.space === COMMERCIAL_SPACE)).toBe(true)
  })

  it('routes HR documents and department links into the HR space', () => {
    const folders = seedAllCompanyFolders()
    expect(inferFolderIdForDocument({ type: 'employment_contract' }, folders)).toBe('folder-hr-02-contracts')
    expect(inferFolderIdForDocument({ type: 'project_binder' }, folders)).toBe('folder-com-01-projects')
    expect(departmentFolderPath('HR')).toContain('/hr-people/')
    expect(departmentFolderPath('HR')).toContain('folder-hr-people')
  })

  it('builds storage paths without space-root segments', () => {
    const folders = seedAllCompanyFolders()
    expect(folderStoragePath(folders, 'folder-hr-02-active')).toBe('hr-02-contracts/hr-02-active')
    expect(folderStoragePath(folders, 'folder-com-03-pos')).toBe('com-03-purchasing/com-03-pos')
  })

  it('merges industry-specific plant folders when seeding', () => {
    const folders = ensureSeedFolders([], 'medical')
    expect(folders.some((row) => row.id === 'folder-08-dhf')).toBe(true)
    expect(folders.some((row) => row.id === 'folder-09-submissions')).toBe(true)
  })
})

describe('company database breadcrumbs', () => {
  it('resolves management trail for folder routes', () => {
    const trail = resolveManagementBreadcrumb('/management/company-database/plant-qms/folder-03-wi')
    expect(trail?.trail.some((row) => row.label === 'Company Database')).toBe(true)
    expect(trail?.trail[trail.trail.length - 1].label).toContain('03')
  })

  it('resolves HR and commercial space crumbs', () => {
    const hr = resolveManagementBreadcrumb('/management/company-database/hr-people')
    expect(hr?.trail.some((row) => /HR/i.test(row.label))).toBe(true)
    const commercial = resolveManagementBreadcrumb('/management/company-database/commercial/folder-com-01-projects')
    expect(commercial?.trail.some((row) => /Commercial/i.test(row.label))).toBe(true)
  })
})
