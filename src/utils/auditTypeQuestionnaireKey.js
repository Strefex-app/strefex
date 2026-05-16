/**
 * Maps Auditors Hub `auditType` ids to keys in `productionStore.auditQuestionnaires`.
 */
export const AUDIT_TYPE_TO_QUESTIONNAIRE_KEY = {
  production_audit: 'Product/Process',
  product_process_audit: 'Product/Process',
  iatf_16949: 'IATF 16949',
  five_s: '5S',
  iso_9001: 'ISO 9001',
  layered_audit: 'Layered Process',
  environmental_compliance: 'ISO 9001',
  supplier_qualification: 'Supplier',
  other: 'Supplier',
}

export function getQuestionnaireKeyForAuditType(auditTypeId) {
  return AUDIT_TYPE_TO_QUESTIONNAIRE_KEY[auditTypeId] || 'Supplier'
}
