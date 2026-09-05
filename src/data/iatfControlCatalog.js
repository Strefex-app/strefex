/** IATF-oriented plant masters — document control, part/process, lots, certificates. */

export const IATF_CONTROL_PATH = '/management/ops/iatf-control'

export const IATF_DOC_TYPES = [
  { id: 'procedure', label: 'QMS procedure' },
  { id: 'work_instruction', label: 'Work instruction' },
  { id: 'pfmea', label: 'PFMEA' },
  { id: 'control_plan', label: 'Control plan' },
  { id: 'ppap', label: 'PPAP / PSW pack' },
  { id: 'form', label: 'Form / record' },
  { id: 'change_request', label: 'Change request' },
  { id: 'dhf_record', label: 'Design history (DHF)' },
  { id: 'dmr_record', label: 'Device master record (DMR)' },
  { id: 'risk_file', label: 'Risk management file' },
  { id: 'validation_protocol', label: 'Validation protocol' },
  { id: 'regulatory_submission', label: 'Regulatory submission' },
  { id: 'hr_policy', label: 'HR policy' },
  { id: 'employment_contract', label: 'Employment contract' },
  { id: 'job_description', label: 'Job description' },
  { id: 'training_record', label: 'Training record' },
  { id: 'performance_record', label: 'Performance record' },
  { id: 'disciplinary_record', label: 'Disciplinary record' },
  { id: 'safety_doc', label: 'Safety / HSE document' },
  { id: 'project_binder', label: 'Project binder' },
  { id: 'quote_pack', label: 'Quote / RFQ pack' },
  { id: 'purchase_order', label: 'Purchase order' },
  { id: 'commercial_contract', label: 'Commercial contract' },
]

export const PLANT_DOC_TYPE_IDS = [
  'procedure', 'work_instruction', 'pfmea', 'control_plan', 'ppap', 'form', 'change_request',
  'dhf_record', 'dmr_record', 'risk_file', 'validation_protocol', 'regulatory_submission',
]

export const HR_DOC_TYPE_IDS = [
  'hr_policy', 'employment_contract', 'job_description', 'training_record',
  'performance_record', 'disciplinary_record', 'safety_doc', 'form',
]

export const COMMERCIAL_DOC_TYPE_IDS = [
  'project_binder', 'quote_pack', 'purchase_order', 'commercial_contract', 'form',
]

export const IATF_DOC_STATUSES = [
  { id: 'draft', label: 'Draft' },
  { id: 'in_review', label: 'In review' },
  { id: 'approved', label: 'Approved' },
  { id: 'obsolete', label: 'Obsolete' },
]

export const IATF_DOC_DEPARTMENTS = [
  'Quality',
  'Engineering',
  'Production',
  'Purchasing',
  'HR',
  'Logistics',
]

export const IATF_LOT_KINDS = [
  { id: 'incoming', label: 'Incoming material' },
  { id: 'wip', label: 'WIP' },
  { id: 'finished', label: 'Finished' },
  { id: 'shipped', label: 'Shipped' },
]

export const IATF_LOT_STATUSES = [
  { id: 'open', label: 'Open' },
  { id: 'released', label: 'Released' },
  { id: 'hold', label: 'Hold / contained' },
  { id: 'scrapped', label: 'Scrapped' },
  { id: 'shipped', label: 'Shipped' },
]

export const IATF_CERT_STANDARDS = [
  { id: 'iatf_16949', label: 'IATF 16949' },
  { id: 'iso_9001', label: 'ISO 9001' },
  { id: 'iso_13485', label: 'ISO 13485' },
  { id: 'fda', label: 'FDA registered' },
  { id: 'ce_mark', label: 'CE / MDR' },
  { id: 'iso_14001', label: 'ISO 14001' },
  { id: 'iso_45001', label: 'ISO 45001' },
  { id: 'iso_19443', label: 'ISO 19443' },
  { id: 'api_q1', label: 'API Q1' },
]

export const IATF_PPAP_LEVELS = ['1', '2', '3', '4', '5']

export const IATF_PPAP_STATUSES = [
  { id: 'none', label: 'Not started' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'approved', label: 'Customer approved' },
]

/** AIAG PPAP 4th ed. 18 elements — live pack, not the encyclopedia table. */
export const IATF_PPAP_ELEMENTS = [
  { id: 'design_records', n: 1, label: 'Design records', level3: true },
  { id: 'engineering_change', n: 2, label: 'Engineering change documents', level3: true },
  { id: 'customer_eng_approval', n: 3, label: 'Customer engineering approval', level3: true },
  { id: 'dfmea', n: 4, label: 'Design FMEA', level3: true },
  { id: 'process_flow', n: 5, label: 'Process flow diagram', level3: true },
  { id: 'pfmea', n: 6, label: 'Process FMEA', level3: true },
  { id: 'control_plan', n: 7, label: 'Control plan', level3: true },
  { id: 'msa', n: 8, label: 'MSA studies', level3: true },
  { id: 'dimensional', n: 9, label: 'Dimensional results', level3: true },
  { id: 'material_tests', n: 10, label: 'Material / performance tests', level3: true },
  { id: 'initial_studies', n: 11, label: 'Initial process studies', level3: true },
  { id: 'qualified_lab', n: 12, label: 'Qualified laboratory documentation', level3: true },
  { id: 'aar', n: 13, label: 'Appearance approval report', level3: false },
  { id: 'sample_parts', n: 14, label: 'Sample production parts', level3: true },
  { id: 'master_sample', n: 15, label: 'Master sample', level3: true },
  { id: 'checking_aids', n: 16, label: 'Checking aids', level3: true },
  { id: 'csr', n: 17, label: 'Customer-specific requirements', level3: true },
  { id: 'psw', n: 18, label: 'Part Submission Warrant (PSW)', level3: true },
]

export const IATF_PPAP_ELEMENT_STATES = [
  { id: 'missing', label: 'Missing' },
  { id: 'attached', label: 'On file' },
  { id: 'na', label: 'N/A' },
]

export const IATF_CHANGE_STATUSES = [
  { id: 'draft', label: 'Draft' },
  { id: 'approved', label: 'Approved' },
  { id: 'closed', label: 'Closed' },
]

export const IATF_CHANGE_IMPACTS = [
  { id: 'pfmea', label: 'PFMEA' },
  { id: 'controlPlan', label: 'Control plan' },
  { id: 'workInstruction', label: 'Work instruction' },
  { id: 'ppap', label: 'PPAP / PSW' },
]

export const IATF_GAUGE_STATUSES = [
  { id: 'ok', label: 'In calibration' },
  { id: 'due', label: 'Due' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'out_of_service', label: 'Out of service' },
]

export function blankPpapElements() {
  return Object.fromEntries(IATF_PPAP_ELEMENTS.map((el) => [el.id, el.level3 ? 'missing' : 'na']))
}

export function ppapPackProgress(elements = {}, level = '3') {
  const required = IATF_PPAP_ELEMENTS.filter((el) => (String(level) === '3' ? el.level3 : true))
  const done = required.filter((el) => {
    const state = elements[el.id]
    return state === 'attached' || state === 'na'
  }).length
  const total = required.length || 1
  return { done, total, pct: Math.round((done / total) * 100) }
}

export const IATF_CORE_TOOL_MAP = {
  APQP: ['t29-apqp'],
  PPAP: ['t29-apqp'],
  FMEA: ['t10-fmea'],
  MSA: ['t8-gage-rr'],
  SPC: ['t7-spc', 't9-cpk-ppk'],
}

export const DEFAULT_RELIABILITY_SHARE = {
  shareCert: true,
  shareProcesses: true,
  shareTraceMethod: true,
  shareCapability: true,
  sharePpap: true,
}

export function labelOf(list, id) {
  return list.find((row) => row.id === id)?.label || id || '—'
}
