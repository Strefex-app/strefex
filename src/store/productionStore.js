import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserRole } from '../utils/tenantStorage'
import { canEdit as guardCanEdit, isAuditor } from '../utils/companyGuard'

const useProductionStore = create(
  persist(
    (set, get) => ({
      // 5S Audit Data
      fiveSAudits: [
        {
          id: 'fs-001',
          area: 'Assembly Line A',
          date: '2026-01-28',
          auditor: 'John Smith',
          scores: {
            sort: 4,
            setInOrder: 3,
            shine: 4,
            standardize: 3,
            sustain: 3,
          },
          totalScore: 17,
          maxScore: 25,
          findings: ['Unmarked storage areas', 'Missing cleaning schedule'],
          actions: ['Label all storage locations', 'Create weekly cleaning checklist'],
          status: 'in_progress',
        },
        {
          id: 'fs-002',
          area: 'Machining Center',
          date: '2026-01-25',
          auditor: 'Maria Garcia',
          scores: {
            sort: 5,
            setInOrder: 4,
            shine: 5,
            standardize: 4,
            sustain: 4,
          },
          totalScore: 22,
          maxScore: 25,
          findings: ['Minor tool organization issues'],
          actions: ['Implement shadow boards'],
          status: 'completed',
        },
      ],

      // ISO 9001 Compliance
      iso9001: {
        certificationDate: '2024-03-15',
        expiryDate: '2027-03-14',
        certifyingBody: 'TÜV SÜD',
        status: 'certified',
        lastAuditDate: '2025-09-20',
        nextAuditDate: '2026-09-20',
        clauses: [
          { id: 'iso-4', clause: '4. Context of the Organization', status: 'compliant', score: 95 },
          { id: 'iso-5', clause: '5. Leadership', status: 'compliant', score: 92 },
          { id: 'iso-6', clause: '6. Planning', status: 'compliant', score: 88 },
          { id: 'iso-7', clause: '7. Support', status: 'compliant', score: 90 },
          { id: 'iso-8', clause: '8. Operation', status: 'compliant', score: 94 },
          { id: 'iso-9', clause: '9. Performance Evaluation', status: 'minor_nc', score: 82 },
          { id: 'iso-10', clause: '10. Improvement', status: 'compliant', score: 87 },
        ],
        nonConformities: [
          { id: 'nc-001', clause: '9.1.3', description: 'Internal audit schedule not followed', severity: 'minor', status: 'closed', dueDate: '2025-11-15' },
          { id: 'nc-002', clause: '9.2', description: 'Customer satisfaction survey delayed', severity: 'minor', status: 'open', dueDate: '2026-02-28' },
        ],
      },

      // IATF 16949 Compliance
      iatf16949: {
        certificationDate: '2024-06-01',
        expiryDate: '2027-05-31',
        certifyingBody: 'DNV GL',
        status: 'certified',
        lastAuditDate: '2025-12-10',
        nextAuditDate: '2026-06-10',
        coreTools: [
          { id: 'ct-1', name: 'APQP', status: 'implemented', maturity: 85 },
          { id: 'ct-2', name: 'PPAP', status: 'implemented', maturity: 90 },
          { id: 'ct-3', name: 'FMEA', status: 'implemented', maturity: 88 },
          { id: 'ct-4', name: 'MSA', status: 'implemented', maturity: 82 },
          { id: 'ct-5', name: 'SPC', status: 'implemented', maturity: 78 },
        ],
        customerSpecificRequirements: [
          { customer: 'BMW', requirements: 12, compliant: 11, status: 'minor_gap' },
          { customer: 'Mercedes', requirements: 15, compliant: 15, status: 'compliant' },
          { customer: 'VW Group', requirements: 18, compliant: 17, status: 'minor_gap' },
        ],
      },

      // Certification History with Documents
      certificationHistory: {
        iso9001: [
          {
            id: 'iso-hist-001',
            type: 'initial_certification',
            date: '2024-03-15',
            auditor: 'TÜV SÜD',
            result: 'passed',
            score: 92,
            findings: 2,
            notes: 'Initial certification audit completed successfully',
            documents: [
              { id: 'doc-iso-001', name: 'ISO 9001 Certificate', type: 'certificate', format: 'pdf', uploadDate: '2024-03-20', size: '245 KB' },
              { id: 'doc-iso-002', name: 'Stage 1 Audit Report', type: 'audit_report', format: 'pdf', uploadDate: '2024-02-10', size: '1.2 MB' },
              { id: 'doc-iso-003', name: 'Stage 2 Audit Report', type: 'audit_report', format: 'pdf', uploadDate: '2024-03-18', size: '2.1 MB' },
              { id: 'doc-iso-004', name: 'Corrective Action Plan', type: 'action_plan', format: 'xlsx', uploadDate: '2024-03-25', size: '156 KB' },
            ],
          },
          {
            id: 'iso-hist-002',
            type: 'surveillance_audit',
            date: '2025-03-20',
            auditor: 'TÜV SÜD',
            result: 'passed',
            score: 89,
            findings: 3,
            notes: 'First surveillance audit - minor findings addressed',
            documents: [
              { id: 'doc-iso-005', name: 'Surveillance Audit Report 2025', type: 'audit_report', format: 'pdf', uploadDate: '2025-03-25', size: '1.8 MB' },
              { id: 'doc-iso-006', name: 'Findings Response', type: 'action_plan', format: 'pdf', uploadDate: '2025-04-10', size: '320 KB' },
            ],
          },
          {
            id: 'iso-hist-003',
            type: 'surveillance_audit',
            date: '2025-09-20',
            auditor: 'TÜV SÜD',
            result: 'passed',
            score: 91,
            findings: 1,
            notes: 'Second surveillance audit - continuous improvement noted',
            documents: [
              { id: 'doc-iso-007', name: 'Surveillance Audit Report Sep 2025', type: 'audit_report', format: 'pdf', uploadDate: '2025-09-25', size: '1.5 MB' },
              { id: 'doc-iso-008', name: 'Management Review Minutes', type: 'meeting_minutes', format: 'pdf', uploadDate: '2025-09-28', size: '890 KB' },
            ],
          },
        ],
        iatf16949: [
          {
            id: 'iatf-hist-001',
            type: 'initial_certification',
            date: '2024-06-01',
            auditor: 'DNV GL',
            result: 'passed',
            score: 88,
            findings: 4,
            notes: 'Initial IATF 16949 certification achieved',
            documents: [
              { id: 'doc-iatf-001', name: 'IATF 16949 Certificate', type: 'certificate', format: 'pdf', uploadDate: '2024-06-05', size: '312 KB' },
              { id: 'doc-iatf-002', name: 'Stage 1 Audit Report', type: 'audit_report', format: 'pdf', uploadDate: '2024-04-20', size: '2.4 MB' },
              { id: 'doc-iatf-003', name: 'Stage 2 Audit Report', type: 'audit_report', format: 'pdf', uploadDate: '2024-06-03', size: '3.2 MB' },
              { id: 'doc-iatf-004', name: 'APQP Evidence Package', type: 'evidence', format: 'zip', uploadDate: '2024-05-15', size: '15.4 MB' },
              { id: 'doc-iatf-005', name: 'Core Tools Assessment', type: 'assessment', format: 'pdf', uploadDate: '2024-05-20', size: '1.1 MB' },
            ],
          },
          {
            id: 'iatf-hist-002',
            type: 'surveillance_audit',
            date: '2024-12-10',
            auditor: 'DNV GL',
            result: 'passed',
            score: 85,
            findings: 5,
            notes: 'First surveillance - focus on SPC implementation',
            documents: [
              { id: 'doc-iatf-006', name: 'Surveillance Audit Report Dec 2024', type: 'audit_report', format: 'pdf', uploadDate: '2024-12-15', size: '2.8 MB' },
              { id: 'doc-iatf-007', name: 'SPC Improvement Plan', type: 'action_plan', format: 'xlsx', uploadDate: '2024-12-20', size: '245 KB' },
            ],
          },
          {
            id: 'iatf-hist-003',
            type: 'surveillance_audit',
            date: '2025-06-15',
            auditor: 'DNV GL',
            result: 'passed',
            score: 90,
            findings: 2,
            notes: 'Significant improvement in core tools maturity',
            documents: [
              { id: 'doc-iatf-008', name: 'Surveillance Audit Report Jun 2025', type: 'audit_report', format: 'pdf', uploadDate: '2025-06-20', size: '2.2 MB' },
              { id: 'doc-iatf-009', name: 'Customer Scorecard Summary', type: 'report', format: 'pdf', uploadDate: '2025-06-18', size: '560 KB' },
            ],
          },
          {
            id: 'iatf-hist-004',
            type: 'surveillance_audit',
            date: '2025-12-10',
            auditor: 'DNV GL',
            result: 'passed',
            score: 92,
            findings: 1,
            notes: 'Excellent progress - ready for recertification',
            documents: [
              { id: 'doc-iatf-010', name: 'Surveillance Audit Report Dec 2025', type: 'audit_report', format: 'pdf', uploadDate: '2025-12-15', size: '2.0 MB' },
            ],
          },
        ],
        other: [
          {
            id: 'other-hist-001',
            certName: 'ISO 14001:2015',
            type: 'initial_certification',
            date: '2025-01-15',
            auditor: 'TÜV SÜD',
            result: 'passed',
            score: 87,
            findings: 3,
            notes: 'Environmental Management System certification',
            expiryDate: '2028-01-14',
            documents: [
              { id: 'doc-other-001', name: 'ISO 14001 Certificate', type: 'certificate', format: 'pdf', uploadDate: '2025-01-20', size: '238 KB' },
              { id: 'doc-other-002', name: 'EMS Audit Report', type: 'audit_report', format: 'pdf', uploadDate: '2025-01-18', size: '1.9 MB' },
            ],
          },
        ],
      },

      // VDA 6.3 Process Audits
      vda63Audits: [
        {
          id: 'vda-001',
          processName: 'Injection Molding',
          date: '2026-01-20',
          auditor: 'External - TÜV',
          overallScore: 86,
          rating: 'B',
          elements: [
            { element: 'P2 - Project Management', score: 88 },
            { element: 'P3 - Planning Product/Process', score: 84 },
            { element: 'P4 - Realization Product/Process', score: 82 },
            { element: 'P5 - Supplier Management', score: 90 },
            { element: 'P6 - Process Analysis', score: 85 },
            { element: 'P7 - Customer Care', score: 88 },
          ],
          findings: 3,
          status: 'completed',
        },
        {
          id: 'vda-002',
          processName: 'Final Assembly',
          date: '2026-01-15',
          auditor: 'Internal',
          overallScore: 78,
          rating: 'B',
          elements: [
            { element: 'P2 - Project Management', score: 80 },
            { element: 'P3 - Planning Product/Process', score: 75 },
            { element: 'P4 - Realization Product/Process', score: 78 },
            { element: 'P5 - Supplier Management', score: 82 },
            { element: 'P6 - Process Analysis', score: 76 },
            { element: 'P7 - Customer Care', score: 80 },
          ],
          findings: 5,
          status: 'action_required',
        },
      ],

      // OEE Data
      oeeData: [
        {
          id: 'oee-001',
          equipment: 'CNC Machine 1',
          date: '2026-01-30',
          shift: 'Day',
          availability: 92,
          performance: 88,
          quality: 98,
          oee: 79.5,
          plannedTime: 480,
          actualRunTime: 442,
          idealCycleTime: 2.5,
          totalCount: 165,
          goodCount: 162,
        },
        {
          id: 'oee-002',
          equipment: 'Assembly Line A',
          date: '2026-01-30',
          shift: 'Day',
          availability: 88,
          performance: 92,
          quality: 96,
          oee: 77.7,
          plannedTime: 480,
          actualRunTime: 422,
          idealCycleTime: 1.8,
          totalCount: 220,
          goodCount: 211,
        },
        {
          id: 'oee-003',
          equipment: 'Injection Mold Press 2',
          date: '2026-01-30',
          shift: 'Day',
          availability: 95,
          performance: 90,
          quality: 99,
          oee: 84.6,
          plannedTime: 480,
          actualRunTime: 456,
          idealCycleTime: 0.5,
          totalCount: 850,
          goodCount: 842,
        },
      ],

      // Downtime Records
      downtimeRecords: [
        {
          id: 'dt-001',
          equipment: 'CNC Machine 1',
          date: '2026-01-30',
          startTime: '09:15',
          endTime: '09:45',
          duration: 30,
          category: 'Breakdown',
          reason: 'Tool breakage',
          description: 'Carbide insert fractured during roughing operation',
          corrective: 'Replaced insert, adjusted feed rate',
          operator: 'Mike Johnson',
        },
        {
          id: 'dt-002',
          equipment: 'Assembly Line A',
          date: '2026-01-30',
          startTime: '14:00',
          endTime: '14:20',
          duration: 20,
          category: 'Changeover',
          reason: 'Product changeover',
          description: 'Changeover from Product A to Product B',
          corrective: 'Standard procedure',
          operator: 'Sarah Williams',
        },
        {
          id: 'dt-003',
          equipment: 'CNC Machine 1',
          date: '2026-01-29',
          startTime: '11:30',
          endTime: '12:00',
          duration: 30,
          category: 'Planned',
          reason: 'Scheduled maintenance',
          description: 'Weekly preventive maintenance',
          corrective: 'PM completed as scheduled',
          operator: 'Maintenance Team',
        },
      ],

      // Scrap Data
      scrapRecords: [
        {
          id: 'sc-001',
          date: '2026-01-30',
          shift: 'Day',
          workCenter: 'CNC Machine 1',
          product: 'Housing Part A',
          quantity: 3,
          reason: 'Dimensional out of spec',
          rootCause: 'Tool wear',
          cost: 125.50,
          operator: 'Mike Johnson',
        },
        {
          id: 'sc-002',
          date: '2026-01-30',
          shift: 'Day',
          workCenter: 'Assembly Line A',
          product: 'Controller Unit',
          quantity: 2,
          reason: 'Component damage',
          rootCause: 'Handling error',
          cost: 85.00,
          operator: 'Sarah Williams',
        },
        {
          id: 'sc-003',
          date: '2026-01-29',
          shift: 'Night',
          workCenter: 'Injection Mold Press 2',
          product: 'Plastic Cover',
          quantity: 8,
          reason: 'Surface defects',
          rootCause: 'Mold temperature variation',
          cost: 24.00,
          operator: 'Tom Brown',
        },
      ],

      // Production Output
      productionOutput: [
        { id: 'po-001', date: '2026-01-30', shift: 'Day', workCenter: 'CNC Machine 1', product: 'Housing Part A', planned: 170, actual: 162, efficiency: 95.3 },
        { id: 'po-002', date: '2026-01-30', shift: 'Day', workCenter: 'Assembly Line A', product: 'Controller Unit', planned: 230, actual: 211, efficiency: 91.7 },
        { id: 'po-003', date: '2026-01-30', shift: 'Day', workCenter: 'Injection Mold Press 2', product: 'Plastic Cover', planned: 900, actual: 842, efficiency: 93.6 },
        { id: 'po-004', date: '2026-01-29', shift: 'Day', workCenter: 'CNC Machine 1', product: 'Housing Part A', planned: 170, actual: 158, efficiency: 92.9 },
        { id: 'po-005', date: '2026-01-29', shift: 'Night', workCenter: 'Assembly Line A', product: 'Controller Unit', planned: 200, actual: 195, efficiency: 97.5 },
      ],

      // Quality KPIs
      qualityKPIs: {
        currentMonth: {
          fpy: 97.2, // First Pass Yield
          dpmo: 2850, // Defects Per Million Opportunities
          customerComplaints: 2,
          internalRejects: 0.8, // percentage
          supplierPPM: 125,
          coq: 2.3, // Cost of Quality as % of revenue
        },
        targets: {
          fpy: 98.0,
          dpmo: 2000,
          customerComplaints: 1,
          internalRejects: 0.5,
          supplierPPM: 100,
          coq: 2.0,
        },
        trend: [
          { month: 'Aug', fpy: 96.5, scrapRate: 1.2, oee: 75 },
          { month: 'Sep', fpy: 96.8, scrapRate: 1.1, oee: 76 },
          { month: 'Oct', fpy: 97.0, scrapRate: 1.0, oee: 77 },
          { month: 'Nov', fpy: 97.1, scrapRate: 0.9, oee: 78 },
          { month: 'Dec', fpy: 97.0, scrapRate: 0.9, oee: 79 },
          { month: 'Jan', fpy: 97.2, scrapRate: 0.8, oee: 80 },
        ],
      },

      // Equipment List with layout positions
      equipment: [
        { id: 'eq-001', name: 'CNC Machine 1', type: 'CNC Machining Center', status: 'running', lastMaintenance: '2026-01-15', x: 50, y: 80, width: 120, height: 100, rotation: 0 },
        { id: 'eq-002', name: 'CNC Machine 2', type: 'CNC Machining Center', status: 'idle', lastMaintenance: '2026-01-20', x: 200, y: 80, width: 120, height: 100, rotation: 0 },
        { id: 'eq-003', name: 'Assembly Line A', type: 'Assembly', status: 'running', lastMaintenance: '2026-01-10', x: 400, y: 60, width: 280, height: 60, rotation: 0 },
        { id: 'eq-004', name: 'Assembly Line B', type: 'Assembly', status: 'maintenance', lastMaintenance: '2026-01-28', x: 400, y: 150, width: 280, height: 60, rotation: 0 },
        { id: 'eq-005', name: 'Injection Mold Press 1', type: 'Injection Molding', status: 'running', lastMaintenance: '2026-01-22', x: 50, y: 250, width: 140, height: 120, rotation: 0 },
        { id: 'eq-006', name: 'Injection Mold Press 2', type: 'Injection Molding', status: 'running', lastMaintenance: '2026-01-18', x: 220, y: 250, width: 140, height: 120, rotation: 0 },
        { id: 'eq-007', name: 'Quality Inspection Station', type: 'Inspection', status: 'running', lastMaintenance: '2026-01-25', x: 720, y: 80, width: 100, height: 80, rotation: 0 },
        { id: 'eq-008', name: 'Packaging Line', type: 'Packaging', status: 'running', lastMaintenance: '2026-01-12', x: 720, y: 200, width: 100, height: 160, rotation: 0 },
        { id: 'eq-009', name: 'Raw Material Storage', type: 'Storage', status: 'running', lastMaintenance: '2026-01-05', x: 50, y: 420, width: 200, height: 80, rotation: 0 },
        { id: 'eq-010', name: 'Finished Goods Storage', type: 'Storage', status: 'running', lastMaintenance: '2026-01-08', x: 620, y: 420, width: 200, height: 80, rotation: 0 },
      ],

      // Building/Floor Layout configuration
      floorLayout: {
        width: 900,  // Building width in units (scaled to pixels)
        height: 550, // Building height in units
        name: 'Main Production Hall',
        areas: [
          { id: 'area-1', name: 'CNC Machining Zone', x: 30, y: 50, width: 320, height: 160, color: '#e3f2fd' },
          { id: 'area-2', name: 'Assembly Zone', x: 380, y: 30, width: 320, height: 200, color: '#e8f5e9' },
          { id: 'area-3', name: 'Injection Molding Zone', x: 30, y: 230, width: 350, height: 160, color: '#fff3e0' },
          { id: 'area-4', name: 'Quality & Packaging', x: 700, y: 50, width: 140, height: 340, color: '#f3e5f5' },
          { id: 'area-5', name: 'Storage Area', x: 30, y: 400, width: 810, height: 120, color: '#efebe9' },
        ],
        walls: [
          // Outer walls
          { x1: 20, y1: 20, x2: 860, y2: 20 },
          { x1: 860, y1: 20, x2: 860, y2: 530 },
          { x1: 860, y1: 530, x2: 20, y2: 530 },
          { x1: 20, y1: 530, x2: 20, y2: 20 },
        ],
        doors: [
          { x: 20, y: 280, width: 5, height: 60, type: 'entrance', label: 'Main Entrance' },
          { x: 855, y: 450, width: 5, height: 60, type: 'exit', label: 'Shipping Door' },
          { x: 400, y: 525, width: 80, height: 5, type: 'dock', label: 'Loading Dock' },
        ],
        columns: [
          { x: 200, y: 200 }, { x: 400, y: 200 }, { x: 600, y: 200 },
          { x: 200, y: 400 }, { x: 400, y: 400 }, { x: 600, y: 400 },
        ],
      },

      // Equipment type configurations (for rendering)
      equipmentTypes: {
        'CNC Machining Center': { color: '#1976d2', icon: 'cnc', minWidth: 80, minHeight: 60 },
        'Assembly': { color: '#388e3c', icon: 'assembly', minWidth: 200, minHeight: 40 },
        'Injection Molding': { color: '#f57c00', icon: 'injection', minWidth: 100, minHeight: 80 },
        'Inspection': { color: '#7b1fa2', icon: 'inspection', minWidth: 60, minHeight: 60 },
        'Packaging': { color: '#5d4037', icon: 'packaging', minWidth: 80, minHeight: 80 },
        'Storage': { color: '#455a64', icon: 'storage', minWidth: 100, minHeight: 60 },
      },

      // Unified Audit History - tracks all audits across types
      auditHistory: [
        {
          id: 'ah-001',
          auditType: '5S',
          auditId: 'fs-001',
          date: '2026-01-28',
          area: 'Assembly Line A',
          auditor: 'John Smith',
          score: 68,
          status: 'in_progress',
          findingsCount: 2,
          openActions: 2,
        },
        {
          id: 'ah-002',
          auditType: 'VDA 6.3',
          auditId: 'vda-001',
          date: '2026-01-20',
          area: 'Injection Molding',
          auditor: 'External - TÜV',
          score: 86,
          status: 'completed',
          findingsCount: 3,
          openActions: 0,
        },
        {
          id: 'ah-003',
          auditType: 'Product/Process',
          auditId: 'ppa-001',
          date: '2026-01-22',
          area: 'Housing Part A',
          auditor: 'Quality Team',
          score: 82,
          status: 'completed',
          findingsCount: 4,
          openActions: 1,
        },
      ],

      // Product/Process Audits
      processAudits: [
        {
          id: 'ppa-001',
          productName: 'Housing Part A',
          processName: 'CNC Machining',
          date: '2026-01-22',
          auditor: 'Quality Team',
          status: 'completed',
          overallScore: 82,
          controlPlan: {
            id: 'cp-001',
            version: '2.1',
            lastUpdated: '2026-01-15',
            status: 'approved',
            characteristics: [
              { id: 'cc-1', name: 'Outer Diameter', type: 'Critical', spec: '50.0 ±0.05mm', method: 'CMM', frequency: '100%', reaction: 'Stop & Sort' },
              { id: 'cc-2', name: 'Surface Roughness', type: 'Major', spec: 'Ra ≤ 1.6μm', method: 'Profilometer', frequency: '1/hour', reaction: 'Adjust' },
              { id: 'cc-3', name: 'Hardness', type: 'Major', spec: '58-62 HRC', method: 'Hardness Tester', frequency: '1/batch', reaction: 'Hold lot' },
            ],
            findings: [{ id: 'cpf-1', description: 'Reaction plan not clearly defined for characteristic #3', severity: 'minor', linkedTo: 'pfmea-fm-2' }],
          },
          pfmea: {
            id: 'pfmea-001',
            version: '1.3',
            lastUpdated: '2026-01-10',
            status: 'approved',
            failureModes: [
              { id: 'pfmea-fm-1', processStep: 'Rough Turning', failureMode: 'Tool breakage', effect: 'Scrap part', severity: 8, occurrence: 3, detection: 4, rpn: 96, actions: 'Implement tool life monitoring' },
              { id: 'pfmea-fm-2', processStep: 'Heat Treatment', failureMode: 'Incorrect hardness', effect: 'Functional failure', severity: 9, occurrence: 2, detection: 5, rpn: 90, actions: 'Add hardness verification step' },
              { id: 'pfmea-fm-3', processStep: 'Finish Grinding', failureMode: 'Surface defect', effect: 'Customer complaint', severity: 7, occurrence: 4, detection: 3, rpn: 84, actions: 'Visual inspection station' },
            ],
            findings: [{ id: 'pf-1', description: 'RPN above threshold for FM-1, action pending', severity: 'major', linkedTo: 'cp-001' }],
          },
          workflow: {
            id: 'wf-001',
            version: '1.0',
            steps: [
              { id: 'ws-1', name: 'Raw Material Receipt', department: 'Receiving', duration: '30 min', status: 'compliant' },
              { id: 'ws-2', name: 'Rough Turning', department: 'Machining', duration: '15 min', status: 'compliant' },
              { id: 'ws-3', name: 'Heat Treatment', department: 'Heat Treat', duration: '4 hours', status: 'observation' },
              { id: 'ws-4', name: 'Finish Grinding', department: 'Grinding', duration: '20 min', status: 'compliant' },
              { id: 'ws-5', name: 'Final Inspection', department: 'Quality', duration: '10 min', status: 'compliant' },
            ],
            findings: [{ id: 'wf-1', description: 'Heat treatment documentation incomplete', severity: 'minor', linkedTo: 'pfmea-fm-2' }],
          },
          msa: {
            id: 'msa-001',
            studies: [
              { id: 'msa-s-1', characteristic: 'Outer Diameter', gageRR: 8.5, ndc: 12, status: 'acceptable' },
              { id: 'msa-s-2', characteristic: 'Surface Roughness', gageRR: 15.2, ndc: 6, status: 'marginal' },
            ],
            findings: [{ id: 'msa-f-1', description: 'Surface roughness measurement system needs improvement', severity: 'minor', linkedTo: null }],
          },
          spc: {
            id: 'spc-001',
            charts: [
              { id: 'spc-c-1', characteristic: 'Outer Diameter', cpk: 1.45, status: 'capable' },
              { id: 'spc-c-2', characteristic: 'Surface Roughness', cpk: 1.12, status: 'marginal' },
            ],
            findings: [{ id: 'spc-f-1', description: 'Cpk for surface roughness below target 1.33', severity: 'minor', linkedTo: 'msa-s-2' }],
          },
          findings: [
            { id: 'af-1', category: 'Control Plan', description: 'Reaction plan not clearly defined for characteristic #3', severity: 'minor', status: 'open', dueDate: '2026-02-15', responsible: 'J. Smith', improvement: 'Update control plan with detailed reaction procedure', linkedItems: ['pfmea-fm-2'] },
            { id: 'af-2', category: 'PFMEA', description: 'RPN above threshold for rough turning', severity: 'major', status: 'in_progress', dueDate: '2026-02-10', responsible: 'M. Garcia', improvement: 'Implement tool life monitoring system', linkedItems: ['cp-001'] },
            { id: 'af-3', category: 'Workflow', description: 'Heat treatment documentation incomplete', severity: 'minor', status: 'closed', dueDate: '2026-01-30', responsible: 'T. Brown', improvement: 'Created standardized traveler form', linkedItems: ['pfmea-fm-2'] },
            { id: 'af-4', category: 'SPC', description: 'Cpk for surface roughness below target', severity: 'minor', status: 'open', dueDate: '2026-02-20', responsible: 'Quality Team', improvement: 'Investigate measurement system and process capability', linkedItems: ['msa-s-2'] },
          ],
        },
      ],

      // Audit Types Configuration
      auditTypes: [
        { id: 'at-5s', name: '5S', description: 'Workplace Organization Audit', icon: 'grid', color: '#3498db' },
        { id: 'at-iso', name: 'ISO 9001', description: 'Quality Management System Audit', icon: 'certificate', color: '#27ae60' },
        { id: 'at-vda', name: 'VDA 6.3', description: 'Process Audit', icon: 'audit', color: '#9b59b6' },
        { id: 'at-iatf', name: 'IATF 16949', description: 'Automotive QMS Audit', icon: 'car', color: '#e74c3c' },
        { id: 'at-process', name: 'Product/Process', description: 'Product & Process Audit', icon: 'process', color: '#16a085' },
        { id: 'at-supplier', name: 'Supplier', description: 'Supplier Quality Audit', icon: 'supplier', color: '#e67e22' },
        { id: 'at-layered', name: 'Layered Process', description: 'LPA - Layered Process Audit', icon: 'layers', color: '#8e44ad' },
      ],

      // Audit Questionnaire Templates
      auditQuestionnaires: {
        '5S': {
          name: '5S Workplace Organization Audit',
          categories: [
            {
              id: 'sort',
              name: 'Sort (Seiri)',
              description: 'Remove unnecessary items from the workplace',
              color: '#e74c3c',
              questions: [
                { id: 'sort-1', question: 'All items in the area are necessary for current work', maxScore: 5 },
                { id: 'sort-2', question: 'Unnecessary items have been removed or tagged', maxScore: 5 },
                { id: 'sort-3', question: 'Red tag area is maintained and items are dispositioned', maxScore: 5 },
                { id: 'sort-4', question: 'No obsolete documents, manuals, or drawings present', maxScore: 5 },
                { id: 'sort-5', question: 'Personal items are limited to designated areas', maxScore: 5 },
              ],
            },
            {
              id: 'setInOrder',
              name: 'Set in Order (Seiton)',
              description: 'Organize items for easy access and return',
              color: '#e67e22',
              questions: [
                { id: 'set-1', question: 'All items have a designated storage location', maxScore: 5 },
                { id: 'set-2', question: 'Storage locations are clearly labeled', maxScore: 5 },
                { id: 'set-3', question: 'Frequently used items are within easy reach', maxScore: 5 },
                { id: 'set-4', question: 'Shadow boards or outlines indicate where items belong', maxScore: 5 },
                { id: 'set-5', question: 'Aisles and walkways are clearly marked and unobstructed', maxScore: 5 },
              ],
            },
            {
              id: 'shine',
              name: 'Shine (Seiso)',
              description: 'Clean the workplace and equipment',
              color: '#f1c40f',
              questions: [
                { id: 'shine-1', question: 'Work area is clean and free of dust/debris', maxScore: 5 },
                { id: 'shine-2', question: 'Equipment is clean and well-maintained', maxScore: 5 },
                { id: 'shine-3', question: 'Cleaning supplies are readily available', maxScore: 5 },
                { id: 'shine-4', question: 'Cleaning schedule is posted and followed', maxScore: 5 },
                { id: 'shine-5', question: 'No leaks, spills, or contamination sources present', maxScore: 5 },
              ],
            },
            {
              id: 'standardize',
              name: 'Standardize (Seiketsu)',
              description: 'Create standards and visual controls',
              color: '#3498db',
              questions: [
                { id: 'std-1', question: '5S standards are documented and posted', maxScore: 5 },
                { id: 'std-2', question: 'Visual management tools are in place (signs, labels, colors)', maxScore: 5 },
                { id: 'std-3', question: 'Work instructions are current and accessible', maxScore: 5 },
                { id: 'std-4', question: 'Standard operating procedures are followed', maxScore: 5 },
                { id: 'std-5', question: 'Abnormalities can be easily identified visually', maxScore: 5 },
              ],
            },
            {
              id: 'sustain',
              name: 'Sustain (Shitsuke)',
              description: 'Maintain discipline and continuous improvement',
              color: '#27ae60',
              questions: [
                { id: 'sus-1', question: 'Regular 5S audits are conducted and documented', maxScore: 5 },
                { id: 'sus-2', question: 'Team members are trained on 5S principles', maxScore: 5 },
                { id: 'sus-3', question: 'Corrective actions from previous audits are completed', maxScore: 5 },
                { id: 'sus-4', question: '5S is part of daily routine and habits', maxScore: 5 },
                { id: 'sus-5', question: 'Continuous improvement suggestions are encouraged', maxScore: 5 },
              ],
            },
          ],
        },
        'ISO 9001': {
          name: 'ISO 9001:2015 Internal Audit',
          categories: [
            {
              id: 'context',
              name: 'Clause 4: Context of Organization',
              description: 'Understanding the organization and its context',
              color: '#3498db',
              questions: [
                { id: 'iso4-1', question: 'Internal and external issues relevant to QMS are identified', maxScore: 10 },
                { id: 'iso4-2', question: 'Interested parties and their requirements are determined', maxScore: 10 },
                { id: 'iso4-3', question: 'QMS scope is defined and documented', maxScore: 10 },
                { id: 'iso4-4', question: 'Processes needed for QMS are identified and their interactions defined', maxScore: 10 },
              ],
            },
            {
              id: 'leadership',
              name: 'Clause 5: Leadership',
              description: 'Leadership commitment and policy',
              color: '#27ae60',
              questions: [
                { id: 'iso5-1', question: 'Top management demonstrates leadership and commitment', maxScore: 10 },
                { id: 'iso5-2', question: 'Quality policy is established and communicated', maxScore: 10 },
                { id: 'iso5-3', question: 'Roles, responsibilities, and authorities are assigned', maxScore: 10 },
                { id: 'iso5-4', question: 'Customer focus is maintained throughout the organization', maxScore: 10 },
              ],
            },
            {
              id: 'planning',
              name: 'Clause 6: Planning',
              description: 'Risk-based thinking and quality objectives',
              color: '#9b59b6',
              questions: [
                { id: 'iso6-1', question: 'Risks and opportunities are identified and addressed', maxScore: 10 },
                { id: 'iso6-2', question: 'Quality objectives are established and measurable', maxScore: 10 },
                { id: 'iso6-3', question: 'Planning for changes is managed appropriately', maxScore: 10 },
              ],
            },
            {
              id: 'support',
              name: 'Clause 7: Support',
              description: 'Resources, competence, and documented information',
              color: '#e67e22',
              questions: [
                { id: 'iso7-1', question: 'Resources needed for QMS are determined and provided', maxScore: 10 },
                { id: 'iso7-2', question: 'Personnel competence is determined and maintained', maxScore: 10 },
                { id: 'iso7-3', question: 'Awareness of quality policy and objectives exists', maxScore: 10 },
                { id: 'iso7-4', question: 'Internal and external communication is effective', maxScore: 10 },
                { id: 'iso7-5', question: 'Documented information is controlled appropriately', maxScore: 10 },
              ],
            },
            {
              id: 'operation',
              name: 'Clause 8: Operation',
              description: 'Operational planning and control',
              color: '#e74c3c',
              questions: [
                { id: 'iso8-1', question: 'Operational processes are planned and controlled', maxScore: 10 },
                { id: 'iso8-2', question: 'Customer requirements are determined and reviewed', maxScore: 10 },
                { id: 'iso8-3', question: 'Design and development process is controlled', maxScore: 10 },
                { id: 'iso8-4', question: 'External providers are controlled effectively', maxScore: 10 },
                { id: 'iso8-5', question: 'Production and service provision is controlled', maxScore: 10 },
                { id: 'iso8-6', question: 'Nonconforming outputs are identified and controlled', maxScore: 10 },
              ],
            },
            {
              id: 'performance',
              name: 'Clause 9: Performance Evaluation',
              description: 'Monitoring, measurement, and internal audit',
              color: '#16a085',
              questions: [
                { id: 'iso9-1', question: 'Monitoring and measurement activities are performed', maxScore: 10 },
                { id: 'iso9-2', question: 'Customer satisfaction is monitored', maxScore: 10 },
                { id: 'iso9-3', question: 'Internal audits are conducted as planned', maxScore: 10 },
                { id: 'iso9-4', question: 'Management review is conducted regularly', maxScore: 10 },
              ],
            },
            {
              id: 'improvement',
              name: 'Clause 10: Improvement',
              description: 'Continual improvement and corrective action',
              color: '#8e44ad',
              questions: [
                { id: 'iso10-1', question: 'Opportunities for improvement are determined', maxScore: 10 },
                { id: 'iso10-2', question: 'Nonconformities are addressed with corrective actions', maxScore: 10 },
                { id: 'iso10-3', question: 'Continual improvement of QMS is evident', maxScore: 10 },
              ],
            },
          ],
        },
        'VDA 6.3': {
          name: 'VDA 6.3 Process Audit',
          categories: [
            {
              id: 'p2',
              name: 'P2: Project Management',
              description: 'Project planning and management',
              color: '#3498db',
              questions: [
                { id: 'vda-p2-1', question: 'Project organization is established with responsibilities defined', maxScore: 10 },
                { id: 'vda-p2-2', question: 'Project plan includes all required activities', maxScore: 10 },
                { id: 'vda-p2-3', question: 'Resources are planned and available', maxScore: 10 },
                { id: 'vda-p2-4', question: 'Project risks are identified and managed', maxScore: 10 },
                { id: 'vda-p2-5', question: 'Change management process is established', maxScore: 10 },
              ],
            },
            {
              id: 'p3',
              name: 'P3: Planning Product/Process Development',
              description: 'Product and process planning',
              color: '#27ae60',
              questions: [
                { id: 'vda-p3-1', question: 'Customer requirements are identified and reviewed', maxScore: 10 },
                { id: 'vda-p3-2', question: 'Feasibility evaluation is performed', maxScore: 10 },
                { id: 'vda-p3-3', question: 'Development plan is established', maxScore: 10 },
                { id: 'vda-p3-4', question: 'Special characteristics are identified', maxScore: 10 },
                { id: 'vda-p3-5', question: 'FMEA is developed and maintained', maxScore: 10 },
              ],
            },
            {
              id: 'p4',
              name: 'P4: Realization Product/Process Development',
              description: 'Implementation of development',
              color: '#e67e22',
              questions: [
                { id: 'vda-p4-1', question: 'Product design outputs meet requirements', maxScore: 10 },
                { id: 'vda-p4-2', question: 'Process design is validated', maxScore: 10 },
                { id: 'vda-p4-3', question: 'Control plan is developed', maxScore: 10 },
                { id: 'vda-p4-4', question: 'Production trial run is performed', maxScore: 10 },
                { id: 'vda-p4-5', question: 'PPAP/PPA requirements are fulfilled', maxScore: 10 },
              ],
            },
            {
              id: 'p5',
              name: 'P5: Supplier Management',
              description: 'Management of external providers',
              color: '#9b59b6',
              questions: [
                { id: 'vda-p5-1', question: 'Supplier selection process is defined', maxScore: 10 },
                { id: 'vda-p5-2', question: 'Supplier quality agreements are in place', maxScore: 10 },
                { id: 'vda-p5-3', question: 'Supplier performance is monitored', maxScore: 10 },
                { id: 'vda-p5-4', question: 'Incoming inspection is performed', maxScore: 10 },
                { id: 'vda-p5-5', question: 'Supplier development activities are conducted', maxScore: 10 },
              ],
            },
            {
              id: 'p6',
              name: 'P6: Process Analysis/Production',
              description: 'Serial production process',
              color: '#e74c3c',
              questions: [
                { id: 'vda-p6-1', question: 'Process inputs are controlled', maxScore: 10 },
                { id: 'vda-p6-2', question: 'Process sequence is defined and followed', maxScore: 10 },
                { id: 'vda-p6-3', question: 'Personnel are qualified and competent', maxScore: 10 },
                { id: 'vda-p6-4', question: 'Equipment and tools are maintained', maxScore: 10 },
                { id: 'vda-p6-5', question: 'Process outputs meet specifications', maxScore: 10 },
                { id: 'vda-p6-6', question: 'Nonconforming products are controlled', maxScore: 10 },
              ],
            },
            {
              id: 'p7',
              name: 'P7: Customer Care/Satisfaction',
              description: 'Customer service and satisfaction',
              color: '#16a085',
              questions: [
                { id: 'vda-p7-1', question: 'Customer requirements for delivery are met', maxScore: 10 },
                { id: 'vda-p7-2', question: 'Customer complaints are handled effectively', maxScore: 10 },
                { id: 'vda-p7-3', question: 'Customer satisfaction is monitored', maxScore: 10 },
                { id: 'vda-p7-4', question: 'Field failures are analyzed and addressed', maxScore: 10 },
              ],
            },
          ],
        },
        'IATF 16949': {
          name: 'IATF 16949:2016 Audit',
          categories: [
            {
              id: 'core-tools',
              name: 'Core Tools Assessment',
              description: 'APQP, PPAP, FMEA, MSA, SPC',
              color: '#e74c3c',
              questions: [
                { id: 'iatf-ct-1', question: 'APQP phases are properly planned and executed', maxScore: 10 },
                { id: 'iatf-ct-2', question: 'PPAP submissions meet customer requirements', maxScore: 10 },
                { id: 'iatf-ct-3', question: 'DFMEA and PFMEA are developed and maintained', maxScore: 10 },
                { id: 'iatf-ct-4', question: 'MSA studies are conducted for measurement systems', maxScore: 10 },
                { id: 'iatf-ct-5', question: 'SPC is implemented for key characteristics', maxScore: 10 },
              ],
            },
            {
              id: 'product-safety',
              name: 'Product Safety',
              description: 'Safety-related products and processes',
              color: '#9b59b6',
              questions: [
                { id: 'iatf-ps-1', question: 'Product safety requirements are identified', maxScore: 10 },
                { id: 'iatf-ps-2', question: 'Special approvals for control plans exist', maxScore: 10 },
                { id: 'iatf-ps-3', question: 'Traceability requirements are implemented', maxScore: 10 },
                { id: 'iatf-ps-4', question: 'Lessons learned are captured and shared', maxScore: 10 },
              ],
            },
            {
              id: 'csr',
              name: 'Customer-Specific Requirements',
              description: 'OEM-specific requirements compliance',
              color: '#3498db',
              questions: [
                { id: 'iatf-csr-1', question: 'Customer-specific requirements are identified', maxScore: 10 },
                { id: 'iatf-csr-2', question: 'CSR training is provided to relevant personnel', maxScore: 10 },
                { id: 'iatf-csr-3', question: 'Customer portals and systems are used correctly', maxScore: 10 },
                { id: 'iatf-csr-4', question: 'Customer scorecards meet targets', maxScore: 10 },
              ],
            },
            {
              id: 'manufacturing',
              name: 'Manufacturing Process',
              description: 'Production and process control',
              color: '#27ae60',
              questions: [
                { id: 'iatf-mfg-1', question: 'Work instructions are available at workstations', maxScore: 10 },
                { id: 'iatf-mfg-2', question: 'Error-proofing devices are implemented', maxScore: 10 },
                { id: 'iatf-mfg-3', question: 'Total Productive Maintenance is implemented', maxScore: 10 },
                { id: 'iatf-mfg-4', question: 'Production scheduling uses level loading', maxScore: 10 },
                { id: 'iatf-mfg-5', question: 'Standardized work is documented and followed', maxScore: 10 },
              ],
            },
            {
              id: 'quality-control',
              name: 'Quality Control',
              description: 'Inspection and testing',
              color: '#e67e22',
              questions: [
                { id: 'iatf-qc-1', question: 'Layout inspection is performed as required', maxScore: 10 },
                { id: 'iatf-qc-2', question: 'Appearance items meet customer requirements', maxScore: 10 },
                { id: 'iatf-qc-3', question: 'Rework process is controlled', maxScore: 10 },
                { id: 'iatf-qc-4', question: 'Calibration program is effective', maxScore: 10 },
              ],
            },
          ],
        },
        'Product/Process': {
          name: 'Product/Process Audit',
          categories: [
            {
              id: 'control-plan',
              name: 'Control Plan Review',
              description: 'Control plan effectiveness',
              color: '#3498db',
              questions: [
                { id: 'pp-cp-1', question: 'Control plan matches current process', maxScore: 10 },
                { id: 'pp-cp-2', question: 'Special characteristics are identified', maxScore: 10 },
                { id: 'pp-cp-3', question: 'Inspection frequencies are adequate', maxScore: 10 },
                { id: 'pp-cp-4', question: 'Reaction plans are defined and understood', maxScore: 10 },
                { id: 'pp-cp-5', question: 'Control plan revision is current', maxScore: 10 },
              ],
            },
            {
              id: 'pfmea',
              name: 'PFMEA Review',
              description: 'Process FMEA assessment',
              color: '#e74c3c',
              questions: [
                { id: 'pp-fm-1', question: 'All process steps are included in PFMEA', maxScore: 10 },
                { id: 'pp-fm-2', question: 'Failure modes are realistic and complete', maxScore: 10 },
                { id: 'pp-fm-3', question: 'Severity, occurrence, detection ratings are justified', maxScore: 10 },
                { id: 'pp-fm-4', question: 'High RPN items have action plans', maxScore: 10 },
                { id: 'pp-fm-5', question: 'PFMEA is linked to Control Plan', maxScore: 10 },
              ],
            },
            {
              id: 'workflow',
              name: 'Production Workflow',
              description: 'Process flow verification',
              color: '#27ae60',
              questions: [
                { id: 'pp-wf-1', question: 'Process flow matches documentation', maxScore: 10 },
                { id: 'pp-wf-2', question: 'Work instructions are current and accessible', maxScore: 10 },
                { id: 'pp-wf-3', question: 'Material flow is efficient and controlled', maxScore: 10 },
                { id: 'pp-wf-4', question: 'WIP limits are defined and followed', maxScore: 10 },
                { id: 'pp-wf-5', question: 'Process parameters are monitored', maxScore: 10 },
              ],
            },
            {
              id: 'msa',
              name: 'MSA Assessment',
              description: 'Measurement system analysis',
              color: '#9b59b6',
              questions: [
                { id: 'pp-msa-1', question: 'Gage R&R studies are current', maxScore: 10 },
                { id: 'pp-msa-2', question: 'Measurement systems meet acceptance criteria', maxScore: 10 },
                { id: 'pp-msa-3', question: 'Calibration records are maintained', maxScore: 10 },
                { id: 'pp-msa-4', question: 'Operators are trained on measurement equipment', maxScore: 10 },
              ],
            },
            {
              id: 'spc',
              name: 'SPC Implementation',
              description: 'Statistical process control',
              color: '#e67e22',
              questions: [
                { id: 'pp-spc-1', question: 'SPC charts are maintained for key characteristics', maxScore: 10 },
                { id: 'pp-spc-2', question: 'Control limits are statistically valid', maxScore: 10 },
                { id: 'pp-spc-3', question: 'Out-of-control conditions are addressed', maxScore: 10 },
                { id: 'pp-spc-4', question: 'Process capability meets requirements', maxScore: 10 },
              ],
            },
          ],
        },
        'Layered Process': {
          name: 'Layered Process Audit (LPA)',
          categories: [
            {
              id: 'safety',
              name: 'Safety',
              description: 'Workplace safety verification',
              color: '#e74c3c',
              questions: [
                { id: 'lpa-s-1', question: 'PPE is worn correctly', maxScore: 5 },
                { id: 'lpa-s-2', question: 'Safety guards are in place and functional', maxScore: 5 },
                { id: 'lpa-s-3', question: 'Emergency stops are accessible', maxScore: 5 },
                { id: 'lpa-s-4', question: 'Hazardous materials are properly stored', maxScore: 5 },
              ],
            },
            {
              id: 'quality',
              name: 'Quality',
              description: 'Quality requirements verification',
              color: '#27ae60',
              questions: [
                { id: 'lpa-q-1', question: 'Current revision of work instructions in use', maxScore: 5 },
                { id: 'lpa-q-2', question: 'Inspection equipment is calibrated', maxScore: 5 },
                { id: 'lpa-q-3', question: 'Defective material is properly identified', maxScore: 5 },
                { id: 'lpa-q-4', question: 'SPC charts are current and reviewed', maxScore: 5 },
                { id: 'lpa-q-5', question: 'First piece inspection performed', maxScore: 5 },
              ],
            },
            {
              id: 'process',
              name: 'Process',
              description: 'Process adherence verification',
              color: '#3498db',
              questions: [
                { id: 'lpa-p-1', question: 'Process parameters match work instructions', maxScore: 5 },
                { id: 'lpa-p-2', question: 'Correct tools and equipment are used', maxScore: 5 },
                { id: 'lpa-p-3', question: 'Error-proofing devices are functional', maxScore: 5 },
                { id: 'lpa-p-4', question: 'Material traceability is maintained', maxScore: 5 },
              ],
            },
            {
              id: 'housekeeping',
              name: 'Housekeeping (5S)',
              description: 'Workplace organization',
              color: '#e67e22',
              questions: [
                { id: 'lpa-h-1', question: 'Work area is clean and organized', maxScore: 5 },
                { id: 'lpa-h-2', question: 'Tools are in designated locations', maxScore: 5 },
                { id: 'lpa-h-3', question: 'Aisles and exits are clear', maxScore: 5 },
                { id: 'lpa-h-4', question: 'Visual management boards are current', maxScore: 5 },
              ],
            },
          ],
        },
        'Supplier': {
          name: 'Supplier Quality Audit',
          categories: [
            {
              id: 'qms',
              name: 'Quality Management System',
              description: 'Supplier QMS evaluation',
              color: '#3498db',
              questions: [
                { id: 'sup-qms-1', question: 'Quality policy is established and communicated', maxScore: 10 },
                { id: 'sup-qms-2', question: 'Quality objectives are defined and measured', maxScore: 10 },
                { id: 'sup-qms-3', question: 'Document control system is effective', maxScore: 10 },
                { id: 'sup-qms-4', question: 'Internal audit program is in place', maxScore: 10 },
                { id: 'sup-qms-5', question: 'Management review is conducted regularly', maxScore: 10 },
              ],
            },
            {
              id: 'production',
              name: 'Production Capability',
              description: 'Manufacturing and process control',
              color: '#27ae60',
              questions: [
                { id: 'sup-prod-1', question: 'Production capacity meets requirements', maxScore: 10 },
                { id: 'sup-prod-2', question: 'Process controls are adequate', maxScore: 10 },
                { id: 'sup-prod-3', question: 'Equipment is maintained and calibrated', maxScore: 10 },
                { id: 'sup-prod-4', question: 'Work instructions are available and followed', maxScore: 10 },
                { id: 'sup-prod-5', question: 'Change management process is effective', maxScore: 10 },
              ],
            },
            {
              id: 'quality-control',
              name: 'Quality Control',
              description: 'Inspection and testing',
              color: '#e74c3c',
              questions: [
                { id: 'sup-qc-1', question: 'Incoming inspection is performed', maxScore: 10 },
                { id: 'sup-qc-2', question: 'In-process inspection is adequate', maxScore: 10 },
                { id: 'sup-qc-3', question: 'Final inspection verifies all requirements', maxScore: 10 },
                { id: 'sup-qc-4', question: 'Nonconforming product is controlled', maxScore: 10 },
                { id: 'sup-qc-5', question: 'Inspection records are maintained', maxScore: 10 },
              ],
            },
            {
              id: 'logistics',
              name: 'Logistics & Delivery',
              description: 'Shipping and delivery performance',
              color: '#e67e22',
              questions: [
                { id: 'sup-log-1', question: 'On-time delivery performance is acceptable', maxScore: 10 },
                { id: 'sup-log-2', question: 'Packaging meets requirements', maxScore: 10 },
                { id: 'sup-log-3', question: 'Labeling and documentation is correct', maxScore: 10 },
                { id: 'sup-log-4', question: 'Traceability is maintained', maxScore: 10 },
              ],
            },
            {
              id: 'continuous',
              name: 'Continuous Improvement',
              description: 'Improvement activities and responsiveness',
              color: '#9b59b6',
              questions: [
                { id: 'sup-ci-1', question: 'Corrective action process is effective', maxScore: 10 },
                { id: 'sup-ci-2', question: 'Root cause analysis methods are used', maxScore: 10 },
                { id: 'sup-ci-3', question: 'Customer complaints are addressed promptly', maxScore: 10 },
                { id: 'sup-ci-4', question: 'Continuous improvement culture exists', maxScore: 10 },
              ],
            },
          ],
        },
      },

      // Actions for Certification History
      addCertificationDocument: (certType, historyId, document) => set((state) => ({
        certificationHistory: {
          ...state.certificationHistory,
          [certType]: state.certificationHistory[certType].map(h =>
            h.id === historyId
              ? { ...h, documents: [...h.documents, { ...document, id: `doc-${Date.now()}` }] }
              : h
          ),
        },
      })),
      removeCertificationDocument: (certType, historyId, docId) => set((state) => ({
        certificationHistory: {
          ...state.certificationHistory,
          [certType]: state.certificationHistory[certType].map(h =>
            h.id === historyId
              ? { ...h, documents: h.documents.filter(d => d.id !== docId) }
              : h
          ),
        },
      })),
      addCertificationHistory: (certType, entry) => set((state) => ({
        certificationHistory: {
          ...state.certificationHistory,
          [certType]: [...state.certificationHistory[certType], { ...entry, id: `${certType}-hist-${Date.now()}` }],
        },
      })),

      // Actions for Equipment Layout
      updateEquipmentPosition: (id, x, y) => set((state) => ({
        equipment: state.equipment.map(eq => 
          eq.id === id ? { ...eq, x, y } : eq
        )
      })),
      updateEquipmentSize: (id, width, height) => set((state) => ({
        equipment: state.equipment.map(eq => 
          eq.id === id ? { ...eq, width, height } : eq
        )
      })),
      updateEquipmentRotation: (id, rotation) => set((state) => ({
        equipment: state.equipment.map(eq => 
          eq.id === id ? { ...eq, rotation } : eq
        )
      })),
      updateEquipmentStatus: (id, status) => set((state) => ({
        equipment: state.equipment.map(eq => 
          eq.id === id ? { ...eq, status } : eq
        )
      })),
      addEquipment: (equipment) => set((state) => ({
        equipment: [...state.equipment, { ...equipment, id: `eq-${Date.now()}` }]
      })),
      removeEquipment: (id) => set((state) => ({
        equipment: state.equipment.filter(eq => eq.id !== id)
      })),
      updateFloorLayoutArea: (id, updates) => set((state) => ({
        floorLayout: {
          ...state.floorLayout,
          areas: state.floorLayout.areas.map(a => 
            a.id === id ? { ...a, ...updates } : a
          )
        }
      })),

      // Actions for 5S
      addFiveSAudit: (audit) => set((state) => {
        const newAudit = { ...audit, id: `fs-${Date.now()}` }
        // Also add to audit history
        const historyEntry = {
          id: `ah-${Date.now()}`,
          auditType: '5S',
          auditId: newAudit.id,
          date: audit.date,
          area: audit.area,
          auditor: audit.auditor,
          score: Math.round((audit.totalScore / audit.maxScore) * 100),
          status: audit.status || 'open',
          findingsCount: audit.findings?.length || 0,
          openActions: audit.actions?.length || 0,
        }
        return {
          fiveSAudits: [...state.fiveSAudits, newAudit],
          auditHistory: [...state.auditHistory, historyEntry],
        }
      }),
      updateFiveSAudit: (id, updates) => set((state) => ({
        fiveSAudits: state.fiveSAudits.map(a => a.id === id ? { ...a, ...updates } : a)
      })),

      // Actions for VDA 6.3
      addVDA63Audit: (audit) => set((state) => {
        const newAudit = { ...audit, id: `vda-${Date.now()}` }
        // Also add to audit history
        const historyEntry = {
          id: `ah-${Date.now()}`,
          auditType: 'VDA 6.3',
          auditId: newAudit.id,
          date: audit.date,
          area: audit.processName,
          auditor: audit.auditor,
          score: audit.overallScore,
          status: audit.status || 'completed',
          findingsCount: audit.findings || 0,
          openActions: 0,
        }
        return {
          vda63Audits: [...state.vda63Audits, newAudit],
          auditHistory: [...state.auditHistory, historyEntry],
        }
      }),
      updateVDA63Audit: (id, updates) => set((state) => ({
        vda63Audits: state.vda63Audits.map(a => a.id === id ? { ...a, ...updates } : a)
      })),

      // Actions for OEE
      addOEERecord: (record) => set((state) => ({
        oeeData: [...state.oeeData, { 
          ...record, 
          id: `oee-${Date.now()}`,
          oee: (record.availability * record.performance * record.quality) / 10000
        }]
      })),
      updateOEERecord: (id, updates) => set((state) => ({
        oeeData: state.oeeData.map(r => r.id === id ? { ...r, ...updates } : r)
      })),

      // Actions for Downtime
      addDowntimeRecord: (record) => set((state) => ({
        downtimeRecords: [...state.downtimeRecords, { ...record, id: `dt-${Date.now()}` }]
      })),
      updateDowntimeRecord: (id, updates) => set((state) => ({
        downtimeRecords: state.downtimeRecords.map(r => r.id === id ? { ...r, ...updates } : r)
      })),
      deleteDowntimeRecord: (id) => set((state) => ({
        downtimeRecords: state.downtimeRecords.filter(r => r.id !== id)
      })),

      // Actions for Scrap
      addScrapRecord: (record) => set((state) => ({
        scrapRecords: [...state.scrapRecords, { ...record, id: `sc-${Date.now()}` }]
      })),
      updateScrapRecord: (id, updates) => set((state) => ({
        scrapRecords: state.scrapRecords.map(r => r.id === id ? { ...r, ...updates } : r)
      })),
      deleteScrapRecord: (id) => set((state) => ({
        scrapRecords: state.scrapRecords.filter(r => r.id !== id)
      })),

      // Actions for Production Output
      addProductionOutput: (record) => set((state) => ({
        productionOutput: [...state.productionOutput, { 
          ...record, 
          id: `po-${Date.now()}`,
          efficiency: ((record.actual / record.planned) * 100).toFixed(1)
        }]
      })),

      // Actions for Audit History
      addAuditHistory: (audit) => set((state) => ({
        auditHistory: [...state.auditHistory, { ...audit, id: `ah-${Date.now()}` }]
      })),
      updateAuditHistory: (id, updates) => set((state) => ({
        auditHistory: state.auditHistory.map(a => a.id === id ? { ...a, ...updates } : a)
      })),

      // Actions for Process Audits
      addProcessAudit: (audit) => set((state) => {
        const newAudit = { ...audit, id: `ppa-${Date.now()}` }
        // Also add to audit history
        const historyEntry = {
          id: `ah-${Date.now()}`,
          auditType: 'Product/Process',
          auditId: newAudit.id,
          date: audit.date,
          area: audit.productName,
          auditor: audit.auditor,
          score: audit.overallScore || 0,
          status: audit.status || 'open',
          findingsCount: audit.findings?.length || 0,
          openActions: audit.findings?.filter(f => f.status === 'open').length || 0,
        }
        return {
          processAudits: [...state.processAudits, newAudit],
          auditHistory: [...state.auditHistory, historyEntry],
        }
      }),
      updateProcessAudit: (id, updates) => set((state) => ({
        processAudits: state.processAudits.map(a => a.id === id ? { ...a, ...updates } : a)
      })),

      // Add finding to process audit
      addProcessAuditFinding: (auditId, finding) => set((state) => ({
        processAudits: state.processAudits.map(a => 
          a.id === auditId 
            ? { ...a, findings: [...a.findings, { ...finding, id: `af-${Date.now()}` }] }
            : a
        )
      })),
      updateProcessAuditFinding: (auditId, findingId, updates) => set((state) => ({
        processAudits: state.processAudits.map(a => 
          a.id === auditId 
            ? { ...a, findings: a.findings.map(f => f.id === findingId ? { ...f, ...updates } : f) }
            : a
        )
      })),

      // Get all audits for history view
      getAllAudits: () => {
        const state = get()
        const audits = []
        
        // Add 5S audits
        state.fiveSAudits.forEach(a => {
          audits.push({
            id: a.id,
            auditType: '5S',
            date: a.date,
            area: a.area,
            auditor: a.auditor,
            score: Math.round((a.totalScore / a.maxScore) * 100),
            status: a.status,
            findingsCount: a.findings?.length || 0,
          })
        })
        
        // Add VDA audits
        state.vda63Audits.forEach(a => {
          audits.push({
            id: a.id,
            auditType: 'VDA 6.3',
            date: a.date,
            area: a.processName,
            auditor: a.auditor,
            score: a.overallScore,
            status: a.status,
            findingsCount: a.findings || 0,
          })
        })
        
        // Add Process audits
        state.processAudits.forEach(a => {
          audits.push({
            id: a.id,
            auditType: 'Product/Process',
            date: a.date,
            area: a.productName,
            auditor: a.auditor,
            score: a.overallScore,
            status: a.status,
            findingsCount: a.findings?.length || 0,
          })
        })
        
        return audits.sort((a, b) => new Date(b.date) - new Date(a.date))
      },

      // Calculation functions
      getAverageOEE: () => {
        const data = get().oeeData
        if (data.length === 0) return 0
        return data.reduce((sum, r) => sum + r.oee, 0) / data.length
      },

      getTotalDowntime: (date) => {
        const records = get().downtimeRecords.filter(r => r.date === date)
        return records.reduce((sum, r) => sum + r.duration, 0)
      },

      getScrapRate: () => {
        const output = get().productionOutput
        const scrap = get().scrapRecords
        const totalProduced = output.reduce((sum, r) => sum + r.actual, 0)
        const totalScrap = scrap.reduce((sum, r) => sum + r.quantity, 0)
        return totalProduced > 0 ? ((totalScrap / totalProduced) * 100).toFixed(2) : 0
      },

      // ─── Work Center Output Data ──────────────────
      workCenters: [
        {
          id: 'wc-001',
          name: 'CNC Machine 1',
          type: 'CNC Machining',
          products: [
            { id: 'wp-001', name: 'Housing Part A', cycleTime: 3.2, setupTime: 25, demandPerMonth: 3400 },
            { id: 'wp-002', name: 'Bracket Assembly', cycleTime: 2.1, setupTime: 15, demandPerMonth: 5000 },
          ],
          changeoverTime: 30, // minutes per changeover
          plannedMaintenanceTime: 60, // minutes per day
          unplannedDowntime: 15, // avg minutes per day
          breakTime: 60, // minutes per shift
          workingDaysPerMonth: 22,
          workingDaysPerYear: 260,
          shiftsPerDay: 2,
          hoursPerShift: 8,
          availability: 88, // %
          performance: 92, // %
          quality: 98.5, // %
          scrapRate: 1.5, // %
          operators: 2,
        },
        {
          id: 'wc-002',
          name: 'Assembly Line A',
          type: 'Assembly',
          products: [
            { id: 'wp-003', name: 'Controller Unit', cycleTime: 1.8, setupTime: 10, demandPerMonth: 4600 },
            { id: 'wp-004', name: 'Sensor Module', cycleTime: 1.2, setupTime: 8, demandPerMonth: 8800 },
          ],
          changeoverTime: 20,
          plannedMaintenanceTime: 30,
          unplannedDowntime: 10,
          breakTime: 60,
          workingDaysPerMonth: 22,
          workingDaysPerYear: 260,
          shiftsPerDay: 2,
          hoursPerShift: 8,
          availability: 91,
          performance: 94,
          quality: 99.0,
          scrapRate: 1.0,
          operators: 4,
        },
        {
          id: 'wc-003',
          name: 'Injection Mold Press 2',
          type: 'Injection Molding',
          products: [
            { id: 'wp-005', name: 'Plastic Cover', cycleTime: 0.45, setupTime: 45, demandPerMonth: 18000 },
            { id: 'wp-006', name: 'Housing Shell', cycleTime: 0.65, setupTime: 35, demandPerMonth: 12000 },
            { id: 'wp-007', name: 'Connector Cap', cycleTime: 0.25, setupTime: 20, demandPerMonth: 30000 },
          ],
          changeoverTime: 45,
          plannedMaintenanceTime: 45,
          unplannedDowntime: 20,
          breakTime: 60,
          workingDaysPerMonth: 22,
          workingDaysPerYear: 260,
          shiftsPerDay: 3,
          hoursPerShift: 8,
          availability: 85,
          performance: 90,
          quality: 97.5,
          scrapRate: 2.5,
          operators: 3,
        },
      ],

      addWorkCenter: (wc) => set((state) => ({
        workCenters: [...state.workCenters, { ...wc, id: `wc-${Date.now()}` }]
      })),
      updateWorkCenter: (id, updates) => set((state) => ({
        workCenters: state.workCenters.map(w => w.id === id ? { ...w, ...updates } : w)
      })),
      deleteWorkCenter: (id) => set((state) => ({
        workCenters: state.workCenters.filter(w => w.id !== id)
      })),
      addWorkCenterProduct: (wcId, product) => set((state) => ({
        workCenters: state.workCenters.map(w =>
          w.id === wcId ? { ...w, products: [...w.products, { ...product, id: `wp-${Date.now()}` }] } : w
        )
      })),
      updateWorkCenterProduct: (wcId, prodId, updates) => set((state) => ({
        workCenters: state.workCenters.map(w =>
          w.id === wcId ? { ...w, products: w.products.map(p => p.id === prodId ? { ...p, ...updates } : p) } : w
        )
      })),
      deleteWorkCenterProduct: (wcId, prodId) => set((state) => ({
        workCenters: state.workCenters.map(w =>
          w.id === wcId ? { ...w, products: w.products.filter(p => p.id !== prodId) } : w
        )
      })),

      canEditProduction: () => guardCanEdit(),
      isReadOnly: () => isAuditor(),
      getAccessLevel: () => getUserRole(),

      getProductionSummary: () => {
        const state = get()
        const avgOEE = state.getAverageOEE()
        const scrapRate = state.getScrapRate()
        const totalDowntime = state.downtimeRecords.reduce((sum, r) => sum + r.duration, 0)
        const totalScrapCost = state.scrapRecords.reduce((sum, r) => sum + r.cost, 0)
        
        const equipmentStatus = {
          running: state.equipment.filter(e => e.status === 'running').length,
          idle: state.equipment.filter(e => e.status === 'idle').length,
          maintenance: state.equipment.filter(e => e.status === 'maintenance').length,
        }

        const iso9001Score = state.iso9001.clauses.reduce((sum, c) => sum + c.score, 0) / state.iso9001.clauses.length

        return {
          avgOEE,
          scrapRate,
          totalDowntime,
          totalScrapCost,
          equipmentStatus,
          iso9001Score,
          fpy: state.qualityKPIs.currentMonth.fpy,
          dpmo: state.qualityKPIs.currentMonth.dpmo,
        }
      },
    }),
    {
      name: 'strefex-production-storage',
      storage: createTenantStorage(),
    }
  )
)

export default useProductionStore
