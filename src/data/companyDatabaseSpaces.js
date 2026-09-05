/** Company Database spaces — folder trees for controlled plant / HR / commercial files. */

export const COMPANY_DATABASE_PATH = '/management/company-database'

export const PLANT_QMS_SPACE = 'plant-qms'
export const HR_PEOPLE_SPACE = 'hr-people'
export const COMMERCIAL_SPACE = 'commercial'
export const COST_RATES_SPACE = 'cost-rates'

/** Root folder id for each space (used by browser + storage paths). */
export const SPACE_ROOT_FOLDER_IDS = {
  [PLANT_QMS_SPACE]: 'folder-plant-qms',
  [HR_PEOPLE_SPACE]: 'folder-hr-people',
  [COMMERCIAL_SPACE]: 'folder-commercial',
  [COST_RATES_SPACE]: 'folder-cost-rates',
}

export const COMPANY_DATABASE_SPACES = [
  {
    id: PLANT_QMS_SPACE,
    label: 'Plant / QMS',
    description: 'Controlled procedures, work instructions, PPAP files, and certificates.',
    iatfPath: '/management/ops/iatf-control',
    rootFolderId: SPACE_ROOT_FOLDER_IDS[PLANT_QMS_SPACE],
  },
  {
    id: HR_PEOPLE_SPACE,
    label: 'HR / People',
    description: 'Employment contracts, policies, training records, and HR files.',
    relatedPath: '/management/people/hr-space/hr-docs',
    relatedLabel: 'HR Documentation',
    rootFolderId: SPACE_ROOT_FOLDER_IDS[HR_PEOPLE_SPACE],
  },
  {
    id: COMMERCIAL_SPACE,
    label: 'Commercial',
    description: 'Project binders, purchasing documents, and customer commercial packs.',
    relatedPath: '/management/ops/projects',
    relatedLabel: 'Projects',
    rootFolderId: SPACE_ROOT_FOLDER_IDS[COMMERCIAL_SPACE],
  },
  {
    id: COST_RATES_SPACE,
    label: 'Cost rates',
    description: 'Company-level material, process, energy tariffs, and personnel rates — all manually editable by location.',
    relatedPath: '/management/sourcing/price-calculator?tab=database',
    relatedLabel: 'Manufacturing calculator / Rate database',
    rootFolderId: SPACE_ROOT_FOLDER_IDS[COST_RATES_SPACE],
  },
]

function makeFolderRow(space, id, parentId, name, sort, extra = {}) {
  return {
    id,
    parentId: parentId || '',
    space,
    name,
    slug: id.replace(/^folder-/, ''),
    sort,
    system: true,
    department: extra.department || '',
    docTypes: extra.docTypes || [],
    ...extra,
  }
}

/**
 * Seed folder tree for Plant / QMS.
 * Flat list with parentId — persisted in iatfControlStore.folders.
 */
export function seedPlantQmsFolders() {
  const space = PLANT_QMS_SPACE
  const row = (id, parentId, name, sort, extra = {}) => makeFolderRow(space, id, parentId, name, sort, extra)

  return [
    row('folder-plant-qms', '', 'Plant / QMS', 0),
    row('folder-01-mgmt', 'folder-plant-qms', '01 — Management system', 10, { department: 'Quality' }),
    row('folder-01-procedures', 'folder-01-mgmt', 'Procedures', 11, { docTypes: ['procedure'] }),
    row('folder-01-forms', 'folder-01-mgmt', 'Forms & records', 12, { docTypes: ['form'] }),
    row('folder-01-standards', 'folder-01-mgmt', 'External standards', 13),
    row('folder-02-eng', 'folder-plant-qms', '02 — Engineering', 20, { department: 'Engineering' }),
    row('folder-02-drawings', 'folder-02-eng', 'Drawings & specs', 21),
    row('folder-02-fmea', 'folder-02-eng', 'PFMEA / DFMEA', 22, { docTypes: ['pfmea'] }),
    row('folder-02-ppap', 'folder-02-eng', 'APQP / PPAP submissions', 23, { docTypes: ['ppap'] }),
    row('folder-03-prod', 'folder-plant-qms', '03 — Production', 30, { department: 'Production' }),
    row('folder-03-wi', 'folder-03-prod', 'Work instructions', 31, { docTypes: ['work_instruction'] }),
    row('folder-03-cp', 'folder-03-prod', 'Control plans', 32, { docTypes: ['control_plan'] }),
    row('folder-03-setup', 'folder-03-prod', 'Setup / operation sheets', 33),
    row('folder-04-quality', 'folder-plant-qms', '04 — Quality', 40, { department: 'Quality' }),
    row('folder-04-inspection', 'folder-04-quality', 'Inspection & test', 41),
    row('folder-04-msa', 'folder-04-quality', 'MSA / SPC', 42),
    row('folder-04-8d', 'folder-04-quality', 'Customer complaints / 8D', 43),
    row('folder-05-purch', 'folder-plant-qms', '05 — Purchasing & logistics', 50, { department: 'Purchasing' }),
    row('folder-05-supplier', 'folder-05-purch', 'Supplier PPAP / certs', 51),
    row('folder-05-material', 'folder-05-purch', 'Material certs (incoming)', 52, { department: 'Logistics' }),
    row('folder-06-certs', 'folder-plant-qms', '06 — Certificates & audits', 60, { department: 'Quality' }),
    row('folder-06-iatf', 'folder-06-certs', 'IATF / ISO certificates', 61),
    row('folder-06-audit', 'folder-06-certs', 'Audit reports', 62),
    row('folder-07-projects', 'folder-plant-qms', '07 — Projects & customers', 70),
    row('folder-07-customer', 'folder-07-projects', 'Customer-specific packs', 71),
  ]
}

/** Seed folder tree for HR / People. */
export function seedHrPeopleFolders() {
  const space = HR_PEOPLE_SPACE
  const row = (id, parentId, name, sort, extra = {}) => makeFolderRow(space, id, parentId, name, sort, extra)

  return [
    row('folder-hr-people', '', 'HR / People', 0, { department: 'HR' }),
    row('folder-hr-01-policies', 'folder-hr-people', '01 — Policies & handbooks', 10, {
      department: 'HR',
      docTypes: ['hr_policy'],
    }),
    row('folder-hr-01-handbook', 'folder-hr-01-policies', 'Employee handbook', 11),
    row('folder-hr-01-hse', 'folder-hr-01-policies', 'HSE / workplace rules', 12, {
      docTypes: ['safety_doc'],
    }),
    row('folder-hr-02-contracts', 'folder-hr-people', '02 — Employment contracts', 20, {
      department: 'HR',
      docTypes: ['employment_contract'],
    }),
    row('folder-hr-02-active', 'folder-hr-02-contracts', 'Active contracts', 21),
    row('folder-hr-02-templates', 'folder-hr-02-contracts', 'Templates & NDAs', 22),
    row('folder-hr-03-roles', 'folder-hr-people', '03 — Roles & job descriptions', 30, {
      department: 'HR',
      docTypes: ['job_description'],
    }),
    row('folder-hr-04-training', 'folder-hr-people', '04 — Training & competence', 40, {
      department: 'HR',
      docTypes: ['training_record'],
    }),
    row('folder-hr-04-certs', 'folder-hr-04-training', 'Certificates', 41),
    row('folder-hr-04-matrix', 'folder-hr-04-training', 'Qualification evidence', 42),
    row('folder-hr-05-performance', 'folder-hr-people', '05 — Performance & dialogue', 50, {
      department: 'HR',
      docTypes: ['performance_record'],
    }),
    row('folder-hr-06-leave', 'folder-hr-people', '06 — Leave & absence', 60, {
      department: 'HR',
    }),
    row('folder-hr-07-disciplinary', 'folder-hr-people', '07 — Disciplinary (restricted)', 70, {
      department: 'HR',
      docTypes: ['disciplinary_record'],
    }),
  ]
}

/** Seed folder tree for Commercial (projects / purchasing). */
export function seedCommercialFolders() {
  const space = COMMERCIAL_SPACE
  const row = (id, parentId, name, sort, extra = {}) => makeFolderRow(space, id, parentId, name, sort, extra)

  return [
    row('folder-commercial', '', 'Commercial', 0),
    row('folder-com-01-projects', 'folder-commercial', '01 — Project binders', 10, {
      docTypes: ['project_binder'],
    }),
    row('folder-com-01-active', 'folder-com-01-projects', 'Active projects', 11),
    row('folder-com-01-closed', 'folder-com-01-projects', 'Closed / archive', 12),
    row('folder-com-02-quotes', 'folder-commercial', '02 — Quotes & RFQs', 20, {
      department: 'Purchasing',
      docTypes: ['quote_pack'],
    }),
    row('folder-com-02-outbound', 'folder-com-02-quotes', 'Outbound quotes', 21),
    row('folder-com-02-inbound', 'folder-com-02-quotes', 'Inbound RFQs', 22),
    row('folder-com-03-purchasing', 'folder-commercial', '03 — Purchasing', 30, {
      department: 'Purchasing',
      docTypes: ['purchase_order'],
    }),
    row('folder-com-03-pos', 'folder-com-03-purchasing', 'Purchase orders', 31),
    row('folder-com-03-suppliers', 'folder-com-03-purchasing', 'Supplier agreements', 32),
    row('folder-com-04-contracts', 'folder-commercial', '04 — Commercial contracts', 40, {
      docTypes: ['commercial_contract'],
    }),
    row('folder-com-05-customers', 'folder-commercial', '05 — Customer packs', 50),
    row('folder-com-05-specs', 'folder-com-05-customers', 'Customer specs & CSRs', 51),
    row('folder-com-05-pricing', 'folder-com-05-customers', 'Pricing & rate cards', 52),
  ]
}

/** Seed folder tree for Cost rates (exports / supporting docs). */
export function seedCostRatesFolders() {
  const space = COST_RATES_SPACE
  const row = (id, parentId, name, sort, extra = {}) => makeFolderRow(space, id, parentId, name, sort, extra)

  return [
    row('folder-cost-rates', '', 'Cost rates', 0),
    row('folder-cost-materials', 'folder-cost-rates', '01 — Material price lists', 10),
    row('folder-cost-energy', 'folder-cost-rates', '02 — Energy tariffs', 20),
    row('folder-cost-personnel', 'folder-cost-rates', '03 — Personnel rates', 30),
    row('folder-cost-exports', 'folder-cost-rates', '04 — Calculator exports', 40),
  ]
}

/** All system seed folders across spaces. */
export function seedAllCompanyFolders() {
  return [
    ...seedPlantQmsFolders(),
    ...seedHrPeopleFolders(),
    ...seedCommercialFolders(),
    ...seedCostRatesFolders(),
  ]
}

export function spaceRootFolderId(space = PLANT_QMS_SPACE) {
  return SPACE_ROOT_FOLDER_IDS[space] || SPACE_ROOT_FOLDER_IDS[PLANT_QMS_SPACE]
}

/** Default folder when creating a document from type + department. */
export const DOC_TYPE_FOLDER_HINTS = {
  procedure: 'folder-01-procedures',
  work_instruction: 'folder-03-wi',
  pfmea: 'folder-02-fmea',
  control_plan: 'folder-03-cp',
  ppap: 'folder-02-ppap',
  form: 'folder-01-forms',
  change_request: 'folder-01-forms',
  dhf_record: 'folder-08-dhf',
  dmr_record: 'folder-08-dmr',
  risk_file: 'folder-08-risk',
  validation_protocol: 'folder-09-validation',
  regulatory_submission: 'folder-09-submissions',
  hr_policy: 'folder-hr-01-policies',
  employment_contract: 'folder-hr-02-contracts',
  job_description: 'folder-hr-03-roles',
  training_record: 'folder-hr-04-training',
  performance_record: 'folder-hr-05-performance',
  disciplinary_record: 'folder-hr-07-disciplinary',
  safety_doc: 'folder-hr-01-hse',
  project_binder: 'folder-com-01-projects',
  quote_pack: 'folder-com-02-quotes',
  purchase_order: 'folder-com-03-pos',
  commercial_contract: 'folder-com-04-contracts',
}

export const DEPARTMENT_FOLDER_HINTS = {
  Quality: 'folder-04-quality',
  Engineering: 'folder-02-eng',
  Production: 'folder-03-prod',
  Purchasing: 'folder-05-purch',
  Logistics: 'folder-05-material',
  HR: 'folder-hr-people',
}

/** Optional related module links shown on each space. */
export function spaceRelatedLink(spaceId) {
  return COMPANY_DATABASE_SPACES.find((row) => row.id === spaceId) || null
}
