export default function ManufacturerReliabilityCard({ card, compact = false }) {
  if (!card) {
    return (
      <div className="iatf-rel iatf-rel--empty">
        <p className="stx-text-caption">No reliability card published. Certificates and process control stay internal until the manufacturer opts in.</p>
      </div>
    )
  }

  const chips = []
  if (card.standards) {
    Object.values(card.standards).forEach((row) => {
      if (row?.valid) chips.push({ id: row.id, label: `${row.label} valid` })
    })
  } else {
    if (card.iatfValid) chips.push({ id: 'iatf', label: 'IATF 16949 valid' })
    else if (card.certExpiry) chips.push({ id: 'iatf-exp', label: 'IATF on file — check expiry' })
    if (card.iso9001Valid) chips.push({ id: 'iso', label: 'ISO 9001 valid' })
    if (card.iso13485Valid) chips.push({ id: 'iso13485', label: 'ISO 13485 valid' })
    if (card.fdaValid) chips.push({ id: 'fda', label: 'FDA registered' })
    if (card.ceValid) chips.push({ id: 'ce', label: 'CE / MDR' })
  }
  if (card.traceMethod && card.traceMethod !== 'none') {
    chips.push({ id: 'trace', label: `Traceability: ${card.traceMethod}` })
  } else if (!compact) {
    chips.push({ id: 'no-trace', label: 'Traceability not evidenced' })
  }
  if (card.ppapLevels?.length) chips.push({ id: 'ppap', label: `PPAP level ${card.ppapLevels.join(', ')}` })

  return (
    <div className={`iatf-rel${compact ? ' iatf-rel--compact' : ''}`}>
      <div className="iatf-rel__chips">
        {chips.map((chip) => (
          <span key={chip.id} className="iatf-rel__chip">{chip.label}</span>
        ))}
      </div>
      {!compact && (
        <>
          {card.certifyingBody && (
            <p className="stx-text-caption stx-text-wrap">
              CB {card.certifyingBody}
              {card.certExpiry ? ` · expires ${card.certExpiry}` : ''}
              {card.scope ? ` · ${card.scope}` : ''}
            </p>
          )}
          {card.processes?.length > 0 && (
            <p className="stx-text-caption stx-text-wrap">Processes: {card.processes.join(', ')}</p>
          )}
          {card.capabilityNote && (
            <p className="stx-text-caption stx-text-wrap">{card.capabilityNote}</p>
          )}
        </>
      )}
    </div>
  )
}
