import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import './SystemManagement.css'

/* ═══════════════════════════════════════════════════════════════
   FULL DATA MODEL — every system has:
   { title, badge, subtitle, color, tabs: [{ id, label }], content }
   content is keyed by tab-id and returns JSX
   ═══════════════════════════════════════════════════════════════ */

const SYSTEMS = {
  /* ───────────────── ASES / SES ─────────────────────────────── */
  'ases-ses': {
    title: 'ASES / SES',
    badge: 'Supplier Evaluation',
    subtitle: 'Alliance Supplier Evaluation Standard — structured supplier self-assessment and qualification framework',
    color: '#0b5394',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'requirements', label: 'Requirements' },
      { id: 'scoring', label: 'Scoring & Criteria' },
      { id: 'process', label: 'Process Steps' },
      { id: 'checklist', label: 'Audit Checklist' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">What is ASES / SES?</h3>
          <p className="smp-text">The <strong>Alliance Supplier Evaluation Standard (ASES)</strong>, also known as <strong>Supplier Evaluation System (SES)</strong>, is a comprehensive framework developed by the Renault-Nissan-Mitsubishi Alliance for evaluating and qualifying suppliers. It assesses supplier capabilities across quality, logistics, management, and engineering to ensure they meet the rigorous standards required for automotive production.</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">6</span><span className="smp-kpi-label">Assessment Domains</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">200+</span><span className="smp-kpi-label">Evaluation Criteria</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">A–D</span><span className="smp-kpi-label">Rating Scale</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">Annual</span><span className="smp-kpi-label">Re-evaluation</span></div>
          </div>
          <h3 className="smp-section-title">Key Objectives</h3>
          <ul className="smp-list">
            <li>Standardize supplier evaluation across all alliance plants globally</li>
            <li>Identify supplier strengths, weaknesses and improvement opportunities</li>
            <li>Ensure supply chain resilience and continuous improvement</li>
            <li>Minimize quality, delivery and cost risks before SOP</li>
            <li>Provide a clear roadmap for supplier development</li>
          </ul>
          <h3 className="smp-section-title">Rating Levels</h3>
          <table className="smp-table"><thead><tr><th>Grade</th><th>Status</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><span className="smp-badge" style={{background:'#27ae60'}}>A</span></td><td>Approved</td><td>Meets all requirements — full production allowed</td></tr>
              <tr><td><span className="smp-badge" style={{background:'#f39c12'}}>B</span></td><td>Conditional</td><td>Minor gaps — approved with improvement plan</td></tr>
              <tr><td><span className="smp-badge" style={{background:'#e67e22'}}>C</span></td><td>Restricted</td><td>Significant gaps — limited sourcing, mandatory improvements</td></tr>
              <tr><td><span className="smp-badge" style={{background:'#e74c3c'}}>D</span></td><td>Rejected</td><td>Critical failures — sourcing not permitted</td></tr>
            </tbody>
          </table>
        </>
      ),
      requirements: () => (
        <>
          <h3 className="smp-section-title">Assessment Domains</h3>
          {[
            { domain: '1. Management & Strategy', items: ['Top management commitment to quality', 'Business continuity planning (BCP)', 'Corporate social responsibility (CSR)', 'Risk management framework', 'Strategic alignment with customer objectives'] },
            { domain: '2. Quality System', items: ['IATF 16949 / ISO 9001 certification', 'Internal audit program', 'Non-conformance management (NCR)', 'Corrective & preventive actions (CAPA)', 'Customer complaints management', 'Change management process'] },
            { domain: '3. Process & Manufacturing', items: ['Process FMEA implementation', 'Control plan coverage', 'Statistical Process Control (SPC)', 'Measurement System Analysis (MSA)', 'Equipment maintenance (TPM)', 'Work instructions and standard work'] },
            { domain: '4. Logistics & Delivery', items: ['On-time delivery performance (≥98%)', 'Packaging specifications compliance', 'Traceability system (lot/batch)', 'FIFO management', 'Emergency response procedures', 'Capacity planning and management'] },
            { domain: '5. Engineering & Development', items: ['APQP implementation', 'PPAP submission completeness', 'Design FMEA', 'Prototype capability', 'Testing and validation facilities', 'Engineering change management'] },
            { domain: '6. Environment & Safety', items: ['ISO 14001 certification', 'Environmental compliance', 'Hazardous substance management (IMDS/GADSL)', 'Workplace safety (ISO 45001)', 'Fire prevention and emergency plans'] },
          ].map((d, i) => (
            <div key={i} className="smp-req-block">
              <h4 className="smp-req-domain">{d.domain}</h4>
              <ul className="smp-list">{d.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
            </div>
          ))}
        </>
      ),
      scoring: () => (
        <>
          <h3 className="smp-section-title">Scoring Methodology</h3>
          <p className="smp-text">Each criterion is scored on a 0–10 scale. Domain scores are weighted averages. Final grade is determined by the lowest domain score combined with critical criteria.</p>
          <table className="smp-table"><thead><tr><th>Domain</th><th>Weight</th><th>Min. to pass</th></tr></thead>
            <tbody>
              <tr><td>Management & Strategy</td><td>15%</td><td>60%</td></tr>
              <tr><td>Quality System</td><td>25%</td><td>70%</td></tr>
              <tr><td>Process & Manufacturing</td><td>25%</td><td>70%</td></tr>
              <tr><td>Logistics & Delivery</td><td>15%</td><td>65%</td></tr>
              <tr><td>Engineering & Development</td><td>10%</td><td>60%</td></tr>
              <tr><td>Environment & Safety</td><td>10%</td><td>60%</td></tr>
            </tbody>
          </table>
          <h3 className="smp-section-title">Critical Criteria (Auto-fail)</h3>
          <ul className="smp-list">
            <li>No quality management system certification (IATF 16949 or equivalent)</li>
            <li>No traceability system in place</li>
            <li>Critical safety or environmental violations</li>
            <li>Delivery performance below 90% in last 6 months</li>
            <li>No corrective action system</li>
          </ul>
        </>
      ),
      process: () => (
        <>
          <h3 className="smp-section-title">ASES Evaluation Process</h3>
          <div className="smp-steps">
            {[
              { step: 1, title: 'Supplier Self-Assessment', desc: 'Supplier completes the ASES questionnaire covering all 6 domains. Evidence documents are uploaded to the supplier portal.' },
              { step: 2, title: 'Document Review', desc: 'SQA team reviews submitted documentation, certifications, and evidence for completeness and validity.' },
              { step: 3, title: 'On-Site Audit', desc: 'Cross-functional audit team visits the supplier facility. Interviews, process observations, and record reviews are conducted.' },
              { step: 4, title: 'Scoring & Report', desc: 'Auditors score each criterion. Domain scores and overall grade are calculated. Audit report with findings is generated.' },
              { step: 5, title: 'Improvement Plan', desc: 'For grades B/C: supplier develops a corrective action plan with timelines. Critical items must be addressed within 30 days.' },
              { step: 6, title: 'Follow-up & Re-evaluation', desc: 'Progress is tracked monthly. Full re-evaluation after 6–12 months or upon completion of the improvement plan.' },
            ].map((s) => (
              <div key={s.step} className="smp-step-card">
                <div className="smp-step-num">{s.step}</div>
                <div><h4 className="smp-step-title">{s.title}</h4><p className="smp-text">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      ),
      checklist: () => (
        <>
          <h3 className="smp-section-title">ASES Audit Checklist Summary</h3>
          <table className="smp-table smp-table-compact"><thead><tr><th>#</th><th>Item</th><th>Evidence Required</th><th>Score (0-10)</th></tr></thead>
            <tbody>
              {[
                ['1.1', 'Quality policy deployed and understood', 'Policy document, interview records'],
                ['1.2', 'Business continuity plan', 'BCP document, test records'],
                ['2.1', 'IATF 16949 / ISO 9001 certificate valid', 'Certificate copy'],
                ['2.2', 'Internal audit schedule and results', 'Audit plan, reports'],
                ['2.3', 'Customer complaint tracking (0 km & field)', 'Complaint log, 8D reports'],
                ['3.1', 'Process FMEA covers all critical processes', 'PFMEA documents'],
                ['3.2', 'Control plan matches PFMEA', 'Control plan vs PFMEA cross-ref'],
                ['3.3', 'SPC on critical characteristics', 'Control charts, Cpk records'],
                ['3.4', 'MSA completed for key gauges', 'MSA study reports (GR&R)'],
                ['4.1', 'OTD ≥ 98% over last 12 months', 'Delivery scorecards'],
                ['4.2', 'Packaging spec compliance', 'Packaging specs, inspection records'],
                ['5.1', 'PPAP Level 3 submissions complete', 'PSW, dimensional, material reports'],
                ['6.1', 'ISO 14001 certification', 'Certificate copy'],
                ['6.2', 'IMDS/GADSL compliance', 'Material declarations'],
              ].map((r, i) => (
                <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td className="smp-score-cell">—</td></tr>
              ))}
            </tbody>
          </table>
        </>
      ),
    },
  },

  /* ───────────────── STF ────────────────────────────────────── */
  'stf': {
    title: 'STF (Supplier Technical File)',
    badge: 'Technical File',
    subtitle: 'Standardized dossier of technical deliverables, process validation, and quality evidence required before production approval',
    color: '#134f5c',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'contents', label: 'File Contents' },
      { id: 'ppap', label: 'PPAP Levels' },
      { id: 'process', label: 'Submission Process' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">What is the Supplier Technical File?</h3>
          <p className="smp-text">The <strong>STF</strong> is a comprehensive package of technical documents that a supplier must prepare and submit to the customer before series production begins. It serves as evidence that the supplier's processes are capable, validated, and controlled. It is closely aligned with PPAP (Production Part Approval Process) requirements.</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">18</span><span className="smp-kpi-label">Required Elements</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">5</span><span className="smp-kpi-label">PPAP Levels</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">PSW</span><span className="smp-kpi-label">Final Warrant</span></div>
          </div>
          <h3 className="smp-section-title">Key Objectives</h3>
          <ul className="smp-list">
            <li>Demonstrate process capability and readiness for mass production</li>
            <li>Provide traceability of materials, processes and test results</li>
            <li>Document all design records, specifications and engineering changes</li>
            <li>Ensure measurement systems are adequate and validated</li>
            <li>Obtain formal customer approval (PSW — Part Submission Warrant)</li>
          </ul>
        </>
      ),
      contents: () => (
        <>
          <h3 className="smp-section-title">STF / PPAP Elements</h3>
          <table className="smp-table"><thead><tr><th>#</th><th>Element</th><th>Description</th></tr></thead>
            <tbody>
              {[
                ['1', 'Design Records', 'Customer-approved part drawings, CAD data, specifications'],
                ['2', 'Engineering Change Documents', 'All ECNs incorporated and approved'],
                ['3', 'Customer Engineering Approval', 'Evidence of customer sign-off on design'],
                ['4', 'Design FMEA', 'Risk analysis for product design (if design-responsible)'],
                ['5', 'Process Flow Diagram', 'Complete manufacturing process sequence'],
                ['6', 'Process FMEA', 'Risk analysis for manufacturing processes'],
                ['7', 'Control Plan', 'Inspection and control methods for all characteristics'],
                ['8', 'Measurement System Analysis (MSA)', 'GR&R, bias, linearity, stability studies'],
                ['9', 'Dimensional Results', 'Full layout inspection of sample parts'],
                ['10', 'Material & Performance Test Results', 'Chemical, physical, functional tests'],
                ['11', 'Initial Process Studies (SPC)', 'Cpk/Ppk ≥ 1.67 for critical, ≥ 1.33 for significant'],
                ['12', 'Qualified Laboratory Documentation', 'Lab accreditation / scope'],
                ['13', 'Appearance Approval Report (AAR)', 'Color, grain, texture approval (if applicable)'],
                ['14', 'Sample Production Parts', 'Parts from significant production run'],
                ['15', 'Master Sample', 'Customer-approved reference part'],
                ['16', 'Checking Aids', 'Fixtures, gauges, templates used for inspection'],
                ['17', 'Customer-Specific Requirements', 'Any additional OEM requirements'],
                ['18', 'Part Submission Warrant (PSW)', 'Summary document with submission declaration'],
              ].map((r, i) => <tr key={i}><td>{r[0]}</td><td><strong>{r[1]}</strong></td><td>{r[2]}</td></tr>)}
            </tbody>
          </table>
        </>
      ),
      ppap: () => (
        <>
          <h3 className="smp-section-title">PPAP Submission Levels</h3>
          <table className="smp-table"><thead><tr><th>Level</th><th>Description</th><th>What to Submit</th></tr></thead>
            <tbody>
              <tr><td><strong>Level 1</strong></td><td>Warrant only</td><td>PSW submitted to customer</td></tr>
              <tr><td><strong>Level 2</strong></td><td>Warrant with samples</td><td>PSW + limited supporting data + product samples</td></tr>
              <tr><td><strong>Level 3</strong></td><td>Warrant with full data</td><td>PSW + all 18 elements + product samples (default level)</td></tr>
              <tr><td><strong>Level 4</strong></td><td>Per customer direction</td><td>PSW + specific elements as requested</td></tr>
              <tr><td><strong>Level 5</strong></td><td>Full package at supplier</td><td>PSW + all 18 elements available for review at supplier site</td></tr>
            </tbody>
          </table>
          <h3 className="smp-section-title">Submission Status Codes</h3>
          <ul className="smp-list">
            <li><strong>Full Approval</strong> — Part meets all requirements, authorized for production</li>
            <li><strong>Interim Approval</strong> — Temporary approval with a time/quantity limit and action plan</li>
            <li><strong>Rejected</strong> — Does not meet requirements, re-submission required</li>
          </ul>
        </>
      ),
      process: () => (
        <>
          <h3 className="smp-section-title">STF Submission Process</h3>
          <div className="smp-steps">
            {[
              { step: 1, title: 'Pre-Launch Planning', desc: 'Review customer requirements, determine PPAP level, identify all required documents and samples.' },
              { step: 2, title: 'Significant Production Run', desc: 'Produce parts under series conditions (min. 300 pcs or 1 shift). Collect all process data, SPC, and samples.' },
              { step: 3, title: 'Document Preparation', desc: 'Compile all 18 PPAP elements. Verify dimensional results, test reports, and process capability.' },
              { step: 4, title: 'Internal Review', desc: 'Cross-functional team reviews the package for completeness and accuracy before submission.' },
              { step: 5, title: 'Customer Submission', desc: 'Submit STF package via customer portal. Include PSW, samples, and all required evidence.' },
              { step: 6, title: 'Customer Decision', desc: 'Customer reviews, may request clarification. Outcome: Full Approval, Interim Approval, or Rejection.' },
            ].map((s) => (
              <div key={s.step} className="smp-step-card">
                <div className="smp-step-num">{s.step}</div>
                <div><h4 className="smp-step-title">{s.title}</h4><p className="smp-text">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      ),
    },
  },

  /* ───────────────── MONOZUKURI ──────────────────────────────── */
  'monozukuri': {
    title: 'Monozukuri',
    badge: 'Manufacturing Excellence',
    subtitle: 'Japanese philosophy of craftsmanship — the art and science of making things with mastery of process, people, and product',
    color: '#7f6000',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'pillars', label: 'Core Pillars' },
      { id: 'assessment', label: 'Assessment Criteria' },
      { id: 'implementation', label: 'Implementation' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">What is Monozukuri?</h3>
          <p className="smp-text"><strong>Monozukuri (ものづくり)</strong> literally means "the art of making things." In the automotive and manufacturing industry, it represents a holistic approach to production excellence that goes beyond simple manufacturing. It encompasses the spirit of craftsmanship, the relentless pursuit of perfection, and the deep respect for the process of creation.</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">5</span><span className="smp-kpi-label">Core Pillars</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">人</span><span className="smp-kpi-label">People First</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">改善</span><span className="smp-kpi-label">Continuous</span></div>
          </div>
          <h3 className="smp-section-title">Philosophy</h3>
          <ul className="smp-list">
            <li><strong>Genchi Genbutsu (現地現物)</strong> — Go and see the actual place, observe the real thing</li>
            <li><strong>Hansei (反省)</strong> — Deep reflection and acknowledgement of failures</li>
            <li><strong>Respect for People</strong> — Empowerment, skill development, teamwork</li>
            <li><strong>Challenge</strong> — Set stretch goals and strive beyond current capability</li>
            <li><strong>Kaizen Spirit</strong> — Every process can be improved, every day</li>
          </ul>
        </>
      ),
      pillars: () => (
        <>
          <h3 className="smp-section-title">Five Pillars of Monozukuri</h3>
          {[
            { pillar: '1. Process Mastery', items: ['Standardized work for every operation', 'Cycle time optimization and line balancing', 'Built-in quality (Jidoka) at each station', 'Visual management and Andon systems', 'Takt time alignment with customer demand'] },
            { pillar: '2. People Development', items: ['Skill matrix and multi-skill training', 'On-the-job training (OJT) programs', 'Team leader development path', 'Suggestion system (Kaizen Teian)', 'Cross-functional rotation programs'] },
            { pillar: '3. Product Excellence', items: ['Design for Manufacturing (DFM)', 'Simultaneous Engineering (SE)', 'Robust design methodology (Taguchi)', 'Quality Function Deployment (QFD)', 'Prototype validation processes'] },
            { pillar: '4. Equipment Reliability', items: ['Total Productive Maintenance (TPM)', 'Autonomous maintenance by operators', 'Planned preventive maintenance', 'Quick changeover (SMED)', 'Equipment capability studies (Cmk)'] },
            { pillar: '5. Supply Chain Integration', items: ['Supplier development programs', 'Just-in-Time delivery (JIT)', 'Kanban pull systems', 'Supplier quality management', 'Long-term partnership philosophy'] },
          ].map((p, i) => (
            <div key={i} className="smp-req-block">
              <h4 className="smp-req-domain">{p.pillar}</h4>
              <ul className="smp-list">{p.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
            </div>
          ))}
        </>
      ),
      assessment: () => (
        <>
          <h3 className="smp-section-title">Monozukuri Assessment Criteria</h3>
          <table className="smp-table"><thead><tr><th>Area</th><th>Level 1 — Basic</th><th>Level 3 — Advanced</th><th>Level 5 — World Class</th></tr></thead>
            <tbody>
              <tr><td><strong>Standardized Work</strong></td><td>Documents exist but not followed</td><td>Followed consistently, updated regularly</td><td>Operators own and improve standards daily</td></tr>
              <tr><td><strong>Visual Management</strong></td><td>Some displays present</td><td>Real-time status visible per line</td><td>Full Andon, escalation, digital dashboards</td></tr>
              <tr><td><strong>Problem Solving</strong></td><td>Reactive, firefighting</td><td>Structured 8D/A3, root cause analysis</td><td>Prevention-focused, PDCA embedded in culture</td></tr>
              <tr><td><strong>People Skills</strong></td><td>Single-skill operators</td><td>Multi-skill, rotation in place</td><td>Self-directed teams, mentoring culture</td></tr>
              <tr><td><strong>Equipment</strong></td><td>Breakdown maintenance only</td><td>Planned PM, autonomous checks</td><td>Predictive maintenance, zero breakdowns target</td></tr>
              <tr><td><strong>Quality</strong></td><td>End-of-line inspection</td><td>In-process checks, SPC</td><td>Built-in quality, Poka-Yoke at every station</td></tr>
            </tbody>
          </table>
        </>
      ),
      implementation: () => (
        <>
          <h3 className="smp-section-title">Implementation Roadmap</h3>
          <div className="smp-steps">
            {[
              { step: 1, title: 'Current State Assessment', desc: 'Evaluate current manufacturing maturity across all 5 pillars using the assessment matrix. Identify gaps and priorities.' },
              { step: 2, title: 'Master Plan Development', desc: 'Create a 3-year roadmap with milestones. Assign champions for each pillar. Secure management commitment.' },
              { step: 3, title: 'Model Line Launch', desc: 'Select one production line as the model. Implement all elements: standardized work, visual management, TPM, quality gates.' },
              { step: 4, title: 'People Training', desc: 'Train all operators and leaders on Monozukuri principles. Establish skill matrices and development plans.' },
              { step: 5, title: 'Horizontal Deployment', desc: 'Roll out proven practices from the model line to all production areas. Adapt and improve for each context.' },
              { step: 6, title: 'Sustain & Improve', desc: 'Regular Monozukuri assessments. Benchmark against best-in-class. Continue raising the bar through Kaizen.' },
            ].map((s) => (
              <div key={s.step} className="smp-step-card">
                <div className="smp-step-num">{s.step}</div>
                <div><h4 className="smp-step-title">{s.title}</h4><p className="smp-text">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      ),
    },
  },

  /* ───────────────── KAIZEN ─────────────────────────────────── */
  'kaizen': {
    title: 'Kaizen',
    badge: 'Continuous Improvement',
    subtitle: 'Systematic approach to incremental, continuous improvement involving everyone — from management to the shop floor',
    color: '#cc0000',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'methods', label: 'Methods & Tools' },
      { id: 'events', label: 'Kaizen Events' },
      { id: 'tracking', label: 'Tracking & KPIs' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">What is Kaizen?</h3>
          <p className="smp-text"><strong>Kaizen (改善)</strong> means "change for better." It is a Japanese business philosophy that focuses on continuous improvement of processes, products, and services. In manufacturing, Kaizen involves all employees — from CEO to assembly line workers — and emphasizes small, daily improvements rather than large, radical changes.</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">PDCA</span><span className="smp-kpi-label">Core Cycle</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">7</span><span className="smp-kpi-label">Types of Waste (Muda)</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">∞</span><span className="smp-kpi-label">Ongoing Process</span></div>
          </div>
          <h3 className="smp-section-title">The 7 Wastes (Muda)</h3>
          <table className="smp-table"><thead><tr><th>Waste</th><th>Japanese</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><strong>Overproduction</strong></td><td>作りすぎ</td><td>Producing more than needed or before needed</td></tr>
              <tr><td><strong>Waiting</strong></td><td>手待ち</td><td>Idle time between processes or operations</td></tr>
              <tr><td><strong>Transport</strong></td><td>運搬</td><td>Unnecessary movement of materials or products</td></tr>
              <tr><td><strong>Over-processing</strong></td><td>加工</td><td>Doing more work than required by the customer</td></tr>
              <tr><td><strong>Inventory</strong></td><td>在庫</td><td>Excess raw material, WIP, or finished goods</td></tr>
              <tr><td><strong>Motion</strong></td><td>動作</td><td>Unnecessary movement of people</td></tr>
              <tr><td><strong>Defects</strong></td><td>不良</td><td>Products that require rework or are scrapped</td></tr>
            </tbody>
          </table>
        </>
      ),
      methods: () => (
        <>
          <h3 className="smp-section-title">Kaizen Methods & Tools</h3>
          {[
            { method: 'PDCA Cycle (Plan-Do-Check-Act)', items: ['Plan: Identify problem, analyze root cause, develop solution', 'Do: Implement solution on a small scale', 'Check: Measure results, compare to target', 'Act: Standardize if successful, restart cycle if not'] },
            { method: '5 Whys Analysis', items: ['Ask "Why?" repeatedly (typically 5 times) to find root cause', 'Simple but powerful technique for everyday problems', 'Document the chain of cause-and-effect'] },
            { method: 'Gemba Walk', items: ['Management goes to the actual workplace (Gemba)', 'Observe processes, talk to operators, understand reality', 'Look for waste, safety hazards, improvement opportunities', 'Follow up with actions — not just observation'] },
            { method: 'A3 Report', items: ['One-page problem-solving format on A3-sized paper', 'Background → Current condition → Goal → Root cause → Countermeasures → Plan → Follow-up', 'Forces structured thinking and clear communication'] },
            { method: 'Suggestion System (Kaizen Teian)', items: ['Every employee can submit improvement ideas', 'Ideas are reviewed and implemented quickly', 'Recognition and small rewards for contributions', 'Target: multiple suggestions per employee per year'] },
          ].map((m, i) => (
            <div key={i} className="smp-req-block">
              <h4 className="smp-req-domain">{m.method}</h4>
              <ul className="smp-list">{m.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
            </div>
          ))}
        </>
      ),
      events: () => (
        <>
          <h3 className="smp-section-title">Kaizen Events (Kaizen Blitz)</h3>
          <p className="smp-text">A <strong>Kaizen Event</strong> is an intensive, focused improvement activity lasting 3–5 days. A cross-functional team works full-time on a specific problem or process to achieve rapid, significant improvement.</p>
          <div className="smp-steps">
            {[
              { step: 1, title: 'Preparation (1–2 weeks before)', desc: 'Define scope and objectives. Collect baseline data. Select team members. Arrange logistics (area, materials, management support).' },
              { step: 2, title: 'Day 1 — Training & Current State', desc: 'Train the team on Kaizen principles. Map the current process (Value Stream Map). Identify all wastes and bottlenecks.' },
              { step: 3, title: 'Day 2 — Analysis & Design', desc: 'Root cause analysis. Brainstorm solutions. Design the future state. Prioritize by impact vs effort.' },
              { step: 4, title: 'Day 3–4 — Implementation', desc: 'Physically change the process, layout, or equipment. Create new standard work. Test and adjust.' },
              { step: 5, title: 'Day 5 — Verification & Report-Out', desc: 'Measure results against baseline. Document changes. Present to management. Create 30-day follow-up plan.' },
            ].map((s) => (
              <div key={s.step} className="smp-step-card">
                <div className="smp-step-num">{s.step}</div>
                <div><h4 className="smp-step-title">{s.title}</h4><p className="smp-text">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      ),
      tracking: () => (
        <>
          <h3 className="smp-section-title">Kaizen Tracking KPIs</h3>
          <table className="smp-table"><thead><tr><th>Metric</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><strong>Suggestions per Employee</strong></td><td>≥ 12/year</td><td>Number of Kaizen ideas submitted per person annually</td></tr>
              <tr><td><strong>Implementation Rate</strong></td><td>≥ 80%</td><td>Percentage of submitted ideas actually implemented</td></tr>
              <tr><td><strong>Kaizen Events / Month</strong></td><td>≥ 2</td><td>Number of formal Kaizen events conducted monthly</td></tr>
              <tr><td><strong>Cost Savings</strong></td><td>Tracked</td><td>Monetary value of improvements from Kaizen activities</td></tr>
              <tr><td><strong>Lead Time Reduction</strong></td><td>Tracked</td><td>Reduction in process lead time from Kaizen events</td></tr>
              <tr><td><strong>Safety Improvements</strong></td><td>Tracked</td><td>Near-miss and hazard eliminations from Kaizen</td></tr>
              <tr><td><strong>Quality Improvement</strong></td><td>Tracked</td><td>Defect reduction attributable to Kaizen activities</td></tr>
            </tbody>
          </table>
        </>
      ),
    },
  },

  /* ───────────────── RULE 2-24 ──────────────────────────────── */
  'rule-2-24': {
    title: 'Rule 2-24',
    badge: 'Rapid Response',
    subtitle: '2-hour containment and 24-hour root cause — structured rapid quality response for customer-impacting issues',
    color: '#e65100',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'timeline', label: 'Response Timeline' },
      { id: 'containment', label: 'Containment Actions' },
      { id: 'escalation', label: 'Escalation Matrix' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">What is the 2-24 Rule?</h3>
          <p className="smp-text">The <strong>2-24 Rule</strong> is a mandatory quality response protocol used in automotive manufacturing. When a quality incident is detected — whether at the customer, in transit, or internally — the rule mandates:</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">2h</span><span className="smp-kpi-label">Containment</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">24h</span><span className="smp-kpi-label">Root Cause</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">48h</span><span className="smp-kpi-label">Corrective Action</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">10d</span><span className="smp-kpi-label">Verification</span></div>
          </div>
          <ul className="smp-list">
            <li><strong>Within 2 hours:</strong> Contain the problem — stop suspect material from reaching the customer, sort/quarantine stock, implement interim inspection</li>
            <li><strong>Within 24 hours:</strong> Identify the root cause — use 5 Whys, Ishikawa, or other analysis. Communicate findings to the customer</li>
            <li><strong>Within 48 hours:</strong> Implement corrective actions and update control plans</li>
            <li><strong>Within 10 days:</strong> Verify effectiveness and close the incident</li>
          </ul>
        </>
      ),
      timeline: () => (
        <>
          <h3 className="smp-section-title">Detailed Response Timeline</h3>
          <div className="smp-steps">
            {[
              { step: '0h', title: 'Incident Detection', desc: 'Quality alert received from customer, logistics, or internal detection. Activate the 2-24 protocol. Assign incident owner.' },
              { step: '2h', title: 'Containment Confirmed', desc: '1) Quarantine all suspect lots at customer, in-transit, and in-house. 2) 100% sorting/inspection initiated. 3) Customer notified with initial containment confirmation.' },
              { step: '8h', title: 'Preliminary Analysis', desc: 'Collect defective samples. Begin root cause investigation. Review recent production records, SPC data, and change history.' },
              { step: '24h', title: 'Root Cause Identified', desc: 'Root cause confirmed with evidence. Customer receives formal 24h report with cause, containment status, and planned corrective actions.' },
              { step: '48h', title: 'Corrective Actions Implemented', desc: 'Permanent corrective actions in place. Control plan updated. Operators re-trained. Verification samples produced.' },
              { step: '10d', title: 'Effectiveness Verified', desc: 'Monitor production for 10 days. Confirm zero recurrence. Close incident. Update lessons learned database.' },
            ].map((s) => (
              <div key={s.step} className="smp-step-card">
                <div className="smp-step-num" style={{fontSize:14, width:44}}>{s.step}</div>
                <div><h4 className="smp-step-title">{s.title}</h4><p className="smp-text">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      ),
      containment: () => (
        <>
          <h3 className="smp-section-title">Containment Action Types</h3>
          <table className="smp-table"><thead><tr><th>Type</th><th>Action</th><th>Responsible</th></tr></thead>
            <tbody>
              <tr><td><strong>Customer Stock</strong></td><td>Sort and replace suspect parts at customer warehouse/line side</td><td>Quality + Logistics</td></tr>
              <tr><td><strong>In-Transit</strong></td><td>Hold/recall shipments in transit. Arrange return or sorting at carrier</td><td>Logistics</td></tr>
              <tr><td><strong>Finished Goods</strong></td><td>Quarantine FG warehouse. 100% inspection before release</td><td>Quality + Warehouse</td></tr>
              <tr><td><strong>WIP</strong></td><td>Stop production line if necessary. Sort all WIP at each station</td><td>Production + Quality</td></tr>
              <tr><td><strong>Raw Material</strong></td><td>Quarantine incoming material from suspect lot. Contact sub-supplier</td><td>Purchasing + Quality</td></tr>
              <tr><td><strong>GP12 (Early Production)</strong></td><td>Activate GP12 enhanced inspection station at end of line</td><td>Quality</td></tr>
            </tbody>
          </table>
          <h3 className="smp-section-title">Documentation Required</h3>
          <ul className="smp-list">
            <li>Quality alert notification (internal + customer)</li>
            <li>Containment action log with timestamps</li>
            <li>Sorting results (OK/NOK quantities)</li>
            <li>Photos of defects and containment measures</li>
            <li>Lot/batch traceability records</li>
            <li>Formal 8D report within 10 business days</li>
          </ul>
        </>
      ),
      escalation: () => (
        <>
          <h3 className="smp-section-title">Escalation Matrix</h3>
          <table className="smp-table"><thead><tr><th>Severity</th><th>Criteria</th><th>Escalation Level</th><th>Response Team</th></tr></thead>
            <tbody>
              <tr><td><span className="smp-badge" style={{background:'#f39c12'}}>Minor</span></td><td>Cosmetic defect, no function impact</td><td>Team Leader + Quality Engineer</td><td>Line Quality</td></tr>
              <tr><td><span className="smp-badge" style={{background:'#e67e22'}}>Major</span></td><td>Functional issue, potential line stop at customer</td><td>Quality Manager + Plant Manager</td><td>Cross-functional</td></tr>
              <tr><td><span className="smp-badge" style={{background:'#e74c3c'}}>Critical</span></td><td>Safety risk, recall potential, line stop</td><td>Director + VP Quality</td><td>Task Force</td></tr>
              <tr><td><span className="smp-badge" style={{background:'#8e44ad'}}>Field</span></td><td>Vehicle recall, warranty claim cluster</td><td>CEO + Legal + Corporate Quality</td><td>Crisis Team</td></tr>
            </tbody>
          </table>
        </>
      ),
    },
  },

  /* ───────────────── 4 BOXES (QRQC) ────────────────────────── */
  'four-boxes': {
    title: '4 Boxes (QRQC)',
    badge: 'Quick Response',
    subtitle: 'Quick Response Quality Control — 4-quadrant visual problem-solving methodology for daily quality management',
    color: '#6a329f',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'structure', label: '4-Box Structure' },
      { id: 'levels', label: 'QRQC Levels' },
      { id: 'daily', label: 'Daily Routine' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">What is QRQC / 4 Boxes?</h3>
          <p className="smp-text"><strong>QRQC (Quick Response Quality Control)</strong> is a management methodology for solving quality problems at the point of occurrence with speed and rigor. The <strong>4-Box format</strong> structures the analysis into four quadrants that must be completed on a single sheet for visual management.</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">4</span><span className="smp-kpi-label">Quadrants</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">24h</span><span className="smp-kpi-label">Max Response</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">3</span><span className="smp-kpi-label">QRQC Levels</span></div>
          </div>
          <h3 className="smp-section-title">Core Principles</h3>
          <ul className="smp-list">
            <li><strong>Real Place (Genba)</strong> — Go to where the problem occurred</li>
            <li><strong>Real Part (Genbutsu)</strong> — Examine the actual defective part</li>
            <li><strong>Real Data (Genjitsu)</strong> — Use facts and data, not opinions</li>
            <li><strong>Rapid Response</strong> — Start analysis within the shift</li>
            <li><strong>Logic & Reasoning</strong> — Structured cause-and-effect analysis</li>
          </ul>
        </>
      ),
      structure: () => (
        <>
          <h3 className="smp-section-title">The 4-Box Structure</h3>
          <div className="smp-four-boxes">
            <div className="smp-box" style={{borderColor:'#e74c3c'}}>
              <h4 className="smp-box-title" style={{color:'#e74c3c'}}>Box 1 — Problem Description</h4>
              <ul className="smp-list">
                <li>What is the defect? (with photo/sketch)</li>
                <li>Where was it detected? (station, customer)</li>
                <li>When did it start? (date, shift, lot)</li>
                <li>How many parts affected?</li>
                <li>Who detected it?</li>
                <li>Is/Is Not analysis</li>
              </ul>
            </div>
            <div className="smp-box" style={{borderColor:'#e67e22'}}>
              <h4 className="smp-box-title" style={{color:'#e67e22'}}>Box 2 — Root Cause</h4>
              <ul className="smp-list">
                <li>5-Why analysis (occurrence cause)</li>
                <li>5-Why analysis (escape cause — why not detected)</li>
                <li>Verification: Can the cause reproduce the defect?</li>
                <li>Supporting data and evidence</li>
              </ul>
            </div>
            <div className="smp-box" style={{borderColor:'#27ae60'}}>
              <h4 className="smp-box-title" style={{color:'#27ae60'}}>Box 3 — Corrective Actions</h4>
              <ul className="smp-list">
                <li>Containment actions (immediate)</li>
                <li>Permanent corrective action for occurrence</li>
                <li>Permanent corrective action for escape</li>
                <li>Owner, deadline, status for each action</li>
              </ul>
            </div>
            <div className="smp-box" style={{borderColor:'#2980b9'}}>
              <h4 className="smp-box-title" style={{color:'#2980b9'}}>Box 4 — Learning & Prevention</h4>
              <ul className="smp-list">
                <li>What did we learn?</li>
                <li>Horizontal deployment to similar products/processes</li>
                <li>Updates to PFMEA, Control Plan, Work Instructions</li>
                <li>Effectiveness verification (monitoring period)</li>
              </ul>
            </div>
          </div>
        </>
      ),
      levels: () => (
        <>
          <h3 className="smp-section-title">Three Levels of QRQC</h3>
          <table className="smp-table"><thead><tr><th>Level</th><th>Who</th><th>When</th><th>What</th></tr></thead>
            <tbody>
              <tr><td><strong>Line QRQC</strong></td><td>Team Leader + Operators</td><td>Every shift (at station)</td><td>Detect, contain, start analysis. Use real part, real data on the spot.</td></tr>
              <tr><td><strong>Workshop QRQC</strong></td><td>Supervisor + Quality + Maintenance</td><td>Daily (morning meeting)</td><td>Review unresolved Line QRQC items. Deeper 5-Why analysis. Assign cross-functional actions.</td></tr>
              <tr><td><strong>Plant QRQC</strong></td><td>Plant Manager + All Dept Heads</td><td>Daily or weekly</td><td>Review major issues, customer complaints, escalated items. Resource allocation. Strategic decisions.</td></tr>
            </tbody>
          </table>
          <h3 className="smp-section-title">Escalation Rules</h3>
          <ul className="smp-list">
            <li>If Line QRQC cannot solve within the shift → escalate to Workshop QRQC</li>
            <li>If Workshop QRQC cannot solve within 24h → escalate to Plant QRQC</li>
            <li>Customer complaints always start at Plant QRQC level</li>
            <li>Safety issues always escalate immediately to Plant level</li>
          </ul>
        </>
      ),
      daily: () => (
        <>
          <h3 className="smp-section-title">Daily QRQC Routine</h3>
          <div className="smp-steps">
            {[
              { step: 1, title: 'Shift Start — Line QRQC', desc: 'Team leader reviews yesterday\'s issues at the station board. Checks containment status. Starts new 4-box sheets for any new defects.' },
              { step: 2, title: 'Morning — Workshop QRQC (30 min)', desc: 'Supervisor reviews all line QRQC sheets. Focus on items stuck > 1 shift. Cross-functional discussion on root causes. Assign actions with deadlines.' },
              { step: 3, title: 'Late Morning — Plant QRQC (30 min)', desc: 'Plant manager reviews critical items, customer complaints, delivery issues. Provides resources and decisions for blocked items.' },
              { step: 4, title: 'During Shift — Actions & Verification', desc: 'Responsible persons execute their assigned actions. Quality verifies containment effectiveness. Engineers test corrective actions.' },
              { step: 5, title: 'Shift End — Status Update', desc: 'Update all 4-box sheets with progress. Mark completed actions. Prepare handover notes for next shift. Highlight any new issues.' },
            ].map((s) => (
              <div key={s.step} className="smp-step-card">
                <div className="smp-step-num">{s.step}</div>
                <div><h4 className="smp-step-title">{s.title}</h4><p className="smp-text">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      ),
    },
  },

  /* ───────────────── QMS ────────────────────────────────────── */
  'qms': {
    title: 'Quality Management System',
    badge: 'QMS Framework',
    subtitle: 'Comprehensive framework for managing quality across the organization — policy, objectives, processes, and continuous improvement',
    color: '#1e8449',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'elements', label: 'QMS Elements' },
      { id: 'documentation', label: 'Documentation' },
      { id: 'review', label: 'Management Review' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">Quality Management System Framework</h3>
          <p className="smp-text">A <strong>Quality Management System (QMS)</strong> is a formalized set of policies, processes, procedures, and records that define how an organization creates and delivers products or services. It integrates the various internal processes and provides a process approach for project execution.</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">7</span><span className="smp-kpi-label">Quality Principles</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">10</span><span className="smp-kpi-label">ISO 9001 Clauses</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">PDCA</span><span className="smp-kpi-label">Core Approach</span></div>
          </div>
          <h3 className="smp-section-title">7 Quality Management Principles (ISO 9000)</h3>
          <ol className="smp-list smp-ordered">
            <li><strong>Customer Focus</strong> — Meet and exceed customer expectations</li>
            <li><strong>Leadership</strong> — Establish unity of purpose and direction</li>
            <li><strong>Engagement of People</strong> — Competent, empowered, involved people at all levels</li>
            <li><strong>Process Approach</strong> — Manage activities as interrelated processes</li>
            <li><strong>Improvement</strong> — Ongoing focus on improvement</li>
            <li><strong>Evidence-Based Decision Making</strong> — Decisions based on data and analysis</li>
            <li><strong>Relationship Management</strong> — Manage relationships with interested parties</li>
          </ol>
        </>
      ),
      elements: () => (
        <>
          <h3 className="smp-section-title">Core QMS Elements</h3>
          {[
            { el: 'Quality Policy & Objectives', items: ['Written quality policy signed by top management', 'Measurable quality objectives at all levels', 'Objectives aligned with strategic direction', 'Regular review and update of objectives'] },
            { el: 'Process Management', items: ['Process map / turtle diagram for each key process', 'Input-output, controls, resources defined', 'Process owners assigned', 'Process performance indicators (KPIs)', 'Risk and opportunity assessment per process'] },
            { el: 'Resource Management', items: ['Human resources — competency, training, awareness', 'Infrastructure — facilities, equipment, IT', 'Work environment — temperature, humidity, cleanliness, ESD', 'Monitoring and measuring resources — calibration'] },
            { el: 'Product Realization', items: ['Customer requirements review', 'Design and development (if applicable)', 'Purchasing and supplier management', 'Production and service provision', 'Control of monitoring and measuring equipment'] },
            { el: 'Measurement, Analysis & Improvement', items: ['Customer satisfaction monitoring', 'Internal audits', 'Process monitoring (SPC, quality data)', 'Control of non-conforming product', 'Corrective and preventive actions', 'Data analysis and continual improvement'] },
          ].map((e, i) => (
            <div key={i} className="smp-req-block">
              <h4 className="smp-req-domain">{e.el}</h4>
              <ul className="smp-list">{e.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
            </div>
          ))}
        </>
      ),
      documentation: () => (
        <>
          <h3 className="smp-section-title">QMS Documentation Hierarchy</h3>
          <table className="smp-table"><thead><tr><th>Level</th><th>Document Type</th><th>Purpose</th></tr></thead>
            <tbody>
              <tr><td><strong>Level 1</strong></td><td>Quality Manual</td><td>Describes the QMS scope, policy, and process map</td></tr>
              <tr><td><strong>Level 2</strong></td><td>Procedures</td><td>Define "what, who, when" for key processes</td></tr>
              <tr><td><strong>Level 3</strong></td><td>Work Instructions</td><td>Step-by-step "how to" for specific tasks</td></tr>
              <tr><td><strong>Level 4</strong></td><td>Records & Forms</td><td>Evidence that activities were performed</td></tr>
            </tbody>
          </table>
          <h3 className="smp-section-title">Mandatory Documented Information (ISO 9001:2015)</h3>
          <ul className="smp-list">
            <li>Scope of the QMS</li>
            <li>Quality policy</li>
            <li>Quality objectives</li>
            <li>Criteria for evaluation and selection of suppliers</li>
            <li>Records of monitoring and measurement results</li>
            <li>Internal audit program and results</li>
            <li>Management review output</li>
            <li>Nature of non-conformities and corrective actions</li>
            <li>Calibration records</li>
          </ul>
        </>
      ),
      review: () => (
        <>
          <h3 className="smp-section-title">Management Review Process</h3>
          <p className="smp-text">Management reviews are conducted at planned intervals (typically quarterly or semi-annually) to ensure the QMS remains suitable, adequate, effective, and aligned with strategic direction.</p>
          <h4 className="smp-req-domain">Required Inputs</h4>
          <ul className="smp-list">
            <li>Status of actions from previous reviews</li>
            <li>Changes in external and internal issues</li>
            <li>Quality performance — non-conformities, corrective actions, monitoring results</li>
            <li>Audit results (internal and external)</li>
            <li>Customer satisfaction and feedback</li>
            <li>Supplier performance</li>
            <li>Resource adequacy</li>
            <li>Risk and opportunity actions effectiveness</li>
          </ul>
          <h4 className="smp-req-domain">Required Outputs</h4>
          <ul className="smp-list">
            <li>Improvement opportunities</li>
            <li>Any need for changes to the QMS</li>
            <li>Resource needs</li>
            <li>Action items with responsibilities and deadlines</li>
          </ul>
        </>
      ),
    },
  },

  /* ───────────────── APQP / PPAP ────────────────────────────── */
  'apqp': {
    title: 'APQP / PPAP',
    badge: 'Product Quality',
    subtitle: 'Advanced Product Quality Planning and Production Part Approval Process — structured framework for new product introduction',
    color: '#1a5276',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'phases', label: 'APQP Phases' },
      { id: 'ppap', label: 'PPAP Elements' },
      { id: 'gates', label: 'Quality Gates' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">APQP & PPAP Overview</h3>
          <p className="smp-text"><strong>APQP</strong> is a structured framework for ensuring a product satisfies the customer. It provides a roadmap for developing new products or processes. <strong>PPAP</strong> is the output of APQP — the formal approval package submitted to the customer before series production.</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">5</span><span className="smp-kpi-label">APQP Phases</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">18</span><span className="smp-kpi-label">PPAP Elements</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">PSW</span><span className="smp-kpi-label">Part Warrant</span></div>
          </div>
        </>
      ),
      phases: () => (
        <>
          <h3 className="smp-section-title">Five Phases of APQP</h3>
          <div className="smp-steps">
            {[
              { step: 1, title: 'Plan & Define Program', desc: 'Voice of Customer, business plan, product assumptions, reliability/quality goals, preliminary BOM, preliminary process flow, special characteristics list.' },
              { step: 2, title: 'Product Design & Development', desc: 'Design FMEA, DFM/DFA, design verification, prototype build, engineering drawings, material specifications, design reviews.' },
              { step: 3, title: 'Process Design & Development', desc: 'Process flow diagram, floor plan layout, Process FMEA, control plan (pre-launch), work instructions, MSA plan, SPC plan, packaging specifications.' },
              { step: 4, title: 'Product & Process Validation', desc: 'Significant production run, MSA study, SPC study, PPAP submission, production control plan, quality planning sign-off.' },
              { step: 5, title: 'Feedback, Assessment & Corrective Action', desc: 'Reduced variation, customer satisfaction, delivery and service improvement, lessons learned, best practices documentation.' },
            ].map((s) => (
              <div key={s.step} className="smp-step-card">
                <div className="smp-step-num">{s.step}</div>
                <div><h4 className="smp-step-title">{s.title}</h4><p className="smp-text">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      ),
      ppap: () => (
        <>
          <h3 className="smp-section-title">18 PPAP Elements</h3>
          <table className="smp-table smp-table-compact"><thead><tr><th>#</th><th>Element</th><th>Required for Level 3</th></tr></thead>
            <tbody>
              {[
                ['1','Design Records','Yes'],['2','Engineering Change Documents','Yes'],['3','Customer Engineering Approval','Yes'],
                ['4','Design FMEA','Yes'],['5','Process Flow Diagram','Yes'],['6','Process FMEA','Yes'],
                ['7','Control Plan','Yes'],['8','MSA Studies','Yes'],['9','Dimensional Results','Yes'],
                ['10','Material/Performance Test Results','Yes'],['11','Initial Process Studies','Yes'],['12','Qualified Laboratory Documentation','Yes'],
                ['13','Appearance Approval Report','If applicable'],['14','Sample Production Parts','Yes'],['15','Master Sample','Yes'],
                ['16','Checking Aids','Yes'],['17','Customer-Specific Requirements','Yes'],['18','Part Submission Warrant (PSW)','Yes'],
              ].map((r,i) => <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>)}
            </tbody>
          </table>
        </>
      ),
      gates: () => (
        <>
          <h3 className="smp-section-title">Quality Gate Milestones</h3>
          <table className="smp-table"><thead><tr><th>Gate</th><th>Milestone</th><th>Key Deliverables</th></tr></thead>
            <tbody>
              <tr><td><strong>G0</strong></td><td>Program Kick-off</td><td>Cross-functional team formed, timing plan, initial risk assessment</td></tr>
              <tr><td><strong>G1</strong></td><td>Design Freeze</td><td>Design FMEA, special characteristics, prototype validation</td></tr>
              <tr><td><strong>G2</strong></td><td>Tooling Order</td><td>Process flow, preliminary PFMEA, packaging concept</td></tr>
              <tr><td><strong>G3</strong></td><td>First Off-Tool Parts</td><td>Dimensional OK, material test OK, preliminary Cpk</td></tr>
              <tr><td><strong>G4</strong></td><td>PPAP Submission</td><td>All 18 elements complete, PSW submitted</td></tr>
              <tr><td><strong>G5</strong></td><td>SOP (Start of Production)</td><td>Customer approval received, production control plan active</td></tr>
            </tbody>
          </table>
        </>
      ),
    },
  },

  /* ───────────────── FMEA ───────────────────────────────────── */
  'fmea': {
    title: 'FMEA',
    badge: 'Risk Analysis',
    subtitle: 'Failure Mode and Effects Analysis — systematic risk identification, evaluation, and mitigation for designs and processes',
    color: '#922b21',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'types', label: 'FMEA Types' },
      { id: 'methodology', label: 'Methodology (AIAG-VDA)' },
      { id: 'ratings', label: 'Severity / Occurrence / Detection' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">What is FMEA?</h3>
          <p className="smp-text"><strong>FMEA</strong> is a systematic, proactive method for evaluating a process or product to identify where and how it might fail and to assess the relative impact of different failures. It helps prioritize actions to reduce risk.</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">S×O×D</span><span className="smp-kpi-label">RPN Formula</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">AP</span><span className="smp-kpi-label">Action Priority (New)</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">7</span><span className="smp-kpi-label">Step Process</span></div>
          </div>
        </>
      ),
      types: () => (
        <>
          <h3 className="smp-section-title">Types of FMEA</h3>
          <table className="smp-table"><thead><tr><th>Type</th><th>Scope</th><th>When</th></tr></thead>
            <tbody>
              <tr><td><strong>DFMEA</strong></td><td>Design — product functions, failure modes of design</td><td>During product design phase</td></tr>
              <tr><td><strong>PFMEA</strong></td><td>Process — manufacturing process failures</td><td>During process design phase</td></tr>
              <tr><td><strong>SFMEA</strong></td><td>System — interactions between subsystems</td><td>Early concept phase</td></tr>
              <tr><td><strong>MFMEA</strong></td><td>Machinery/Equipment — equipment failure modes</td><td>Equipment design/procurement</td></tr>
            </tbody>
          </table>
        </>
      ),
      methodology: () => (
        <>
          <h3 className="smp-section-title">AIAG-VDA 7-Step Approach</h3>
          <div className="smp-steps">
            {[
              { step: 1, title: 'Planning & Preparation', desc: 'Define scope, team, timing, and tools. Identify the FMEA project intent.' },
              { step: 2, title: 'Structure Analysis', desc: 'Define the system structure. For PFMEA: process flow with all steps, sub-steps, and 4M elements.' },
              { step: 3, title: 'Function Analysis', desc: 'Identify functions and requirements for each process step. Link to customer requirements.' },
              { step: 4, title: 'Failure Analysis', desc: 'Identify failure modes, effects (at various levels), and causes using cause-and-effect chains.' },
              { step: 5, title: 'Risk Analysis', desc: 'Rate Severity, Occurrence, Detection. Determine Action Priority (AP) using the new AP table (replaces RPN).' },
              { step: 6, title: 'Optimization', desc: 'Define and implement actions to reduce risk. Assign responsibility and timing.' },
              { step: 7, title: 'Results Documentation', desc: 'Re-rate after actions. Document the FMEA as a living document. Communicate results.' },
            ].map((s) => (
              <div key={s.step} className="smp-step-card">
                <div className="smp-step-num">{s.step}</div>
                <div><h4 className="smp-step-title">{s.title}</h4><p className="smp-text">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      ),
      ratings: () => (
        <>
          <h3 className="smp-section-title">Rating Scales (1-10)</h3>
          <table className="smp-table smp-table-compact"><thead><tr><th>Rating</th><th>Severity</th><th>Occurrence</th><th>Detection</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>No effect</td><td>Extremely unlikely</td><td>Almost certain to detect</td></tr>
              <tr><td>2-3</td><td>Minor annoyance</td><td>Remote / Very low</td><td>High detection capability</td></tr>
              <tr><td>4-6</td><td>Moderate effect</td><td>Low / Moderate</td><td>Moderate detection</td></tr>
              <tr><td>7-8</td><td>High / Serious</td><td>High / Repeated</td><td>Low detection capability</td></tr>
              <tr><td>9</td><td>Very high — regulatory</td><td>Very high</td><td>Very remote detection</td></tr>
              <tr><td>10</td><td>Safety / Hazardous</td><td>Inevitable</td><td>No detection possible</td></tr>
            </tbody>
          </table>
          <h3 className="smp-section-title">Action Priority (AP) — AIAG-VDA</h3>
          <table className="smp-table"><thead><tr><th>Priority</th><th>Action</th><th>Criteria</th></tr></thead>
            <tbody>
              <tr><td><span className="smp-badge" style={{background:'#e74c3c'}}>High</span></td><td>Must act — mandatory action</td><td>High severity + high occurrence combinations</td></tr>
              <tr><td><span className="smp-badge" style={{background:'#f39c12'}}>Medium</span></td><td>Should act — action recommended</td><td>Moderate risk combinations</td></tr>
              <tr><td><span className="smp-badge" style={{background:'#27ae60'}}>Low</span></td><td>Could act — optional improvement</td><td>Low risk combinations</td></tr>
            </tbody>
          </table>
        </>
      ),
    },
  },

  /* ───────────────── SPC / MSA ──────────────────────────────── */
  'spc': {
    title: 'SPC / MSA',
    badge: 'Statistical Control',
    subtitle: 'Statistical Process Control and Measurement Systems Analysis — data-driven process monitoring and measurement validation',
    color: '#7d3c98',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'spc-charts', label: 'SPC Charts & Rules' },
      { id: 'capability', label: 'Process Capability' },
      { id: 'msa', label: 'MSA Studies' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">SPC & MSA Overview</h3>
          <p className="smp-text"><strong>SPC</strong> uses statistical methods to monitor and control a process to ensure it operates at its full potential. <strong>MSA</strong> evaluates the measurement system (gauge, operator, method) to ensure it produces reliable data.</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">Cpk</span><span className="smp-kpi-label">Capability Index</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">GR&R</span><span className="smp-kpi-label">Gauge Study</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">≥1.67</span><span className="smp-kpi-label">Cpk Target</span></div>
          </div>
        </>
      ),
      'spc-charts': () => (
        <>
          <h3 className="smp-section-title">Control Chart Types</h3>
          <table className="smp-table"><thead><tr><th>Chart</th><th>Data Type</th><th>Use</th></tr></thead>
            <tbody>
              <tr><td><strong>X̄-R</strong></td><td>Variable (subgroup 2-9)</td><td>Most common — average and range</td></tr>
              <tr><td><strong>X̄-S</strong></td><td>Variable (subgroup ≥10)</td><td>Average and standard deviation</td></tr>
              <tr><td><strong>I-MR</strong></td><td>Variable (individual)</td><td>Individual measurements</td></tr>
              <tr><td><strong>p-chart</strong></td><td>Attribute</td><td>Proportion defective</td></tr>
              <tr><td><strong>np-chart</strong></td><td>Attribute</td><td>Count of defectives (fixed sample)</td></tr>
              <tr><td><strong>c-chart</strong></td><td>Attribute</td><td>Count of defects (fixed area)</td></tr>
              <tr><td><strong>u-chart</strong></td><td>Attribute</td><td>Defects per unit (variable area)</td></tr>
            </tbody>
          </table>
          <h3 className="smp-section-title">Western Electric Rules (Out-of-Control Signals)</h3>
          <ul className="smp-list">
            <li><strong>Rule 1:</strong> One point beyond 3σ</li>
            <li><strong>Rule 2:</strong> 2 of 3 consecutive points beyond 2σ (same side)</li>
            <li><strong>Rule 3:</strong> 4 of 5 consecutive points beyond 1σ (same side)</li>
            <li><strong>Rule 4:</strong> 8 consecutive points on one side of centerline</li>
            <li><strong>Rule 5:</strong> 6 points in a row, all increasing or all decreasing (trend)</li>
            <li><strong>Rule 6:</strong> 15 points in a row within 1σ of centerline (stratification)</li>
          </ul>
        </>
      ),
      capability: () => (
        <>
          <h3 className="smp-section-title">Process Capability Indices</h3>
          <table className="smp-table"><thead><tr><th>Index</th><th>Formula</th><th>Meaning</th></tr></thead>
            <tbody>
              <tr><td><strong>Cp</strong></td><td>(USL - LSL) / 6σ</td><td>Potential capability (spread vs tolerance)</td></tr>
              <tr><td><strong>Cpk</strong></td><td>min(Cpu, Cpl)</td><td>Actual capability (includes centering)</td></tr>
              <tr><td><strong>Pp</strong></td><td>(USL - LSL) / 6s</td><td>Performance (overall variation)</td></tr>
              <tr><td><strong>Ppk</strong></td><td>min(Ppu, Ppl)</td><td>Performance including centering</td></tr>
            </tbody>
          </table>
          <h3 className="smp-section-title">Acceptance Criteria</h3>
          <table className="smp-table"><thead><tr><th>Cpk Value</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td>≥ 1.67</td><td><span className="smp-badge" style={{background:'#27ae60'}}>Capable</span></td><td>Process approved. Regular SPC monitoring.</td></tr>
              <tr><td>1.33 – 1.66</td><td><span className="smp-badge" style={{background:'#f39c12'}}>Acceptable</span></td><td>Approved with enhanced monitoring. Improvement plan required.</td></tr>
              <tr><td>&lt; 1.33</td><td><span className="smp-badge" style={{background:'#e74c3c'}}>Not Capable</span></td><td>100% inspection required. Immediate improvement actions.</td></tr>
            </tbody>
          </table>
        </>
      ),
      msa: () => (
        <>
          <h3 className="smp-section-title">Measurement System Analysis</h3>
          <table className="smp-table"><thead><tr><th>Study</th><th>Purpose</th><th>Acceptance</th></tr></thead>
            <tbody>
              <tr><td><strong>Gauge R&R (Crossed)</strong></td><td>Evaluate repeatability and reproducibility</td><td>%GRR ≤ 10% = OK; 10-30% = Conditional; &gt;30% = Unacceptable</td></tr>
              <tr><td><strong>Bias</strong></td><td>Difference between measured average and reference value</td><td>Bias should be zero or statistically insignificant</td></tr>
              <tr><td><strong>Linearity</strong></td><td>Bias across the operating range</td><td>Linearity line should be flat (slope ≈ 0)</td></tr>
              <tr><td><strong>Stability</strong></td><td>Variation over time</td><td>Control chart of reference part — in control</td></tr>
              <tr><td><strong>Attribute Agreement</strong></td><td>Pass/fail gauge agreement</td><td>Kappa ≥ 0.75 for each appraiser and between appraisers</td></tr>
            </tbody>
          </table>
        </>
      ),
    },
  },

  /* ───────────────── 8D ─────────────────────────────────────── */
  '8d': {
    title: '8D Problem Solving',
    badge: '8 Disciplines',
    subtitle: 'Team-based, structured problem-solving methodology for identifying and eliminating root causes of non-conformities',
    color: '#0e6655',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'disciplines', label: '8 Disciplines' },
      { id: 'template', label: 'Report Template' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">8D Problem Solving</h3>
          <p className="smp-text">The <strong>8D (Eight Disciplines)</strong> method is a systematic approach to problem solving that focuses on team collaboration, root cause identification, and permanent corrective actions. Originally developed by Ford Motor Company, it is now the standard problem-solving format across the automotive industry.</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">8+1</span><span className="smp-kpi-label">Disciplines</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">Team</span><span className="smp-kpi-label">Based Approach</span></div>
          </div>
        </>
      ),
      disciplines: () => (
        <>
          <h3 className="smp-section-title">The 8 Disciplines</h3>
          <div className="smp-steps">
            {[
              { step: 'D0', title: 'Prepare for the 8D Process', desc: 'Evaluate the need for 8D. Collect symptom information. Determine if an Emergency Response Action (ERA) is needed.' },
              { step: 'D1', title: 'Form the Team', desc: 'Assemble a cross-functional team with product/process knowledge. Assign champion, team leader, and members.' },
              { step: 'D2', title: 'Describe the Problem', desc: 'Define the problem in quantifiable terms. Use IS/IS NOT analysis. Who, What, Where, When, How much, How many.' },
              { step: 'D3', title: 'Interim Containment Actions', desc: 'Implement temporary actions to protect the customer. Verify containment effectiveness. Track suspect material.' },
              { step: 'D4', title: 'Root Cause Analysis', desc: 'Identify all possible causes. Use Ishikawa, 5 Whys, Fault Tree. Verify root cause by testing and data. Identify escape point.' },
              { step: 'D5', title: 'Permanent Corrective Actions', desc: 'Choose best corrective actions. Verify they fix the root cause without side effects. Plan implementation.' },
              { step: 'D6', title: 'Implement & Validate', desc: 'Implement permanent corrective actions. Remove containment. Validate effectiveness with data over time.' },
              { step: 'D7', title: 'Prevent Recurrence', desc: 'Update PFMEA, control plan, work instructions. Horizontal deployment to similar products/processes. Systemic changes.' },
              { step: 'D8', title: 'Recognize the Team', desc: 'Acknowledge team efforts. Document lessons learned. Close the 8D report. Share knowledge across the organization.' },
            ].map((s) => (
              <div key={s.step} className="smp-step-card">
                <div className="smp-step-num" style={{fontSize:13, width:40}}>{s.step}</div>
                <div><h4 className="smp-step-title">{s.title}</h4><p className="smp-text">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      ),
      template: () => (
        <>
          <h3 className="smp-section-title">8D Report Template Sections</h3>
          <table className="smp-table"><thead><tr><th>Section</th><th>Required Content</th></tr></thead>
            <tbody>
              <tr><td><strong>Header</strong></td><td>8D number, date opened, customer, part number, part name, problem type</td></tr>
              <tr><td><strong>D1 Team</strong></td><td>Champion, leader, members with roles/departments</td></tr>
              <tr><td><strong>D2 Problem</strong></td><td>Problem statement, IS/IS NOT, photos, quantity affected, timeline</td></tr>
              <tr><td><strong>D3 Containment</strong></td><td>Actions taken, quantities sorted (OK/NOK), customer notification</td></tr>
              <tr><td><strong>D4 Root Cause</strong></td><td>Fishbone diagram, 5-Why for occurrence, 5-Why for escape, verification evidence</td></tr>
              <tr><td><strong>D5-D6 Corrective Actions</strong></td><td>Action description, owner, deadline, implementation date, verification method/results</td></tr>
              <tr><td><strong>D7 Prevention</strong></td><td>PFMEA updates (before/after RPN), control plan changes, similar product deployment list</td></tr>
              <tr><td><strong>D8 Closure</strong></td><td>Effectiveness check (30-60-90 day), lessons learned, team recognition, sign-off</td></tr>
            </tbody>
          </table>
        </>
      ),
    },
  },

  /* ───────────────── LEAN ───────────────────────────────────── */
  'lean': {
    title: 'Lean Manufacturing',
    badge: 'Waste Elimination',
    subtitle: 'Systematic methodology for minimizing waste and maximizing value in manufacturing processes',
    color: '#2c3e50',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'tools', label: 'Lean Tools' },
      { id: 'vsm', label: 'Value Stream Mapping' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">Lean Manufacturing Principles</h3>
          <p className="smp-text"><strong>Lean Manufacturing</strong> focuses on identifying and eliminating waste (Muda) while delivering maximum value to customers. Based on the Toyota Production System (TPS).</p>
          <h3 className="smp-section-title">5 Lean Principles</h3>
          <ol className="smp-list smp-ordered">
            <li><strong>Value</strong> — Define value from the customer's perspective</li>
            <li><strong>Value Stream</strong> — Map all steps, eliminate non-value-adding ones</li>
            <li><strong>Flow</strong> — Make value-creating steps flow smoothly</li>
            <li><strong>Pull</strong> — Produce only what the customer demands</li>
            <li><strong>Perfection</strong> — Continuously strive for perfection</li>
          </ol>
        </>
      ),
      tools: () => (
        <>
          <h3 className="smp-section-title">Lean Tools & Techniques</h3>
          <table className="smp-table"><thead><tr><th>Tool</th><th>Purpose</th></tr></thead>
            <tbody>
              <tr><td><strong>5S</strong></td><td>Workplace organization and standardization</td></tr>
              <tr><td><strong>Kanban</strong></td><td>Visual signaling for pull-based material flow</td></tr>
              <tr><td><strong>SMED</strong></td><td>Quick changeover — reduce setup time to single-digit minutes</td></tr>
              <tr><td><strong>JIT</strong></td><td>Just-in-Time — produce and deliver the right amount at the right time</td></tr>
              <tr><td><strong>Jidoka</strong></td><td>Automation with a human touch — stop and fix problems immediately</td></tr>
              <tr><td><strong>Andon</strong></td><td>Visual management and alert system</td></tr>
              <tr><td><strong>Heijunka</strong></td><td>Production leveling — smooth out volume and mix</td></tr>
              <tr><td><strong>Poka-Yoke</strong></td><td>Error-proofing devices and mechanisms</td></tr>
              <tr><td><strong>Standard Work</strong></td><td>Documented best practice for each operation</td></tr>
              <tr><td><strong>VSM</strong></td><td>Value Stream Mapping — visualize material and information flow</td></tr>
            </tbody>
          </table>
        </>
      ),
      vsm: () => (
        <>
          <h3 className="smp-section-title">Value Stream Mapping Steps</h3>
          <div className="smp-steps">
            {[
              { step: 1, title: 'Select Product Family', desc: 'Choose a product family that shares similar process steps and represents significant volume.' },
              { step: 2, title: 'Draw Current State Map', desc: 'Walk the process from door to door. Record cycle times, changeover times, inventory levels, batch sizes, scrap rates.' },
              { step: 3, title: 'Identify Waste', desc: 'Calculate VA ratio (value-added time / total lead time). Identify the 7 wastes at each process step.' },
              { step: 4, title: 'Design Future State', desc: 'Set takt time. Design continuous flow where possible. Size kanban loops. Plan SMED for bottleneck.' },
              { step: 5, title: 'Create Implementation Plan', desc: 'Break into Kaizen events. Define timing and responsibility. Start with the pacemaker process.' },
            ].map((s) => (
              <div key={s.step} className="smp-step-card">
                <div className="smp-step-num">{s.step}</div>
                <div><h4 className="smp-step-title">{s.title}</h4><p className="smp-text">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      ),
    },
  },

  /* ───────────────── TPM ────────────────────────────────────── */
  'tpm': {
    title: 'TPM',
    badge: 'Total Productive Maintenance',
    subtitle: 'Comprehensive maintenance strategy involving all employees to maximize equipment effectiveness',
    color: '#d4ac0d',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'pillars', label: '8 Pillars' },
      { id: 'am', label: 'Autonomous Maintenance' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">TPM Overview</h3>
          <p className="smp-text"><strong>Total Productive Maintenance</strong> is a holistic approach to equipment maintenance that strives to achieve perfect production — zero breakdowns, zero defects, zero accidents. It involves operators in daily maintenance activities.</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">8</span><span className="smp-kpi-label">TPM Pillars</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">0</span><span className="smp-kpi-label">Breakdowns Target</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">OEE</span><span className="smp-kpi-label">Key Metric</span></div>
          </div>
          <h3 className="smp-section-title">6 Big Losses</h3>
          <ul className="smp-list">
            <li><strong>Breakdowns</strong> — unplanned equipment stoppages</li>
            <li><strong>Setup & Adjustment</strong> — changeover time losses</li>
            <li><strong>Minor Stops</strong> — small interruptions (&lt; 5 min)</li>
            <li><strong>Reduced Speed</strong> — running below maximum speed</li>
            <li><strong>Process Defects</strong> — quality losses during stable production</li>
            <li><strong>Startup Losses</strong> — defects during warmup/changeover</li>
          </ul>
        </>
      ),
      pillars: () => (
        <>
          <h3 className="smp-section-title">8 Pillars of TPM</h3>
          <table className="smp-table"><thead><tr><th>#</th><th>Pillar</th><th>Focus</th></tr></thead>
            <tbody>
              <tr><td>1</td><td><strong>Autonomous Maintenance</strong></td><td>Operators own basic maintenance — cleaning, inspection, lubrication</td></tr>
              <tr><td>2</td><td><strong>Planned Maintenance</strong></td><td>Scheduled PM based on MTBF data and equipment criticality</td></tr>
              <tr><td>3</td><td><strong>Focused Improvement</strong></td><td>Small-group activities to eliminate the 6 big losses</td></tr>
              <tr><td>4</td><td><strong>Quality Maintenance</strong></td><td>Zero-defect conditions through equipment and process control</td></tr>
              <tr><td>5</td><td><strong>Early Equipment Management</strong></td><td>Design new equipment for easy maintenance (Maintenance Prevention)</td></tr>
              <tr><td>6</td><td><strong>Training & Education</strong></td><td>Skill development for operators and maintenance staff</td></tr>
              <tr><td>7</td><td><strong>Safety, Health & Environment</strong></td><td>Zero accidents, safe working environment</td></tr>
              <tr><td>8</td><td><strong>TPM in Administration</strong></td><td>Apply TPM principles to office and support processes</td></tr>
            </tbody>
          </table>
        </>
      ),
      am: () => (
        <>
          <h3 className="smp-section-title">7 Steps of Autonomous Maintenance</h3>
          <div className="smp-steps">
            {[
              { step: 1, title: 'Initial Cleaning', desc: 'Deep clean the equipment. Tag abnormalities. Fix easy problems on the spot.' },
              { step: 2, title: 'Eliminate Sources of Contamination', desc: 'Address root causes of dirt, leaks, and hard-to-access areas.' },
              { step: 3, title: 'Cleaning & Lubrication Standards', desc: 'Create simple visual standards for daily cleaning, inspection, and lubrication routines.' },
              { step: 4, title: 'General Inspection', desc: 'Train operators on equipment subsystems (hydraulic, pneumatic, electrical). Expand inspection checklist.' },
              { step: 5, title: 'Autonomous Inspection', desc: 'Operators perform full daily inspections independently. Checklist is integrated into standard work.' },
              { step: 6, title: 'Workplace Organization', desc: 'Apply 5S principles around the equipment. Standardize storage, tool placement, visual controls.' },
              { step: 7, title: 'Full Autonomous Management', desc: 'Operators are capable of detecting abnormalities early, making minor repairs, and continuously improving.' },
            ].map((s) => (
              <div key={s.step} className="smp-step-card">
                <div className="smp-step-num">{s.step}</div>
                <div><h4 className="smp-step-title">{s.title}</h4><p className="smp-text">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      ),
    },
  },

  /* ───────────────── POKA-YOKE ──────────────────────────────── */
  'poka-yoke': {
    title: 'Poka-Yoke / Error Proofing',
    badge: 'Mistake Proofing',
    subtitle: 'Devices, mechanisms, and system-level approaches to prevent human errors from becoming defects',
    color: '#2874a6',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'types', label: 'Types & Examples' },
      { id: 'implementation', label: 'Implementation Guide' },
    ],
    content: {
      overview: () => (
        <>
          <h3 className="smp-section-title">What is Poka-Yoke?</h3>
          <p className="smp-text"><strong>Poka-Yoke (ポカヨケ)</strong> means "mistake-proofing." Developed by Shigeo Shingo as part of the Toyota Production System, it refers to any mechanism or device that either prevents a mistake from being made or makes the mistake immediately obvious.</p>
          <div className="smp-kpi-row">
            <div className="smp-kpi"><span className="smp-kpi-value">3</span><span className="smp-kpi-label">Categories</span></div>
            <div className="smp-kpi"><span className="smp-kpi-value">0</span><span className="smp-kpi-label">Defects Target</span></div>
          </div>
          <h3 className="smp-section-title">Three Functions</h3>
          <ul className="smp-list">
            <li><strong>Prevention (Control)</strong> — Makes it impossible to make the error (best)</li>
            <li><strong>Detection (Warning)</strong> — Alerts when an error is about to occur</li>
            <li><strong>Shutdown</strong> — Stops the process when an error is detected</li>
          </ul>
        </>
      ),
      types: () => (
        <>
          <h3 className="smp-section-title">Poka-Yoke Types & Examples</h3>
          <table className="smp-table"><thead><tr><th>Type</th><th>Method</th><th>Example</th></tr></thead>
            <tbody>
              <tr><td><strong>Contact</strong></td><td>Physical shape/size prevents wrong assembly</td><td>USB plug only inserts one way; asymmetric connectors</td></tr>
              <tr><td><strong>Fixed Value</strong></td><td>Counter ensures correct number of operations</td><td>Torque wrench with counter — alerts if bolt count wrong</td></tr>
              <tr><td><strong>Motion Step</strong></td><td>Sequence enforcement</td><td>Parts bins with sensors — must pick from bin A before bin B</td></tr>
              <tr><td><strong>Guide Pin</strong></td><td>Physical alignment</td><td>Locating pins on fixtures ensure correct part orientation</td></tr>
              <tr><td><strong>Sensor</strong></td><td>Presence/absence detection</td><td>Camera inspects label presence before box is sealed</td></tr>
              <tr><td><strong>Color Coding</strong></td><td>Visual differentiation</td><td>Different colored o-rings for different sizes/materials</td></tr>
              <tr><td><strong>Software</strong></td><td>Digital verification</td><td>Barcode scan confirms correct part number before assembly</td></tr>
            </tbody>
          </table>
        </>
      ),
      implementation: () => (
        <>
          <h3 className="smp-section-title">Implementation Steps</h3>
          <div className="smp-steps">
            {[
              { step: 1, title: 'Identify Error-Prone Operations', desc: 'Review PFMEA, defect history, operator interviews. Prioritize by severity and frequency.' },
              { step: 2, title: 'Analyze the Error Mode', desc: 'Understand how the error occurs. Is it omission, wrong part, wrong orientation, wrong sequence?' },
              { step: 3, title: 'Design the Poka-Yoke', desc: 'Choose between prevention, detection, or shutdown. Prefer prevention over detection. Keep it simple and robust.' },
              { step: 4, title: 'Implement & Test', desc: 'Install the device. Test with OK and NOK parts. Verify it catches 100% of defects without false rejects.' },
              { step: 5, title: 'Standardize & Maintain', desc: 'Add to control plan and work instructions. Include in TPM checks. Verify daily functionality (master part test).' },
            ].map((s) => (
              <div key={s.step} className="smp-step-card">
                <div className="smp-step-num">{s.step}</div>
                <div><h4 className="smp-step-title">{s.title}</h4><p className="smp-text">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      ),
    },
  },
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const SystemManagementPage = () => {
  const navigate = useNavigate()
  const { systemId } = useParams()
  const sys = SYSTEMS[systemId]
  const [activeTab, setActiveTab] = useState(sys?.tabs?.[0]?.id || 'overview')

  if (!sys) {
    return (
      <AppLayout>
        <div className="sysmgmt-page">
          <div className="sysmgmt-header">
            <button type="button" className="sysmgmt-back" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="sysmgmt-title">System Not Found</h1>
            <p className="sysmgmt-subtitle">The requested system page does not exist.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  const ContentRenderer = sys.content[activeTab]

  return (
    <AppLayout>
      <div className="smp-page">
        {/* Header */}
        <div className="smp-header" style={{ borderLeftColor: sys.color }}>
          <button type="button" className="sysmgmt-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="smp-header-row">
            <div>
              <div className="smp-badge-label" style={{ background: sys.color }}>{sys.badge}</div>
              <h1 className="smp-title">{sys.title}</h1>
              <p className="smp-subtitle">{sys.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="smp-tabs">
          {sys.tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`smp-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="smp-content">
          {ContentRenderer ? <ContentRenderer /> : <p>No content available for this tab.</p>}
        </div>
      </div>
    </AppLayout>
  )
}

export default SystemManagementPage
