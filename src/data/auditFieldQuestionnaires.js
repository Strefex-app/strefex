function sec(element, clause, questions) {
  return {
    section: element,
    clause,
    questions: questions.map((q) => ({
      ...q,
      isoRef: q.isoRef || q.clause,
      examples: q.lookAt,
      docs: q.docs || [],
    })),
  }
}

function item(id, clause, text, lookAt, docs) {
  return { id, clause, isoRef: clause, text, lookAt, docs: docs || [] }
}

export const FIELD_QUESTIONNAIRES = {
  'ISO 9001:2015': [
    sec('Context & processes', '4', [
      item('iso-4-1', '4.1', 'Are the internal and external issues and interested parties relevant to the QMS identified, and is the analysis current?', 'Look at: Context analysis with a revision date inside the last 12 months; evidence it fed the risk register rather than sitting in isolation.'),
      item('iso-4-2', '4.2', 'Are the needs and expectations of relevant interested parties determined and reviewed?', 'Look at: Interested-party matrix with requirements and how each is monitored (customer scorecards, legal register, employee feedback).'),
      item('iso-4-3', '4.3', 'Is the scope of the QMS defined, including justification for any requirement claimed as not applicable?', 'Look at: Scope statement on the certificate and in the quality manual; exclusions limited to clause 8 and justified.'),
      item('iso-4-4', '4.4', 'Is the process landscape defined with inputs, outputs, owners, interactions and performance indicators?', 'Look at: Process map plus per-process KPI definitions; ask an owner to state their own indicator and current value.'),
    ]),
    sec('Leadership', '5', [
      item('iso-5-1', '5.1', 'Can top management demonstrate active involvement in QMS effectiveness rather than delegation to the quality function?', 'Look at: Management review minutes with decisions and resource allocation attributable to named executives; policy known at the workstation.'),
      item('iso-5-2', '5.2', 'Is the quality policy appropriate, communicated and applied as a working document?', 'Look at: Current signed policy; evidence of communication; two operators who can explain what it means for their job.'),
      item('iso-5-3', '5.3', 'Are roles, responsibilities and authorities assigned, understood and kept current after organisational changes?', 'Look at: Job descriptions / RACI versus the actual organisation chart; last change of process owner and how it was recorded.'),
    ]),
    sec('Planning', '6', [
      item('iso-6-1', '6.1', 'Are risks and opportunities recorded with actions, owners, due dates and an effectiveness check?', 'Look at: Risk register with closed entries showing verification, not only open entries with intentions.'),
      item('iso-6-2', '6.2', 'Are quality objectives measurable, aligned to the policy, and reviewed when they are missed?', 'Look at: Objective sheet with targets, actuals and actions when red; cascade into at least one production KPI.'),
      item('iso-6-3', '6.3', 'Is change to the QMS, product or process planned so unintended consequences are considered?', 'Look at: A recent engineering / layout / software change with risk, validation and communication recorded before go-live.'),
    ]),
    sec('Support', '7', [
      item('iso-7-1', '7.1', 'Are infrastructure, environment and monitoring resources adequate for conformity?', 'Look at: Calibration due dates on gauges in use; environmental records where they affect the product; spare-parts list for bottleneck equipment.'),
      item('iso-7-2', '7.2', 'Is competence for work affecting conformity determined, provided and verified?', 'Look at: Competence matrix against the actual manning of the line audited; verification records, not attendance sheets.'),
      item('iso-7-5', '7.5', 'Is documented information controlled so only current versions are in use at the point of work?', 'Look at: Work instructions on the line versus master list revision; obsolete copies pulled from the station.'),
    ]),
    sec('Operation', '8', [
      item('iso-8-1', '8.1', 'Is operational planning complete before production or service delivery starts?', 'Look at: Control plan / routing / inspection plan matching the job currently on the machine.'),
      item('iso-8-2', '8.2', 'Are customer and applicable statutory requirements determined, reviewed and confirmed before commit?', 'Look at: Contract / order review for a live order; special characteristics and delivery terms captured.'),
      item('iso-8-4', '8.4', 'Are external providers controlled in proportion to the effect of the purchased product or process?', 'Look at: Approved vendor list, incoming inspection results, and a supplier complaint that reached 8D.'),
      item('iso-8-5', '8.5', 'Is production carried out under controlled conditions, including identification and traceability where required?', 'Look at: Traveller / barcode at the station; first-off and in-process checks for the job on the machine.'),
      item('iso-8-6', '8.6', 'Is product release authorised by competent people against defined criteria?', 'Look at: Last three release records; authority of the signatory versus the procedure.'),
      item('iso-8-7', '8.7', 'Is nonconforming output identified, segregated and dispositioned, with recurrence addressed?', 'Look at: Hold area physically controlled; NCR to CAPA link for a recent escape.'),
    ]),
    sec('Performance', '9', [
      item('iso-9-1', '9.1', 'Are process and product performance data analysed and used to decide actions?', 'Look at: Dashboard used in the last production meeting; action when a KPI went red.'),
      item('iso-9-2', '9.2', 'Do internal audits cover processes, not only the quality office, and are findings closed on time?', 'Look at: Annual audit programme versus last three reports and overdue findings.'),
      item('iso-9-3', '9.3', 'Does management review use the required inputs and result in decisions on resources and improvement?', 'Look at: Last management review pack and the list of actions still open.'),
    ]),
    sec('Improvement', '10', [
      item('iso-10-1', '10.1', 'Is continual improvement visible in process metrics, not only in a suggestion scheme?', 'Look at: Year-on-year scrap, OTIF or complaint trend with named improvement projects.'),
      item('iso-10-2', '10.2', 'Do corrective actions reach root cause, systemic fix and verified effectiveness?', 'Look at: Three closed CAPAs; evidence the same defect did not recur on the next lots.'),
    ]),
  ],

  'IATF 16949:2016': [
    sec('Automotive QMS', '4', [
      item('iatf-4-4-1-2', '4.4.1.2', 'Is product safety identified, with special controls and a product-safety champion?', 'Look at: Safety characteristics on the drawing flowed to PFMEA, control plan and work instructions; named champion.'),
      item('iatf-4-3-2', '4.3.2', 'Are customer-specific requirements in the scope of the QMS and available to process owners?', 'Look at: CSR matrix mapped to procedures; last customer portal update implemented.'),
    ]),
    sec('Leadership', '5', [
      item('iatf-5-1-1-1', '5.1.1.1', 'Does plant leadership review product realisation performance, not only financials?', 'Look at: Daily / weekly SQDCM boards with quality and delivery actions owned by operations.'),
      item('iatf-5-1-1-2', '5.1.1.2', 'Is process effectiveness reviewed by top management with actions when targets are missed?', 'Look at: Process KPI pack used in management review; red KPIs with dated actions.'),
    ]),
    sec('Risk & contingency', '6', [
      item('iatf-6-1-2-1', '6.1.2.1', 'Are manufacturing and product risks analysed with FMEA and used to set controls?', 'Look at: PFMEA action priority, linkage to control plan, and a recent RPN/AP reduction.'),
      item('iatf-6-1-2-3', '6.1.2.3', 'Is a contingency plan in place for equipment, utility, IT, labour and supply interruptions, and is it tested?', 'Look at: Contingency plan covering the list in IATF; last test or real activation record.'),
    ]),
    sec('Support', '7', [
      item('iatf-7-1-5-1-1', '7.1.5.1.1', 'Is MSA performed for measurement systems used on special characteristics?', 'Look at: Latest GR&R / bias study versus the gauge on the line.'),
      item('iatf-7-2-3', '7.2.3', 'Are internal auditors competent to IATF, core tools and customer requirements?', 'Look at: Auditor qualification files and the last process audit they led.'),
      item('iatf-7-3-2', '7.3.2', 'Is employee motivation and empowerment for quality visible on the shop floor?', 'Look at: Suggestion / andon / layered audit participation, not a poster only.'),
    ]),
    sec('Operation', '8', [
      item('iatf-8-3-2-3', '8.3.2.3', 'Is embedded software in the product developed under a controlled life-cycle if applicable?', 'Look at: Software development plan or justified N/A for hardware-only parts.'),
      item('iatf-8-3-3-3', '8.3.3.3', 'Are special characteristics identified by the customer and the organisation and flowed to manufacturing?', 'Look at: SC/CC symbols on drawing, PFMEA, control plan and operator instruction.'),
      item('iatf-8-3-4-4', '8.3.4.4', 'Is product approval (PPAP / PSW) complete before series shipment?', 'Look at: Latest PPAP level, PSW sign-off and any interim approval expiry.'),
      item('iatf-8-4-2-3', '8.4.2.3', 'Are automotive suppliers to ISO 9001 as a minimum, with a development path to IATF where required?', 'Look at: Supplier QMS status list and second-party audit plan.'),
      item('iatf-8-5-1-1', '8.5.1.1', 'Is the control plan a living document aligned to PFMEA and used at the station?', 'Look at: Control plan revision versus the check sheet the operator is filling now.'),
      item('iatf-8-5-1-2', '8.5.1.2', 'Are standardised work instructions at the workstation, current and used?', 'Look at: Instruction revision versus master; operator performing the steps in order.'),
      item('iatf-8-5-1-3', '8.5.1.3', 'Is verification of job set-ups recorded, including first-off after changeover?', 'Look at: Last three set-up verifications for the audited line.'),
      item('iatf-8-5-1-5', '8.5.1.5', 'Is total productive maintenance planned, with critical equipment identified and spare parts defined?', 'Look at: TPM / PM schedule vs actuals; breakdown log feeding the plan.'),
      item('iatf-8-5-1-7', '8.5.1.7', 'Is there a documented process for handling and storage that prevents mix, damage and missed operations?', 'Look at: FIFO, labelled WIP and a recent mix-up investigation if any.'),
      item('iatf-8-6-2', '8.6.2', 'Are layout inspections and functional tests performed at the specified frequency?', 'Look at: Last layout / dimensional report versus control plan frequency.'),
      item('iatf-8-7-1-4', '8.7.1.4', 'Is control of reworked product documented, including inspection after rework?', 'Look at: Rework instruction, authorisation and re-inspection records.'),
    ]),
    sec('Performance & improvement', '9–10', [
      item('iatf-9-1-1-1', '9.1.1.1', 'Is manufacturing process capability monitored for special characteristics?', 'Look at: Live SPC or capability studies (Cpk/Ppk) matching the control plan.'),
      item('iatf-9-2-2-3', '9.2.2.3', 'Are manufacturing process audits conducted on all shifts over the audit cycle?', 'Look at: Process-audit programme covering each manufacturing process.'),
      item('iatf-9-2-2-4', '9.2.2.4', 'Are product audits performed at defined stages of production and delivery?', 'Look at: Dock / in-process product audit records with findings closed.'),
      item('iatf-10-2-3', '10.2.3', 'Is problem solving (8D or equivalent) used for customer and internal issues, with documented effectiveness?', 'Look at: Open 8Ds versus customer portal; D6/D7 evidence, not D3 containment only.'),
      item('iatf-10-2-4', '10.2.4', 'Is error-proofing tested periodically where it protects special characteristics?', 'Look at: Poka-yoke challenge records on the audited line.'),
    ]),
  ],

  'VDA 6.3 process audit': [
    sec('P2 Project management', 'P2', [
      item('vda-p2-1', 'P2.1', 'Is the project organised with responsibilities, schedule and resources through SOP?', 'Look at: Project charter, timeline vs actual gates, named project leader.'),
      item('vda-p2-2', 'P2.2', 'Are project risks and open issues tracked to closure before each gate?', 'Look at: Open-issue list at the last gate review; go/no-go record.'),
      item('vda-p2-3', 'P2.3', 'Is change during the project evaluated for quality, cost and timing impact?', 'Look at: A late drawing or tool change and the updated APQP pack.'),
    ]),
    sec('P3 Planning product & process', 'P3', [
      item('vda-p3-1', 'P3.1', 'Are product requirements complete, including special characteristics and statutory items?', 'Look at: Requirements cascade from customer drawing to DFMEA / PFMEA.'),
      item('vda-p3-2', 'P3.2', 'Is the process designed with PFMEA, flow and control plan before serial tools are frozen?', 'Look at: PFMEA using AP, aligned control plan, process flow.'),
      item('vda-p3-3', 'P3.3', 'Are manufacturing and test equipment specified, capable and available for SOP?', 'Look at: Equipment list with capability / MSA status versus SOP date.'),
      item('vda-p3-4', 'P3.4', 'Is the supply chain for purchased parts qualified before series?', 'Look at: Supplier PPAP status and interim approvals.'),
    ]),
    sec('P4 Implementation', 'P4', [
      item('vda-p4-1', 'P4.1', 'Were prototype and pre-series builds used to prove the process, with lessons closed?', 'Look at: Build reports, dimensional results, open points into serial PFMEA.'),
      item('vda-p4-2', 'P4.2', 'Is personnel trained and released for the serial process before volume?', 'Look at: Training matrix and first-off releases at SOP.'),
      item('vda-p4-3', 'P4.3', 'Is the logistics concept (packaging, labelling, FIFO) proven?', 'Look at: Packaging approval and a trial shipment record.'),
    ]),
    sec('P5 Supplier management', 'P5', [
      item('vda-p5-1', 'P5.1', 'Are purchased parts released against agreed quality and logistics criteria?', 'Look at: Incoming inspection plan and last three lots.'),
      item('vda-p5-2', 'P5.2', 'Are supplier issues escalated with 8D and process audits at the source when needed?', 'Look at: Supplier 8D and second-party audit for a repeat issue.'),
    ]),
    sec('P6 Process analysis / production', 'P6', [
      item('vda-p6-1', 'P6.1', 'Is the 4M (man, machine, material, method) controlled at the audited station?', 'Look at: Standard work, set-up, material ID and trained operator on this shift.'),
      item('vda-p6-2', 'P6.2', 'Are process parameters and product characteristics monitored with reaction plans at the station?', 'Look at: Control plan versus what the operator actually records; reaction plan posted.'),
      item('vda-p6-3', 'P6.3', 'Is material flow protected against mix, missed operations and unidentified WIP?', 'Look at: FIFO, labelled containers, travellers matching the job.'),
      item('vda-p6-4', 'P6.4', 'Are tools, fixtures and gauges identified, maintained and within calibration?', 'Look at: Tool ID, last PM, gauge due date on the fixture in use.'),
      item('vda-p6-5', 'P6.5', 'Is nonconforming product contained immediately, with root cause into the process?', 'Look at: Last NCR from this process and the PFMEA update.'),
      item('vda-p6-6', 'P6.6', 'Are personnel competence and flexibility matching the manning of this shift?', 'Look at: Skills matrix vs who is actually running the job now.'),
    ]),
    sec('P7 Customer care / service', 'P7', [
      item('vda-p7-1', 'P7.1', 'Are customer complaints, field returns and warranty data analysed into process actions?', 'Look at: Last customer complaint 8D and process change evidence.'),
      item('vda-p7-2', 'P7.2', 'Is after-sales / spare-part quality controlled to the same standard as series?', 'Look at: Spare-part identification, shelf life and inspection where applicable.'),
    ]),
  ],

  'AS9100D / EN 9100': [
    sec('Context & regulation', '4', [
      item('as-4-1', '4.1', 'Are aviation / space / defence regulatory and export-control requirements in the QMS scope?', 'Look at: Regulatory matrix (FAA/EASA/ITAR/EAR) and how it is kept current.'),
      item('as-4-3', '4.3', 'Is the QMS scope consistent with the production organisation approval where one exists?', 'Look at: Certificate / POA scope versus actual products on the floor.'),
    ]),
    sec('Support', '7', [
      item('as-7-1-4', '7.1.4', 'Is a FOD prevention programme implemented with tool control and FOD walks?', 'Look at: Shadow boards, FOD walk records, last FOD incident.'),
      item('as-7-5', '7.5', 'Is documented information — including digital product definition — controlled?', 'Look at: Drawing revision at the station versus the released baseline.'),
    ]),
    sec('Operation', '8', [
      item('as-8-1-1', '8.1.1', 'Are key characteristics identified and variation managed (AS9103)?', 'Look at: KC flowdown drawing → PFMEA → control plan → SPC.'),
      item('as-8-1-2', '8.1.2', 'Is configuration management maintaining as-designed versus as-built integrity?', 'Look at: Effectivity of a recent ECO on a serial number.'),
      item('as-8-1-4', '8.1.4', 'Are counterfeit / suspect unapproved parts prevented, especially electronics?', 'Look at: Approved distributor list and incoming authenticity checks.'),
      item('as-8-5-1-2', '8.5.1.2', 'Are special processes NADCAP or customer-approved, with qualified personnel?', 'Look at: Current NADCAP certificate scope versus the process running today.'),
      item('as-fai', 'AS9102', 'Are FAIs completed per AS9102 before first delivery and after qualifying changes?', 'Look at: Last FAI pack — ballooned drawing, full dimensional, material certs.'),
      item('as-8-7', '8.7', 'Is escape containment defined for nonconforming product that may have shipped?', 'Look at: Last escape notification and why detection failed.'),
    ]),
    sec('Performance', '9–10', [
      item('as-9-2', '9.2', 'Do internal audits cover PEAR / process effectiveness, not only clause checklists?', 'Look at: Last process audit with PEAR and overdue findings.'),
      item('as-10-2', '10.2', 'Are corrective actions including human factors where relevant?', 'Look at: Closed NCR/CAPA with cause beyond “operator error”.'),
    ]),
  ],

  'ISO 13485:2016': [
    sec('QMS & risk', '4', [
      item('md-4-1', '4.1', 'Is the QMS mapped to ISO 13485 and the regulations that actually apply (FDA, MDR, MDSAP)?', 'Look at: Quality manual cross-reference and regulatory compliance matrix.'),
      item('md-4-1-2', '4.1.2', 'Is ISO 14971 risk management active across the life cycle, not a file on a shelf?', 'Look at: Risk file for the sampled device; last production/PMS input that changed a control.'),
      item('md-4-2', '4.2', 'Is the medical device file / DMR complete for the product in production?', 'Look at: DMR contents versus the device family on the line.'),
    ]),
    sec('Resource & competence', '6', [
      item('md-6-2', '6.2', 'Is competence defined for work affecting product quality and regulatory compliance?', 'Look at: Training records for operators and for the management representative.'),
    ]),
    sec('Product realisation', '7', [
      item('md-7-1', '7.1', 'Is realisation planning including risk, contamination and installation where applicable?', 'Look at: Quality plan / process validation status for the sampled SKU.'),
      item('md-7-3', '7.3', 'Are design controls complete — inputs, outputs, review, V&V, transfer and change?', 'Look at: DHF sample: design review with independent reviewer; transfer checklist.'),
      item('md-7-4', '7.4', 'Are purchased product and outsourced processes verified, including critical suppliers?', 'Look at: Approved supplier list, incoming records, quality agreement.'),
      item('md-7-5-2', '7.5.2', 'Are sterile / clean processes validated, with environmental monitoring in control?', 'Look at: Sterilisation validation, EM trends, last OOS investigation.'),
      item('md-7-5-3', '7.5.3', 'Is UDI and lot traceability working from material to device (and implant card if required)?', 'Look at: Trace a lot on the floor back to material CoC and forward to shipping.'),
      item('md-7-5-4', '7.5.4', 'Is customer property — including confidential health information — controlled?', 'Look at: Procedure and a recent example if applicable.'),
      item('md-7-6', '7.6', 'Are monitoring and measuring devices calibrated with metrological traceability?', 'Look at: Gauges in use versus calibration certificates and due dates.'),
    ]),
    sec('Measurement & CAPA', '8', [
      item('md-8-2-1', '8.2.1', 'Is feedback including PMS used to update risk and process?', 'Look at: PMS plan and a data point that changed the risk file.'),
      item('md-8-2-2', '8.2.2', 'Are complaints assessed for vigilance / MDR reportability within legal time limits?', 'Look at: Three complaints with documented reportability decisions.'),
      item('md-8-3', '8.3', 'Is nonconforming product identified, investigated and dispositioned, including advisory notices?', 'Look at: NCR log and last FSCA / recall if any.'),
      item('md-8-5', '8.5', 'Does CAPA reach verified effectiveness with data, not a closed ticket?', 'Look at: Three CAPAs from complaint, NCR or audit sources.'),
    ]),
  ],

  'EU MDR 2017/745 readiness': [
    sec('Classification & QMS', 'MDR', [
      item('mdr-1', 'Art. 51', 'Is device classification justified and consistent with the intended purpose?', 'Look at: Classification rationale and intended-purpose statement in the technical file.'),
      item('mdr-2', 'Art. 10', 'Are the general obligations of the manufacturer assigned, including a PRRC?', 'Look at: Named Person Responsible for Regulatory Compliance and their availability.'),
    ]),
    sec('Technical documentation', 'Annex II–III', [
      item('mdr-3', 'GSPR', 'Are General Safety and Performance Requirements evidenced, with justified non-applicables?', 'Look at: GSPR checklist with pointers into the technical file, not ticks only.'),
      item('mdr-4', 'Art. 27', 'Is UDI assigned, labelled and registered as required for the class?', 'Look at: DI/PI on label versus EUDAMED / GUDID status.'),
      item('mdr-5', 'Art. 83–87', 'Are PMS, PMCF and vigilance processes defined and resourced?', 'Look at: PMS plan, PSUR/PMSR schedule, and last serious-incident decision.'),
    ]),
  ],

  'IEC 62304 device software': [
    sec('Software safety', '4', [
      item('sw-4-3', '4.3', 'Is software safety classification (A/B/C) documented and consistent with the risk file?', 'Look at: Classification rationale for the sampled software item.'),
      item('sw-5-1', '5.1', 'Is software development planning complete for the class, including SOUP?', 'Look at: SDP covering tools, standards, and SOUP list.'),
    ]),
    sec('Development', '5', [
      item('sw-5-2', '5.2', 'Are software requirements traced to system requirements and risk controls?', 'Look at: Trace matrix for a safety-related requirement.'),
      item('sw-5-3', '5.3', 'Is architecture documented, including segregation of software items by class?', 'Look at: Architecture diagram and interface definitions.'),
      item('sw-5-5', '5.5', 'Is unit implementation and verification evidenced for class B/C?', 'Look at: Unit test records and code review for a sampled module.'),
      item('sw-5-6', '5.6', 'Are software system tests covering requirements and regression after change?', 'Look at: Last system test report and failed-test disposition.'),
    ]),
    sec('Maintenance & problems', '6–9', [
      item('sw-6', '6', 'Is software maintenance planned, with re-release and regression control?', 'Look at: Last patch / bug-fix record and updated risk evaluation.'),
      item('sw-8', '8', 'Is configuration management identifying software items, versions and SOUP?', 'Look at: CM baseline for the released version.'),
      item('sw-9', '9', 'Is problem resolution feeding CAPA and, where required, field action?', 'Look at: Open software anomalies versus released version.'),
    ]),
  ],

  'Machinery CE conformity': [
    sec('Legal framework', '2006/42/EC', [
      item('ce-1', 'Art. 5', 'Is the machine placed on the market with an EU Declaration of Conformity and CE marking?', 'Look at: DoC matching the actual machine serial, directives and standards listed.'),
      item('ce-2', 'Art. 12', 'Is the conformity assessment procedure correct for the annex-IV status of the machine?', 'Look at: Annex IV check; notified-body involvement if required.'),
    ]),
    sec('Risk & EHSR', 'Annex I', [
      item('ce-3', 'I.1', 'Is a machinery risk assessment (ISO 12100) complete, with residual risk communicated?', 'Look at: Risk assessment revision, hazards closed or residual risk in the IFU.'),
      item('ce-4', 'I.1.2', 'Are guards, interlocks and emergency stops matching the assessed hazards?', 'Look at: Physical guards vs drawings; interlock function test records.'),
      item('ce-5', 'I.1.3', 'Are materials and fluids compatible with intended use, including food/medical if claimed?', 'Look at: Material certificates where product-contact is claimed.'),
      item('ce-6', 'I.1.5', 'Are electrical, pneumatic and hydraulic energy sources isolated and identified?', 'Look at: LOTO points on the machine versus the user manual.'),
      item('ce-7', 'I.1.7', 'Are warnings, markings and the instruction handbook in the language of the user?', 'Look at: Plate, residual-risk warnings, and IFU language.'),
    ]),
    sec('Technical file', 'Annex VII', [
      item('ce-8', 'VII.A', 'Is the technical file assembled and retrievable for 10 years after the last unit?', 'Look at: File index: drawings, calculations, standards, test reports, DoC draft.'),
      item('ce-9', 'I.1.5.1', 'Is electrical equipment assessed (e.g. IEC 60204-1) with test records?', 'Look at: Electrical test / high-pot / earth continuity where applicable.'),
      item('ce-10', 'Noise', 'Are noise and, where relevant, vibration declared from measurements, not estimates only?', 'Look at: Test report supporting the declared values on the DoC / IFU.'),
      item('ce-11', 'Change', 'Are design changes re-assessed before the DoC is reused?', 'Look at: A recent design change and whether the file / DoC was updated.'),
    ]),
  ],

  'ISO 3834 welding quality': [
    sec('Welding coordination', '7', [
      item('w-7-1', '7.1', 'Is a welding coordinator appointed with competence matching ISO 14731 / the part’s criticality?', 'Look at: Appointment letter, CV, and decisions they signed off last month.'),
      item('w-7-2', '7.2', 'Are welders and operators qualified for the processes and materials in production now?', 'Look at: WPQ versus the WPS on the job card; 6-month continuity.'),
    ]),
    sec('WPS & production', '10–12', [
      item('w-10', '10', 'Are WPS supported by PQR and used as written at the booth?', 'Look at: WPS at the station versus parameters actually set on the machine.'),
      item('w-11', '11', 'Is batch/heat traceability maintained from parent material to completed weld?', 'Look at: Traveller, heat numbers and weld map for a sampled assembly.'),
      item('w-12', '12', 'Are welding consumables stored, identified and issued under control?', 'Look at: Bake / hold ovens, issue log, and expired-lot control.'),
    ]),
    sec('Inspection', '13–14', [
      item('w-13', '13', 'Is inspection (visual and NDT as specified) performed by qualified people to written procedures?', 'Look at: NDT certs, procedure, and last report tied to serial/heat.'),
      item('w-14', '14', 'Are nonconforming welds repaired under a qualified procedure and re-inspected?', 'Look at: Repair WPS, NCR and re-inspection of a recent repair.'),
    ]),
  ],

  'Special process control': [
    sec('Process qualification', '8.5', [
      item('sp-1', '8.5.1', 'Is the special process qualified (CQI / NADCAP / customer) for the exact commodity and parameters in use?', 'Look at: Certificate / CQI assessment scope versus the bath, furnace or NDT method running now.'),
      item('sp-2', '8.5.1', 'Are process parameters defined, recorded and alarmed when they leave the window?', 'Look at: Recorder charts / PLC logs for the last lot; out-of-window reaction.'),
    ]),
    sec('People & product', '7–8', [
      item('sp-3', '7.2', 'Are operators and inspectors qualified, with continuity for the method?', 'Look at: Qualification cards vs who processed the last lot.'),
      item('sp-4', '8.6', 'Is product released only after required tests (hardness, thickness, NDT, adhesion) pass?', 'Look at: Last three lots — test results before ship, not after.'),
      item('sp-5', '8.5.2', 'Are nonconforming loads contained, reprocessed under control, and fed back to the process?', 'Look at: Last rejected load, reprocess instruction and PFMEA/CQI action.'),
    ]),
  ],

  'Company-wide departmental audit': [
    sec('Quality', 'Q', [
      item('dep-q-1', 'Q.1', 'Is document control working in this department — current procedures at the point of use?', 'Look at: Local copies versus master list; last change communication.'),
      item('dep-q-2', 'Q.2', 'Are departmental KPIs defined, reviewed and acted on?', 'Look at: Last meeting minutes with red KPIs and owners.'),
      item('dep-q-3', 'Q.3', 'Are internal audits, NCR and CAPA visible to this department’s manager?', 'Look at: Open findings assigned here and overdue ageing.'),
      item('dep-q-4', 'Q.4', 'Is customer / next-process feedback used in this department?', 'Look at: Last complaint or internal reject attributed to this function.'),
    ]),
    sec('Production', 'P', [
      item('dep-p-1', 'P.1', 'Is standardised work followed on the sampled jobs this shift?', 'Look at: Instruction versus observed sequence; first-off record.'),
      item('dep-p-2', 'P.2', 'Are 4M changes (man, machine, material, method) recorded before they affect product?', 'Look at: 4M change log for the last week.'),
      item('dep-p-3', 'P.3', 'Is identification and traceability intact at this workplace?', 'Look at: WIP labels, travellers, and a lot you can trace one step back and forward.'),
      item('dep-p-4', 'P.4', 'Are start-up, in-process and last-off checks completed as specified?', 'Look at: Today’s check sheets versus control plan.'),
    ]),
    sec('Incoming & warehouse', 'W', [
      item('dep-w-1', 'W.1', 'Is incoming product verified against the inspection plan before release to production?', 'Look at: Last three lots — skip-lot logic if used, and on-hold cages.'),
      item('dep-w-2', 'W.2', 'Are storage conditions, FIFO and shelf life controlled?', 'Look at: Oldest lot in a bin versus receipt date; temperature log if required.'),
      item('dep-w-3', 'W.3', 'Is mixed / unidentified material impossible in normal flow?', 'Look at: Unlabelled containers; quarantine vs free stock.'),
    ]),
    sec('Purchasing', 'B', [
      item('dep-b-1', 'B.1', 'Are only approved suppliers used for production material?', 'Look at: Last POs versus AVL; a new supplier’s qualification file.'),
      item('dep-b-2', 'B.2', 'Are quality requirements (specs, PPAP, certificates) on the purchase information?', 'Look at: A live PO versus the drawing / CSR.'),
      item('dep-b-3', 'B.3', 'Is supplier performance reviewed with actions when PPM or OTIF fails?', 'Look at: Last scorecard and development plan.'),
    ]),
    sec('People', 'H', [
      item('dep-h-1', 'H.1', 'Are people on this shift competent and authorised for the jobs they are doing?', 'Look at: Skills matrix versus names on the line now.'),
      item('dep-h-2', 'H.2', 'Are temporary and new employees under defined supervision until released?', 'Look at: Induction / buddy records for the newest operator.'),
      item('dep-h-3', 'H.3', 'Are statutory working-time and qualification records complete?', 'Look at: Licences for special processes / trucks / pressure equipment.'),
    ]),
    sec('Maintenance', 'M', [
      item('dep-m-1', 'M.1', 'Is planned maintenance executed on critical equipment, with breakdowns analysed?', 'Look at: PM compliance and last breakdown on the audited asset.'),
      item('dep-m-2', 'M.2', 'Are spare parts for bottleneck equipment defined and available?', 'Look at: Min/max list versus stores quantity.'),
      item('dep-m-3', 'M.3', 'Is release to production after maintenance documented (clean, set-up, first-off)?', 'Look at: Last intervention handover sheet.'),
    ]),
    sec('HSE', 'S', [
      item('dep-s-1', 'S.1', 'Are workplace risks assessed and controls in place for the tasks observed?', 'Look at: Task risk assessment and PPE actually worn.'),
      item('dep-s-2', 'S.2', 'Are incidents and near misses recorded and used to change the process?', 'Look at: Last incident and the physical change that followed.'),
      item('dep-s-3', 'S.3', 'Are environmental permits, waste and emissions under control where they apply?', 'Look at: Waste consignment notes / emissions log for this site.'),
    ]),
  ],

  'Social & environmental due diligence': [
    sec('Policy', '1', [
      item('esg-1', '1.1', 'Is a written human-rights and environmental policy approved by top management and communicated to suppliers?', 'Look at: Signed policy, date, and how it is sent to the supply base.'),
    ]),
    sec('Labour', '2', [
      item('esg-2', '2.1', 'Is child labour, forced labour and excessive working time controlled with records, including agencies?', 'Look at: Age-check files, hours records, and agency contracts.'),
      item('esg-3', '2.2', 'Are wages, social insurance and freedom of association consistent with law and the policy?', 'Look at: Payslip sample versus contract; worker-interview corridor.'),
    ]),
    sec('Environment', '3', [
      item('esg-4', '3.1', 'Are significant environmental aspects identified, with permits and monitoring current?', 'Look at: Aspect register, permit, last monitoring report.'),
    ]),
    sec('Supply chain', '4', [
      item('esg-5', '4.1', 'Is supply-chain due diligence risk-based (LkSG / CSDDD style), with action on high-risk suppliers?', 'Look at: Risk mapping, questionnaires, and a blocked or developed supplier.'),
      item('esg-6', '4.2', 'Is a grievance channel available to workers and suppliers, with cases logged and closed?', 'Look at: Channel poster, last three cases, retaliation check.'),
    ]),
  ],
}

export function fieldQuestionnaireForName(name) {
  if (FIELD_QUESTIONNAIRES[name]) return FIELD_QUESTIONNAIRES[name]
  const aliases = {
    'AS9100 Rev D': 'AS9100D / EN 9100',
    'EN 9100': 'AS9100D / EN 9100',
    'VDA 6.3': 'VDA 6.3 process audit',
    NADCAP: 'Special process control',
  }
  const mapped = aliases[name]
  return mapped ? FIELD_QUESTIONNAIRES[mapped] : null
}
