import '../../styles/projectControl.css'

export default function ProjectControlPlaybook() {
  return (
    <details className="pcc-playbook">
      <summary>Project & cost control reference</summary>
      <div className="pcc-playbook__body">
        <p>
          Document numbering follows enterprise PPM practice (SAP PS / Procore Commitments):
          program → project → opportunity → quotation → purchase order. Monthly review is default;
          active risks escalate to weekly review.
        </p>
        <ul>
          <li><strong>Program</strong> — PGM-YYYY-NNN</li>
          <li><strong>Project</strong> — PGM-YYYY-NNN-PNN</li>
          <li><strong>Opportunity</strong> — OPP-YYYY-NNN (sourcing package)</li>
          <li><strong>Quotation</strong> — QUO-YYYY-NNN + vendor reference</li>
          <li><strong>PO</strong> — PO-YYYY-NNNN after signed quotation</li>
        </ul>
      </div>
    </details>
  )
}
