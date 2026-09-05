import { IATF_CONTROL_PATH } from '../data/iatfControlCatalog'
import { COMPANY_DATABASE_PATH } from '../data/companyDatabaseSpaces'
import { DEPARTMENTS_PATH, departmentSlug } from './departmentHome'
import { companyDatabasePath } from './companyFolders'

function hay(...parts) {
  return parts.map((p) => String(p || '')).join(' ').toLowerCase()
}

/**
 * Search live company records (not only management module titles).
 * @returns {{ kind: string, title: string, path: string, hint: string }[]}
 */
export function searchCompanyRecords(query, {
  documents = [],
  parts = [],
  lots = [],
  ncrs = [],
  employees = [],
  projects = [],
  rfqs = [],
  departments = [],
  folders = [],
} = {}) {
  const q = String(query || '').trim().toLowerCase()
  if (q.length < 2) return []
  const hits = []

  if (hay('company workflows', 'hire onboarding qualification training goals review', 'ncr 8d ppap lot').includes(q)) {
    hits.push({
      kind: 'Workflow',
      title: 'Company workflows',
      path: '/management/people/workflows',
      hint: 'People, quality, sourcing, production sequences',
    })
  }

  ;(departments || []).forEach((name) => {
    if (hay(name).includes(q)) {
      hits.push({
        kind: 'Department',
        title: name,
        path: `${DEPARTMENTS_PATH}/${departmentSlug(name)}`,
        hint: 'People, QMS docs, lots',
      })
    }
  })

  ;(folders || []).forEach((folder) => {
    if (hay(folder.name, folder.space).includes(q)) {
      hits.push({
        kind: 'Folder',
        title: folder.name,
        path: companyDatabasePath(folder.space, folder.id),
        hint: folder.space || 'plant-qms',
      })
    }
  })

  ;(documents || []).forEach((doc) => {
    if (hay(doc.docNumber, doc.title, doc.department).includes(q)) {
      hits.push({
        kind: 'QMS document',
        title: doc.title || doc.docNumber,
        path: doc.folderId
          ? companyDatabasePath(doc.space || 'plant-qms', doc.folderId)
          : COMPANY_DATABASE_PATH,
        hint: [doc.docNumber, doc.department].filter(Boolean).join(' · '),
      })
    }
  })

  ;(parts || []).forEach((part) => {
    if (hay(part.partNumber, part.name, part.revision).includes(q)) {
      hits.push({
        kind: 'Part',
        title: part.partNumber || part.name,
        path: IATF_CONTROL_PATH,
        hint: part.name || part.revision || '',
      })
    }
  })

  ;(lots || []).forEach((lot) => {
    if (hay(lot.lotNumber, lot.materialCert, lot.department, lot.serialNumber).includes(q)) {
      hits.push({
        kind: 'Lot',
        title: lot.lotNumber,
        path: IATF_CONTROL_PATH,
        hint: lot.department || lot.materialCert || '',
      })
    }
  })

  ;(ncrs || []).forEach((ncr) => {
    if (hay(ncr.number, ncr.description).includes(q)) {
      hits.push({
        kind: 'NCR',
        title: ncr.number,
        path: IATF_CONTROL_PATH,
        hint: ncr.description || ncr.status || '',
      })
    }
  })

  ;(employees || []).forEach((row) => {
    if (hay(row.name, row.email, row.role, row.department, row.employeeNumber).includes(q)) {
      hits.push({
        kind: 'Employee',
        title: row.name,
        path: `/management/people/hr-space/employees/${row.id}`,
        hint: [row.employeeNumber, row.department, row.role].filter(Boolean).join(' · '),
      })
    }
  })

  ;(projects || []).forEach((row) => {
    if (hay(row.name, row.projectNumber, row.benefitNote).includes(q)) {
      hits.push({
        kind: 'Project',
        title: row.name,
        path: `/management/ops/projects/project/${row.id}`,
        hint: row.projectNumber || '',
      })
    }
  })

  ;(rfqs || []).forEach((row) => {
    if (hay(row.title, row.buyerRefDisplay, row.id).includes(q)) {
      hits.push({
        kind: 'RFQ',
        title: row.title || row.buyerRefDisplay || row.id,
        path: `/rfq-comparison/${row.id}`,
        hint: row.buyerRefDisplay || row.status || '',
      })
    }
  })

  return hits.slice(0, 24)
}
