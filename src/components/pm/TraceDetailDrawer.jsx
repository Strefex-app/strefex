import { Link } from 'react-router-dom'
import { ReferenceId, StatusPill } from './ProcurementRegisterTable'
import { quoteStatusMeta, poStatusMeta } from './controlStatus'
import '../../styles/projectControl.css'

function OwnershipRow({ module, label, value, href }) {
  return (
    <div className="pch-drawer__row">
      <span className={`pch-module-badge pch-module-badge--${module === 'pm' ? 'pm' : 'proc'} pch-module-badge--xs`}>
        {module === 'pm' ? 'PM' : 'Procurement'}
      </span>
      <div className="pch-drawer__field min-width-0">
        <span className="pch-drawer__label">{label}</span>
        {href && value && value !== '—' ? (
          <Link to={href} className="pch-drawer__link" onClick={(e) => e.stopPropagation()}>
            <ReferenceId variant="active">{value}</ReferenceId>
          </Link>
        ) : (
          <ReferenceId variant={value && value !== '—' ? 'neutral' : 'empty'}>{value || '—'}</ReferenceId>
        )}
      </div>
    </div>
  )
}

export default function TraceDetailDrawer({ row, currencyDefault = 'USD', onClose, onSignQuotation, onCreatePO }) {
  if (!row) return null

  const quoteMeta = quoteStatusMeta(row.quoteStatus)
  const poMeta = poStatusMeta(row.poStatus)
  const cur = row.currency || currencyDefault

  const projectHref = row.projectId ? `/project-management/project/${row.projectId}/control` : null
  const poHref = row.poNumber && row.poNumber !== '—'
    ? `/procurement?tab=purchase-orders&search=${encodeURIComponent(row.poNumber)}`
    : null
  const procFilteredHref = row.projectId
    ? `/procurement?tab=traceability&projectId=${row.projectId}`
    : '/procurement?tab=traceability'
  const vendorHref = row.vendorId
    ? `/vendors/${row.vendorId}`
    : (row.supplier && row.supplier !== '—'
      ? `/vendors?search=${encodeURIComponent(row.supplier)}`
      : null)

  return (
    <>
      <button type="button" className="pch-drawer-backdrop" aria-label="Close detail panel" onClick={onClose} />
      <aside className="pch-drawer" role="dialog" aria-labelledby="pch-drawer-title">
        <header className="pch-drawer__head">
          <div className="min-width-0">
            <h2 id="pch-drawer-title" className="pch-drawer__title">Document trace</h2>
            {row.opportunityTitle && row.opportunityTitle !== '—' ? (
              <p className="pch-drawer__subtitle stx-text-wrap">{row.opportunityTitle}</p>
            ) : null}
          </div>
          <button type="button" className="pch-drawer__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="pch-drawer__amount">
          {cur} {Number(row.amount || 0).toLocaleString()}
        </div>

        <div className="pch-drawer__status">
          {row.quotationNumber && row.quotationNumber !== '—' ? (
            <StatusPill tone={quoteMeta.tone}>{quoteMeta.label}</StatusPill>
          ) : null}
          {row.poNumber && row.poNumber !== '—' ? (
            <StatusPill tone={poMeta.tone}>{poMeta.label}</StatusPill>
          ) : null}
        </div>

        <section className="pch-drawer__section">
          <h3 className="pch-drawer__section-title">Ownership &amp; links</h3>
          <OwnershipRow module="pm" label="Project" value={row.projectNumber} href={projectHref} />
          {row.projectName && row.projectName !== '—' ? (
            <p className="pch-drawer__hint stx-text-wrap">{row.projectName}</p>
          ) : null}
          <OwnershipRow module="proc" label="Opportunity" value={row.opportunityNumber} href={procFilteredHref} />
          <OwnershipRow module="proc" label="Quotation" value={row.quotationNumber} href={procFilteredHref} />
          <OwnershipRow module="proc" label="Vendor" value={row.supplier} href={vendorHref} />
          {row.vendorNumber && row.vendorNumber !== '—' ? (
            <OwnershipRow module="proc" label="Vendor master #" value={row.vendorNumber} href={vendorHref} />
          ) : null}
          <OwnershipRow module="proc" label="Vendor quote ref" value={row.supplierQuotationRef} href={null} />
          <OwnershipRow module="proc" label="Purchase order" value={row.poNumber} href={poHref} />
        </section>

        <section className="pch-drawer__section">
          <h3 className="pch-drawer__section-title">Open in module</h3>
          <div className="pch-drawer__actions">
            {projectHref ? (
              <Link to={projectHref} className="app-page-btn-outline app-page-btn-sm">Project control</Link>
            ) : null}
            <Link to={procFilteredHref} className="app-page-btn-outline app-page-btn-sm">Procurement register</Link>
            {vendorHref ? (
              <Link to={vendorHref} className="app-page-btn-outline app-page-btn-sm">Vendor master</Link>
            ) : null}
          </div>
        </section>

        {(onSignQuotation || onCreatePO) ? (
          <section className="pch-drawer__section">
            <h3 className="pch-drawer__section-title">Actions</h3>
            <div className="pch-drawer__actions">
              {row.quotationId && row.quoteStatus !== 'signed' && onSignQuotation ? (
                <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => onSignQuotation(row.quotationId)}>
                  Mark quotation signed
                </button>
              ) : null}
              {row.quotationId && row.quoteStatus === 'signed' && row.poNumber === '—' && onCreatePO ? (
                <button type="button" className="app-page-btn-primary app-page-btn-sm" onClick={() => onCreatePO(row.quotationId)}>
                  Create PO
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </aside>
    </>
  )
}
