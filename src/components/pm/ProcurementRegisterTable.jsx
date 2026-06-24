import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { quoteStatusMeta, poStatusMeta } from './controlStatus'
import TraceDetailDrawer from './TraceDetailDrawer'
import { downloadTraceCsv } from '../../utils/traceabilityExport'
import '../../styles/projectControl.css'

export function ReferenceId({ children, title, variant = 'neutral' }) {
  if (!children || children === '—') {
    return <span className="pcc-ref-id pcc-ref-id--empty">—</span>
  }
  return (
    <span className={`pcc-ref-id pcc-ref-id--${variant}`} title={title || String(children)}>
      {children}
    </span>
  )
}

function TraceDocCell({ module, label, value, href, subline }) {
  const empty = !value || value === '—'
  return (
    <td className="pcc-trace-cell">
      <div className="pcc-trace-cell__meta">
        <ModuleBadge module={module} size="xs" />
        <span className="pcc-trace-cell__type">{label}</span>
      </div>
      <div className="pcc-trace-cell__body">
        {href && !empty ? (
          <RefLink to={href} variant="doc">{value}</RefLink>
        ) : (
          <ReferenceId variant={empty ? 'empty' : 'doc'}>{value || '—'}</ReferenceId>
        )}
      </div>
      {subline && subline !== '—' ? (
        <div className="pcc-trace-cell__sub stx-text-wrap">{subline}</div>
      ) : null}
    </td>
  )
}

export function RefLink({ to, children, variant = 'active', onClick }) {
  if (!children || children === '—' || !to) {
    return <ReferenceId variant="empty">—</ReferenceId>
  }
  return (
    <Link to={to} className="pcc-ref-link" onClick={onClick}>
      <ReferenceId variant={variant}>{children}</ReferenceId>
    </Link>
  )
}

export function StatusPill({ children, tone = 'muted' }) {
  return <span className={`pcc-status pcc-status--${tone}`}>{children}</span>
}

export function ModuleBadge({ module, size }) {
  const tone = module === 'pm' ? 'pm' : 'proc'
  const label = module === 'pm' ? 'PM' : 'Procurement'
  return (
    <span className={`pch-module-badge pch-module-badge--${tone}${size === 'xs' ? ' pch-module-badge--xs' : ''}`}>
      {label}
    </span>
  )
}

/** Compact document chain with clickable refs when IDs are present. */
export function DocumentFlowRow({ row, compact = false, onStepClick }) {
  const steps = [
    {
      key: 'prj',
      label: 'Project',
      value: row.projectNumber,
      module: 'pm',
      href: row.projectId ? `/project-management/project/${row.projectId}/control` : null,
    },
    {
      key: 'opp',
      label: 'Opportunity',
      value: row.opportunityNumber,
      module: 'proc',
      href: row.projectId
        ? `/procurement?tab=traceability&projectId=${row.projectId}`
        : '/procurement?tab=traceability',
    },
    {
      key: 'quo',
      label: 'Quotation',
      value: row.quotationNumber,
      module: 'proc',
      href: null,
    },
    {
      key: 'po',
      label: 'PO',
      value: row.poNumber,
      module: 'proc',
      href: row.poNumber && row.poNumber !== '—'
        ? `/procurement?tab=purchase-orders&search=${encodeURIComponent(row.poNumber)}`
        : null,
    },
  ]

  return (
    <div className={`pcc-doc-flow${compact ? ' pcc-doc-flow--compact' : ''}`} aria-label="Document chain">
      {steps.map((step, i) => (
        <div key={step.key} className="pcc-doc-flow__step">
          {i > 0 ? <span className="pcc-doc-flow__chev" aria-hidden>›</span> : null}
          <div className="pcc-doc-flow__cell">
            {!compact ? (
              <span className="pcc-doc-flow__label">
                {step.label}
                {' '}
                <ModuleBadge module={step.module} size="xs" />
              </span>
            ) : null}
            {step.href ? (
              <RefLink
                to={step.href}
                variant="doc"
                onClick={onStepClick ? (e) => { e.stopPropagation(); onStepClick(row) } : undefined}
              >
                {step.value || '—'}
              </RefLink>
            ) : (
              <ReferenceId variant={step.value && step.value !== '—' ? 'doc' : 'empty'}>
                {step.value || '—'}
              </ReferenceId>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** @deprecated use ControlPageHeader fact strip */
export function ProjectReferenceHeader({ project }) {
  if (!project) return null
  return (
    <dl className="pcc-fact-strip">
      <div className="pcc-fact-strip__item">
        <dt>Project</dt>
        <dd><ReferenceId>{project.projectNumber || '—'}</ReferenceId></dd>
      </div>
    </dl>
  )
}

const FILTER_CHIPS = [
  { id: 'all', label: 'All records' },
  { id: 'open-quote', label: 'Open quotation' },
  { id: 'signed-no-po', label: 'Signed, no PO' },
  { id: 'with-po', label: 'With PO' },
]

const SORT_KEYS = {
  project: (r) => r.projectNumber,
  opportunity: (r) => r.opportunityNumber,
  quotation: (r) => r.quotationNumber,
  supplier: (r) => r.supplier,
  amount: (r) => Number(r.amount || 0),
  po: (r) => r.poNumber,
}

function filterRows(rows, query, chip) {
  let out = rows
  if (query.trim()) {
    const q = query.trim().toLowerCase()
    out = out.filter((row) =>
      [
        row.projectNumber,
        row.projectName,
        row.opportunityNumber,
        row.opportunityTitle,
        row.quotationNumber,
        row.supplier,
        row.supplierQuotationRef,
        row.poNumber,
      ].some((v) => String(v || '').toLowerCase().includes(q)),
    )
  }
  if (chip === 'open-quote') {
    out = out.filter((r) => r.quotationNumber !== '—' && r.quoteStatus !== 'signed')
  } else if (chip === 'signed-no-po') {
    out = out.filter((r) => r.quoteStatus === 'signed' && r.poNumber === '—')
  } else if (chip === 'with-po') {
    out = out.filter((r) => r.poNumber !== '—')
  }
  return out
}

function sortRows(rows, sortKey, direction) {
  if (!sortKey || !SORT_KEYS[sortKey]) return rows
  const fn = SORT_KEYS[sortKey]
  const sorted = [...rows].sort((a, b) => {
    const va = fn(a)
    const vb = fn(b)
    if (typeof va === 'number' && typeof vb === 'number') return va - vb
    return String(va).localeCompare(String(vb))
  })
  return direction === 'desc' ? sorted.reverse() : sorted
}

function SortHeader({ label, sortKey, activeKey, direction, onSort }) {
  const active = activeKey === sortKey
  return (
    <button
      type="button"
      className={`pcc-sort-th${active ? ' is-active' : ''}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active ? <span className="pcc-sort-th__dir" aria-hidden>{direction === 'asc' ? '↑' : '↓'}</span> : null}
    </button>
  )
}

/**
 * Enterprise traceability panel: search, filters, sort, export, drill-down drawer.
 */
export default function ProcurementTracePanel({
  rows = [],
  currencyDefault = 'USD',
  showActions = false,
  onSignQuotation,
  onCreatePO,
  emptyMessage = 'No procurement records yet.',
  title = 'Procurement traceability',
  description = 'End-to-end document chain from project to purchase order.',
  exportFilename = 'procurement-traceability.csv',
}) {
  const [search, setSearch] = useState('')
  const [view, setView] = useState('table')
  const [chip, setChip] = useState('all')
  const [sortKey, setSortKey] = useState('project')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedRow, setSelectedRow] = useState(null)

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(
    () => sortRows(filterRows(rows, search, chip), sortKey, sortDir),
    [rows, search, chip, sortKey, sortDir],
  )

  if (rows.length === 0) {
    return (
      <section className="pcc-panel">
        <h2 className="pcc-panel__title">{title}</h2>
        <p className="pcc-panel__desc">{emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className="pcc-panel">
      <div className="pcc-panel__head">
        <div className="min-width-0">
          <h2 className="pcc-panel__title">{title}</h2>
          <p className="pcc-panel__desc">{description}</p>
        </div>
        <div className="pcc-panel__toolbar">
          <input
            type="search"
            className="pcc-search"
            placeholder="Search project, OPP, QUO, supplier, PO…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search traceability register"
          />
          <button
            type="button"
            className="app-page-btn-outline app-page-btn-sm"
            onClick={() => downloadTraceCsv(filtered, exportFilename)}
          >
            Export CSV
          </button>
          <div className="pcc-view-toggle" role="tablist" aria-label="View mode">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'table'}
              className={`pcc-view-toggle__btn${view === 'table' ? ' is-active' : ''}`}
              onClick={() => setView('table')}
            >
              Register
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'flow'}
              className={`pcc-view-toggle__btn${view === 'flow' ? ' is-active' : ''}`}
              onClick={() => setView('flow')}
            >
              Document flow
            </button>
          </div>
        </div>
      </div>

      <div className="pcc-filter-chips" role="group" aria-label="Record filters">
        {FILTER_CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`pcc-filter-chip${chip === c.id ? ' is-active' : ''}`}
            onClick={() => setChip(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="pcc-panel__count">
        {filtered.length} record{filtered.length === 1 ? '' : 's'}
        {search ? ` matching “${search}”` : ''}
        {chip !== 'all' ? ` · filter: ${FILTER_CHIPS.find((f) => f.id === chip)?.label}` : ''}
      </p>

      {filtered.length === 0 ? (
        <p className="app-page-body">No records match your search or filter.</p>
      ) : view === 'flow' ? (
        <ul className="pcc-flow-list">
          {filtered.map((row) => {
            const quoteMeta = quoteStatusMeta(row.quoteStatus)
            const poMeta = poStatusMeta(row.poStatus)
            const cur = row.currency || currencyDefault
            return (
              <li key={row.id}>
                <button type="button" className="pcc-flow-card pcc-flow-card--clickable" onClick={() => setSelectedRow(row)}>
                  <DocumentFlowRow row={row} />
                  <div className="pcc-flow-card__meta">
                    <span className="stx-text-wrap">
                      <strong>{row.supplier !== '—' ? row.supplier : 'Supplier TBD'}</strong>
                      {row.supplierQuotationRef && row.supplierQuotationRef !== '—' ? (
                        <span className="pcc-flow-card__ref"> · Vendor ref {row.supplierQuotationRef}</span>
                      ) : null}
                    </span>
                    <span className="pcc-flow-card__amount">
                      {cur} {Number(row.amount || 0).toLocaleString()}
                    </span>
                    <StatusPill tone={quoteMeta.tone}>{quoteMeta.label}</StatusPill>
                    {row.poNumber !== '—' ? <StatusPill tone={poMeta.tone}>{poMeta.label}</StatusPill> : null}
                  </div>
                  {row.opportunityTitle && row.opportunityTitle !== '—' ? (
                    <p className="pcc-flow-card__title stx-text-wrap">{row.opportunityTitle}</p>
                  ) : null}
                  {showActions ? (
                    <div className="pcc-flow-card__actions">
                      {row.quotationId && row.quoteStatus !== 'signed' && onSignQuotation ? (
                        <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={(e) => { e.stopPropagation(); onSignQuotation(row.quotationId) }}>
                          Mark signed
                        </button>
                      ) : null}
                      {row.quotationId && row.quoteStatus === 'signed' && row.poNumber === '—' && onCreatePO ? (
                        <button type="button" className="app-page-btn-primary app-page-btn-sm" onClick={(e) => { e.stopPropagation(); onCreatePO(row.quotationId) }}>
                          Create PO
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="pcc-register-wrap stx-fluid-table-wrap">
          <table className="stx-fluid-table pcc-register-table pcc-register-table--split">
            <thead>
              <tr>
                <th><SortHeader label="Project" sortKey="project" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
                <th><SortHeader label="Opportunity" sortKey="opportunity" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
                <th><SortHeader label="Quotation" sortKey="quotation" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
                <th><SortHeader label="Vendor" sortKey="supplier" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
                <th>Vendor #</th>
                <th>Vendor quote #</th>
                <th className="pcc-col-amount"><SortHeader label="Amount" sortKey="amount" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
                <th>Quote</th>
                <th><SortHeader label="PO" sortKey="po" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
                {showActions ? <th className="pcc-col-actions">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const quoteMeta = quoteStatusMeta(row.quoteStatus)
                const poMeta = poStatusMeta(row.poStatus)
                const cur = row.currency || currencyDefault
                return (
                  <tr
                    key={row.id}
                    className="pcc-register-row--clickable"
                    onClick={() => setSelectedRow(row)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setSelectedRow(row) }}
                  >
                    <TraceDocCell
                      module="pm"
                      label="Project"
                      value={row.projectNumber}
                      href={row.projectId ? `/project-management/project/${row.projectId}/control` : null}
                      subline={row.projectName}
                    />
                    <TraceDocCell
                      module="proc"
                      label="RFQ / OPP"
                      value={row.rfqNumber && row.rfqNumber !== row.opportunityNumber ? row.rfqNumber : row.opportunityNumber}
                      href={row.projectId
                        ? `/procurement?tab=traceability&projectId=${row.projectId}`
                        : '/procurement?tab=traceability'}
                      subline={row.rfqNumber && row.rfqNumber !== row.opportunityNumber ? row.opportunityNumber : row.opportunityTitle}
                    />
                    <TraceDocCell
                      module="proc"
                      label="Quotation"
                      value={row.quotationNumber}
                    />
                    <td className="pcc-trace-cell">
                      <div className="pcc-trace-cell__meta">
                        <ModuleBadge module="proc" size="xs" />
                        <span className="pcc-trace-cell__type">Vendor</span>
                      </div>
                      <div className="pcc-trace-cell__body">
                        {row.supplier !== '—' ? (
                          <RefLink
                            to={row.vendorId
                              ? `/vendors/${row.vendorId}`
                              : `/vendors?search=${encodeURIComponent(row.supplier)}`}
                            variant="doc"
                          >
                            {row.supplier}
                          </RefLink>
                        ) : (
                          <ReferenceId variant="empty">—</ReferenceId>
                        )}
                      </div>
                      {row.vendorStatus === 'pending_approval' ? (
                        <span className="pcc-trace-cell__sub">Potential vendor</span>
                      ) : null}
                    </td>
                    <td className="pcc-trace-cell">
                      <div className="pcc-trace-cell__meta">
                        <span className="pcc-trace-cell__type">Master #</span>
                      </div>
                      <div className="pcc-trace-cell__body">
                        {row.vendorNumber && row.vendorNumber !== '—' ? (
                          <RefLink to={row.vendorId ? `/vendors/${row.vendorId}` : null} variant="doc">
                            {row.vendorNumber}
                          </RefLink>
                        ) : (
                          <ReferenceId variant="empty">—</ReferenceId>
                        )}
                      </div>
                    </td>
                    <td className="pcc-trace-cell">
                      <div className="pcc-trace-cell__meta">
                        <span className="pcc-trace-cell__type">Supplier quote</span>
                      </div>
                      <div className="pcc-trace-cell__body">
                        <ReferenceId variant="doc">{row.supplierQuotationRef}</ReferenceId>
                      </div>
                    </td>
                    <td className="pcc-col-amount pcc-trace-cell">
                      <div className="pcc-trace-cell__meta">
                        <span className="pcc-trace-cell__type">Amount</span>
                      </div>
                      <div className="pcc-trace-cell__body pcc-trace-cell__amount">
                        {cur} {Number(row.amount || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="pcc-trace-cell pcc-trace-cell--status">
                      <StatusPill tone={quoteMeta.tone}>{quoteMeta.label}</StatusPill>
                    </td>
                    <td className="pcc-trace-cell">
                      <div className="pcc-trace-cell__meta">
                        <ModuleBadge module="proc" size="xs" />
                        <span className="pcc-trace-cell__type">PO</span>
                      </div>
                      <div className="pcc-trace-cell__body">
                        {row.poNumber !== '—' ? (
                          <RefLink to={`/procurement?tab=purchase-orders&search=${encodeURIComponent(row.poNumber)}`} variant="doc">
                            {row.poNumber}
                          </RefLink>
                        ) : (
                          <ReferenceId variant="empty">—</ReferenceId>
                        )}
                      </div>
                      {row.poNumber !== '—' ? (
                        <div className="pcc-trace-cell__sub">
                          <StatusPill tone={poMeta.tone}>{poMeta.label}</StatusPill>
                        </div>
                      ) : null}
                    </td>
                    {showActions ? (
                      <td className="pcc-col-actions" onClick={(e) => e.stopPropagation()}>
                        {row.quotationId && row.quoteStatus !== 'signed' && onSignQuotation ? (
                          <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => onSignQuotation(row.quotationId)}>
                            Sign
                          </button>
                        ) : null}
                        {row.quotationId && row.quoteStatus === 'signed' && row.poNumber === '—' && onCreatePO ? (
                          <button type="button" className="app-page-btn-primary app-page-btn-sm" onClick={() => onCreatePO(row.quotationId)}>
                            Create PO
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <TraceDetailDrawer
        row={selectedRow}
        currencyDefault={currencyDefault}
        onClose={() => setSelectedRow(null)}
        onSignQuotation={onSignQuotation}
        onCreatePO={onCreatePO}
      />
    </section>
  )
}
