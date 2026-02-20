/**
 * Template Store — Company-scoped document templates with manager approval.
 *
 * Visibility rules (WITHIN the same company — data is already tenant-isolated):
 *   - user:       sees own drafts/pending + all approved templates
 *   - manager:    sees all company templates; can approve/reject pending ones
 *   - admin:      sees all company templates; can approve/reject
 *   - superadmin: sees everything
 *
 * Workflow:  draft → pending_approval → approved | rejected
 *   1. Any user creates a template → status = 'draft'
 *   2. Creator submits for approval → status = 'pending_approval'
 *   3. Manager (or admin) approves → 'approved'  OR  rejects → 'rejected'
 *   4. Rejected templates can be edited and re-submitted.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, getUserRole, getCompanyName, getTenantId } from '../utils/tenantStorage'

const uid = () => `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const STATUS_LABELS = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
}

const INITIAL_TEMPLATES = [
  { id: 'tpl-001', name: 'Purchase Requisition (PR)', category: 'Procurement', description: 'Standard purchase requisition form with multi-level approval chain fields.', format: 'DOCX', pages: 2, downloads: 342, rating: 4.8, tags: ['requisition', 'approval', 'procurement'], icon: '📋', featured: true, files: [{ id: 'f1', name: 'PR_Template_v3.docx', size: 245760, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, { id: 'f2', name: 'PR_Instructions.pdf', size: 189440, type: 'application/pdf' }], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-002', name: 'Purchase Order (PO)', category: 'Procurement', description: 'Professional PO template with line items, payment terms, and delivery instructions.', format: 'DOCX', pages: 3, downloads: 567, rating: 4.9, tags: ['po', 'order', 'vendor'], icon: '📦', featured: true, files: [{ id: 'f3', name: 'PO_Template_Standard.docx', size: 312320, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-003', name: 'Request for Quotation (RFQ)', category: 'Procurement', description: 'RFQ template with technical specs, evaluation criteria, and response format.', format: 'DOCX', pages: 4, downloads: 289, rating: 4.7, tags: ['rfq', 'quotation', 'sourcing'], icon: '📨', featured: true, files: [{ id: 'f4', name: 'RFQ_Template_v2.docx', size: 287744, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-004', name: 'Supplier Evaluation Scorecard', category: 'Procurement', description: '8-criteria supplier evaluation with weighted scoring and trend analysis.', format: 'XLSX', pages: 1, downloads: 198, rating: 4.6, tags: ['evaluation', 'scorecard', 'vendor'], icon: '📊', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-005', name: 'Vendor Comparison Matrix', category: 'Procurement', description: 'Side-by-side vendor comparison with pricing, quality, delivery, and capability analysis.', format: 'XLSX', pages: 1, downloads: 156, rating: 4.5, tags: ['comparison', 'vendor', 'analysis'], icon: '⚖️', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-040', name: 'Sourcing Strategy Plan', category: 'Procurement', description: 'Category sourcing strategy with market analysis, risk assessment, and action roadmap.', format: 'PPTX', pages: 8, downloads: 123, rating: 4.5, tags: ['sourcing', 'strategy', 'category'], icon: '🎯', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-041', name: 'Supplier Onboarding Checklist', category: 'Procurement', description: 'Step-by-step onboarding checklist covering documents, certifications, and system setup.', format: 'XLSX', pages: 2, downloads: 211, rating: 4.6, tags: ['onboarding', 'supplier', 'checklist'], icon: '✓', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-042', name: 'Goods Receipt Note (GRN)', category: 'Procurement', description: 'Inbound delivery receipt form with quantity checks, damage reporting, and sign-off.', format: 'DOCX', pages: 1, downloads: 178, rating: 4.4, tags: ['receipt', 'delivery', 'warehouse'], icon: '📥', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-043', name: 'Procurement KPI Dashboard', category: 'Procurement', description: 'Monthly procurement KPI tracker — lead time, savings, PO cycle time, supplier OTD.', format: 'XLSX', pages: 3, downloads: 145, rating: 4.7, tags: ['kpi', 'dashboard', 'metrics'], icon: '📈', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },

  { id: 'tpl-006', name: 'Master Supply Agreement (MSA)', category: 'Contracts', description: 'Comprehensive supply agreement covering terms, warranties, IP, and liability.', format: 'DOCX', pages: 12, downloads: 423, rating: 4.9, tags: ['contract', 'supply', 'legal'], icon: '📜', featured: true, files: [{ id: 'f5', name: 'MSA_Template_2025.docx', size: 524288, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, { id: 'f6', name: 'MSA_Appendix_A.pdf', size: 156672, type: 'application/pdf' }], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-007', name: 'Non-Disclosure Agreement (NDA)', category: 'Contracts', description: 'Mutual NDA for protecting confidential information in business relationships.', format: 'DOCX', pages: 4, downloads: 678, rating: 4.8, tags: ['nda', 'confidentiality', 'legal'], icon: '🔒', featured: false, files: [{ id: 'f7', name: 'NDA_Mutual_Template.docx', size: 198656, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-008', name: 'Service Level Agreement (SLA)', category: 'Contracts', description: 'SLA template with KPIs, response times, penalties, and escalation procedures.', format: 'DOCX', pages: 6, downloads: 234, rating: 4.7, tags: ['sla', 'service', 'performance'], icon: '⏱️', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-009', name: 'Framework Agreement', category: 'Contracts', description: 'Long-term framework contract with volume discounts and quarterly review clauses.', format: 'DOCX', pages: 8, downloads: 145, rating: 4.6, tags: ['framework', 'blanket', 'contract'], icon: '📑', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-044', name: 'Consulting Agreement', category: 'Contracts', description: 'Professional services agreement with scope, deliverables, IP assignment, and payment milestones.', format: 'DOCX', pages: 6, downloads: 189, rating: 4.6, tags: ['consulting', 'services', 'legal'], icon: '💼', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-045', name: 'Amendment & Change Order', category: 'Contracts', description: 'Contract amendment form for scope changes, pricing adjustments, and timeline extensions.', format: 'DOCX', pages: 2, downloads: 167, rating: 4.5, tags: ['amendment', 'change', 'contract'], icon: '📝', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-046', name: 'Subcontractor Agreement', category: 'Contracts', description: 'Subcontractor terms covering work scope, insurance, indemnification, and flow-down clauses.', format: 'DOCX', pages: 7, downloads: 98, rating: 4.4, tags: ['subcontractor', 'outsource', 'legal'], icon: '🤝', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },

  { id: 'tpl-010', name: 'ISO 9001 Audit Checklist', category: 'Quality', description: 'Complete ISO 9001:2015 audit checklist with all clauses and evidence requirements.', format: 'XLSX', pages: 5, downloads: 312, rating: 4.8, tags: ['iso9001', 'audit', 'quality'], icon: '✅', featured: true, files: [{ id: 'f8', name: 'ISO9001_Checklist_Full.xlsx', size: 415744, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-011', name: 'IATF 16949 Process Audit', category: 'Quality', description: 'Automotive quality audit template per IATF 16949 requirements.', format: 'XLSX', pages: 8, downloads: 189, rating: 4.7, tags: ['iatf', 'automotive', 'audit'], icon: '🔍', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-012', name: '8D Problem Solving Report', category: 'Quality', description: 'Eight disciplines problem solving report for corrective actions.', format: 'DOCX', pages: 3, downloads: 267, rating: 4.6, tags: ['8d', 'corrective', 'problem'], icon: '🔧', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-013', name: 'VDA 6.3 Process Audit', category: 'Quality', description: 'German automotive process audit per VDA 6.3 standard.', format: 'XLSX', pages: 6, downloads: 134, rating: 4.5, tags: ['vda', 'process', 'audit'], icon: '🏭', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-047', name: 'FMEA Worksheet', category: 'Quality', description: 'Failure Mode & Effects Analysis worksheet with severity, occurrence, and detection scoring.', format: 'XLSX', pages: 2, downloads: 245, rating: 4.7, tags: ['fmea', 'risk', 'failure'], icon: '⚠️', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-048', name: 'Control Plan Template', category: 'Quality', description: 'Production control plan per IATF with process parameters, specs, and reaction plan.', format: 'XLSX', pages: 3, downloads: 178, rating: 4.6, tags: ['control', 'plan', 'production'], icon: '🎛️', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-049', name: 'First Article Inspection (FAIR)', category: 'Quality', description: 'AS9102 first article inspection report with dimensional, material, and functional checks.', format: 'XLSX', pages: 4, downloads: 156, rating: 4.5, tags: ['fair', 'inspection', 'first-article'], icon: '🔬', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-050', name: 'Incoming Quality Inspection', category: 'Quality', description: 'Goods inward quality check form with AQL sampling, measurement records, and disposition.', format: 'XLSX', pages: 2, downloads: 201, rating: 4.6, tags: ['iqc', 'inspection', 'incoming'], icon: '📋', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },

  { id: 'tpl-014', name: 'ESG Compliance Checklist', category: 'Compliance', description: 'Environmental, Social & Governance checklist covering EU CSRD requirements.', format: 'XLSX', pages: 4, downloads: 198, rating: 4.7, tags: ['esg', 'sustainability', 'compliance'], icon: '🌱', featured: true, files: [{ id: 'f9', name: 'ESG_Checklist_EU_CSRD.xlsx', size: 312320, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-015', name: 'GDPR Data Processing Agreement', category: 'Compliance', description: 'DPA template for GDPR compliance with data processors and sub-processors.', format: 'DOCX', pages: 6, downloads: 345, rating: 4.8, tags: ['gdpr', 'privacy', 'data'], icon: '🛡️', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-016', name: 'Supplier Code of Conduct', category: 'Compliance', description: 'Code of conduct for suppliers covering ethics, labor, environment, and anti-corruption.', format: 'DOCX', pages: 5, downloads: 256, rating: 4.6, tags: ['code', 'conduct', 'ethics'], icon: '⚖️', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-017', name: 'Supply Chain Due Diligence (LkSG)', category: 'Compliance', description: 'German Supply Chain Act compliance template with risk analysis framework.', format: 'DOCX', pages: 7, downloads: 112, rating: 4.5, tags: ['lksg', 'supply chain', 'due diligence'], icon: '🔗', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-051', name: 'Anti-Bribery & Corruption Policy', category: 'Compliance', description: 'ABC policy template with gift limits, due diligence, and whistleblower procedures.', format: 'DOCX', pages: 5, downloads: 134, rating: 4.5, tags: ['abc', 'bribery', 'corruption'], icon: '🚫', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-052', name: 'ISO 14001 Environmental Checklist', category: 'Compliance', description: 'Environmental management system audit checklist per ISO 14001:2015.', format: 'XLSX', pages: 4, downloads: 167, rating: 4.6, tags: ['iso14001', 'environment', 'ems'], icon: '🌍', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-053', name: 'CBAM Carbon Reporting Template', category: 'Compliance', description: 'EU Carbon Border Adjustment Mechanism reporting with emissions calculations.', format: 'XLSX', pages: 3, downloads: 89, rating: 4.3, tags: ['cbam', 'carbon', 'emissions'], icon: '♻️', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },

  { id: 'tpl-018', name: 'Employment Contract', category: 'HR', description: 'Standard employment contract with confidentiality and non-compete clauses.', format: 'DOCX', pages: 5, downloads: 489, rating: 4.7, tags: ['employment', 'contract', 'hr'], icon: '👤', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-019', name: 'Performance Review Form', category: 'HR', description: 'Annual performance review with goal tracking and competency assessment.', format: 'DOCX', pages: 3, downloads: 378, rating: 4.6, tags: ['review', 'performance', 'goals'], icon: '📈', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-054', name: 'Job Description Template', category: 'HR', description: 'Structured job description with responsibilities, qualifications, and competency matrix.', format: 'DOCX', pages: 2, downloads: 312, rating: 4.5, tags: ['job', 'description', 'recruitment'], icon: '📄', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-055', name: 'Onboarding Plan Checklist', category: 'HR', description: '90-day onboarding plan with tasks, training schedule, and milestone reviews.', format: 'XLSX', pages: 2, downloads: 234, rating: 4.6, tags: ['onboarding', 'plan', 'checklist'], icon: '🚀', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-056', name: 'Travel & Expense Policy', category: 'HR', description: 'Company travel policy with per-diem rates, booking rules, and reimbursement procedure.', format: 'DOCX', pages: 4, downloads: 178, rating: 4.4, tags: ['travel', 'expense', 'policy'], icon: '✈️', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-057', name: 'Training Record Matrix', category: 'HR', description: 'Employee training tracker with skill matrix, certification expiry, and gap analysis.', format: 'XLSX', pages: 2, downloads: 198, rating: 4.5, tags: ['training', 'skills', 'matrix'], icon: '🎓', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },

  { id: 'tpl-020', name: 'Invoice Template', category: 'Finance', description: 'Professional invoice with tax calculation, payment terms, and bank details.', format: 'XLSX', pages: 1, downloads: 567, rating: 4.8, tags: ['invoice', 'billing', 'payment'], icon: '🧾', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-021', name: 'Budget Planning Worksheet', category: 'Finance', description: 'Annual budget template with departmental breakdown and variance tracking.', format: 'XLSX', pages: 3, downloads: 234, rating: 4.6, tags: ['budget', 'planning', 'forecast'], icon: '💰', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-058', name: 'Cost Breakdown Structure', category: 'Finance', description: 'Product cost breakdown with material, labor, overhead, and margin calculation.', format: 'XLSX', pages: 2, downloads: 189, rating: 4.7, tags: ['cost', 'breakdown', 'pricing'], icon: '💹', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-059', name: 'Purchase Price Variance Report', category: 'Finance', description: 'PPV analysis comparing negotiated vs actual prices with savings tracking.', format: 'XLSX', pages: 2, downloads: 145, rating: 4.5, tags: ['ppv', 'variance', 'savings'], icon: '📉', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-060', name: 'Credit Note Template', category: 'Finance', description: 'Credit note for returns, pricing adjustments, and quality claim settlements.', format: 'XLSX', pages: 1, downloads: 167, rating: 4.4, tags: ['credit', 'returns', 'refund'], icon: '💳', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-061', name: 'Cash Flow Forecast', category: 'Finance', description: '12-month cash flow projection with inflows, outflows, and working capital analysis.', format: 'XLSX', pages: 3, downloads: 134, rating: 4.6, tags: ['cashflow', 'forecast', 'liquidity'], icon: '🏦', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },

  { id: 'tpl-022', name: 'Spend Analysis Report', category: 'Reports', description: 'Procurement spend analysis report with charts, vendor breakdown, and trends.', format: 'PPTX', pages: 10, downloads: 167, rating: 4.5, tags: ['spend', 'analysis', 'report'], icon: '📊', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-023', name: 'Supplier Audit Report', category: 'Reports', description: 'Post-audit report template with findings, scores, and corrective actions.', format: 'DOCX', pages: 6, downloads: 198, rating: 4.7, tags: ['audit', 'supplier', 'report'], icon: '📝', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-062', name: 'Monthly Procurement Report', category: 'Reports', description: 'Executive summary with PO volume, savings, lead times, and supplier performance.', format: 'PPTX', pages: 12, downloads: 213, rating: 4.6, tags: ['monthly', 'procurement', 'executive'], icon: '📰', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-063', name: 'Vendor Risk Assessment Report', category: 'Reports', description: 'Risk profile report covering financial stability, geopolitical, and operational risks.', format: 'DOCX', pages: 5, downloads: 145, rating: 4.5, tags: ['risk', 'vendor', 'assessment'], icon: '🎯', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-064', name: 'Contract Expiry & Renewal Report', category: 'Reports', description: 'Dashboard report of upcoming contract expirations, renewal recommendations, and savings.', format: 'XLSX', pages: 3, downloads: 112, rating: 4.4, tags: ['contract', 'expiry', 'renewal'], icon: '🗓️', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
  { id: 'tpl-065', name: 'Quality KPI Scorecard', category: 'Reports', description: 'Quality metrics report — PPM, COPQ, scrap rate, customer claims, and audit scores.', format: 'PPTX', pages: 8, downloads: 178, rating: 4.6, tags: ['quality', 'kpi', 'scorecard'], icon: '🏆', featured: false, files: [], status: 'approved', _createdBy: 'system', _createdByName: 'STREFEX', _createdByRole: 'admin', _companyId: '', _createdAt: '2025-06-01T00:00:00Z', _approvedBy: 'system', _approvedAt: '2025-06-01T00:00:00Z', _rejectionNote: '' },
]

export { STATUS_LABELS }

export const useTemplateStore = create(
  persist(
    (set, get) => ({
      templates: INITIAL_TEMPLATES,

      canEditTemplate: () => {
        const r = getUserRole()
        return r !== 'auditor_internal' && r !== 'auditor_external' && r !== 'guest'
      },
      isReadOnly: () => {
        const r = getUserRole()
        return r === 'auditor_internal' || r === 'auditor_external'
      },

      /**
       * Get templates visible to the current user:
       *   - superadmin/admin/auditors: all templates
       *   - manager: all company templates (can also approve)
       *   - user: own drafts/pending/rejected + all approved
       */
      getVisibleTemplates: () => {
        const role = getUserRole()
        const userId = getUserId()
        const all = get().templates

        if (role === 'superadmin' || role === 'auditor_external' || role === 'admin' || role === 'auditor_internal' || role === 'manager') return all

        return all.filter((t) => {
          if (t.status === 'approved') return true
          if (t._createdBy === 'system') return true
          return (t._createdBy || '').toLowerCase() === userId
        })
      },

      /** Templates pending manager approval (for approval queue). */
      getPendingApproval: () => {
        return get().templates.filter((t) => t.status === 'pending_approval')
      },

      addTemplate: (data) => {
        const userId = getUserId()
        const role = getUserRole()
        const companyName = getCompanyName()
        const companyId = getTenantId()
        const now = new Date().toISOString()

        const tpl = {
          ...data,
          id: data.id || uid(),
          status: 'draft',
          _createdBy: userId,
          _createdByName: companyName,
          _createdByRole: role,
          _companyId: companyId,
          _createdAt: now,
          _approvedBy: '',
          _approvedAt: '',
          _rejectionNote: '',
        }
        set((s) => ({ templates: [tpl, ...s.templates] }))
        return tpl
      },

      updateTemplate: (id, data) => {
        set((s) => ({
          templates: s.templates.map((t) => t.id === id ? { ...t, ...data } : t),
        }))
      },

      deleteTemplate: (id) => {
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }))
      },

      submitForApproval: (id) => {
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, status: 'pending_approval', _rejectionNote: '' } : t
          ),
        }))
      },

      approveTemplate: (id) => {
        const userId = getUserId()
        const now = new Date().toISOString()
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id
              ? { ...t, status: 'approved', _approvedBy: userId, _approvedAt: now, _rejectionNote: '' }
              : t
          ),
        }))
      },

      rejectTemplate: (id, note) => {
        const userId = getUserId()
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id
              ? { ...t, status: 'rejected', _approvedBy: '', _approvedAt: '', _rejectionNote: note || 'Rejected by manager' }
              : t
          ),
        }))
      },

      toggleFeatured: (id) => {
        set((s) => ({
          templates: s.templates.map((t) => t.id === id ? { ...t, featured: !t.featured } : t),
        }))
      },

      incrementDownloads: (id) => {
        set((s) => ({
          templates: s.templates.map((t) => t.id === id ? { ...t, downloads: t.downloads + 1 } : t),
        }))
      },
    }),
    {
      name: 'strefex-templates',
      storage: createTenantStorage(),
      partialize: (state) => ({ templates: state.templates }),
    }
  )
)
