const PRIVATE_ITEMS = [
  'Lot genealogy, NCRs, and hold records',
  'Customer-specific PPAP packs and drawings',
  'Other buyers\' RFQ attachments and pricing',
  'Unpublished certificates and audit findings',
  'Employee, payroll, and disciplinary records',
]

const PUBLIC_WHEN_OPTED_IN = [
  'Certificate validity, certifying body, expiry, scope',
  'Process names (no detailed routings)',
  'Traceability method summary (lot / serial / none)',
  'PPAP levels in use (not full submission packs)',
  'Capability record count (not Cpk values)',
]

export default function PublishTrustPreview() {
  return (
    <div className="trust-preview">
      <div className="trust-preview__col">
        <h3 className="stx-text-heading">What buyers may see</h3>
        <p className="stx-text-caption">Only fields you opt in and publish to the Network.</p>
        <ul className="trust-preview__list trust-preview__list--public">
          {PUBLIC_WHEN_OPTED_IN.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div className="trust-preview__col">
        <h3 className="stx-text-heading">Always private</h3>
        <p className="stx-text-caption">Tenant-scoped — never on marketplace cards.</p>
        <ul className="trust-preview__list trust-preview__list--private">
          {PRIVATE_ITEMS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
