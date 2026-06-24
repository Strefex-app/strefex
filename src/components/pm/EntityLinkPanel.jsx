import { useMemo, useState } from 'react'
import { ReferenceId } from './ProcurementRegisterTable'
import { linkContractToProject, linkPoToProject, linkRfqToProject, listUnlinkedContracts, listUnlinkedPurchaseOrders, listUnlinkedRfqs } from '../../utils/entityLinks'
import '../../styles/projectControl.css'

/**
 * Manual links between separate databases — pick existing records from dropdowns.
 */
export default function EntityLinkPanel({
  projectId,
  opportunities = [],
  purchaseOrders = [],
  contracts = [],
  onLinked,
}) {
  const [rfqId, setRfqId] = useState('')
  const [poId, setPoId] = useState('')
  const [contractId, setContractId] = useState('')

  const unlinkedRfqs = useMemo(() => listUnlinkedRfqs(opportunities), [opportunities])
  const unlinkedPos = useMemo(() => listUnlinkedPurchaseOrders(purchaseOrders), [purchaseOrders])
  const unlinkedContracts = useMemo(() => listUnlinkedContracts(contracts), [contracts])

  const linkedRfqs = useMemo(
    () => opportunities.filter((o) => o.projectId === projectId),
    [opportunities, projectId],
  )
  const linkedPos = useMemo(
    () => purchaseOrders.filter((po) => po.projectId === projectId),
    [purchaseOrders, projectId],
  )
  const linkedContracts = useMemo(
    () => contracts.filter((c) => c.projectId === projectId),
    [contracts, projectId],
  )

  const handleLinkRfq = () => {
    if (!rfqId) return
    if (linkRfqToProject(rfqId, projectId)) {
      setRfqId('')
      onLinked?.('RFQ linked to project')
    }
  }

  const handleLinkPo = () => {
    if (!poId) return
    if (linkPoToProject(poId, projectId)) {
      setPoId('')
      onLinked?.('Purchase order linked to project')
    }
  }

  const handleLinkContract = () => {
    if (!contractId) return
    if (linkContractToProject(contractId, projectId)) {
      setContractId('')
      onLinked?.('Contract linked to project')
    }
  }

  return (
    <section className="pcc-link-panel">
      <h2 className="pcc-panel__title">Link records from other modules</h2>
      <p className="pcc-panel__desc">
        Each module keeps its own database. Select an existing record below to link it to this project.
      </p>

      <div className="pcc-link-grid">
        <div className="pcc-link-block">
          <h3 className="pcc-link-block__title">RFQ (Procurement)</h3>
          <div className="pcc-link-block__row">
            <select className="pcc-search" value={rfqId} onChange={(e) => setRfqId(e.target.value)} aria-label="Select RFQ to link">
              <option value="">Select RFQ from register…</option>
              {unlinkedRfqs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.rfqNumber || o.opportunityNumber} · {o.title}
                </option>
              ))}
            </select>
            <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={handleLinkRfq} disabled={!rfqId}>
              Link RFQ
            </button>
          </div>
          {linkedRfqs.length > 0 ? (
            <ul className="pcc-link-list">
              {linkedRfqs.map((o) => (
                <li key={o.id}>
                  <ReferenceId variant="doc">{o.rfqNumber || o.opportunityNumber}</ReferenceId>
                  <span className="pcc-link-list__sub stx-text-wrap">{o.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pcc-link-empty">No RFQ linked yet. Create one in RFQ module or link above.</p>
          )}
        </div>

        <div className="pcc-link-block">
          <h3 className="pcc-link-block__title">Purchase order (Procurement)</h3>
          <div className="pcc-link-block__row">
            <select className="pcc-search" value={poId} onChange={(e) => setPoId(e.target.value)} aria-label="Select PO to link">
              <option value="">Select PO from register…</option>
              {unlinkedPos.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.id} · {po.vendorName || po.title || 'PO'}
                </option>
              ))}
            </select>
            <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={handleLinkPo} disabled={!poId}>
              Link PO
            </button>
          </div>
          {linkedPos.length > 0 ? (
            <ul className="pcc-link-list">
              {linkedPos.map((po) => (
                <li key={po.id}><ReferenceId variant="doc">{po.id}</ReferenceId></li>
              ))}
            </ul>
          ) : (
            <p className="pcc-link-empty">No PO linked yet.</p>
          )}
        </div>

        <div className="pcc-link-block">
          <h3 className="pcc-link-block__title">Contract (Contract management)</h3>
          <div className="pcc-link-block__row">
            <select className="pcc-search" value={contractId} onChange={(e) => setContractId(e.target.value)} aria-label="Select contract to link">
              <option value="">Select contract from register…</option>
              {unlinkedContracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.title || c.vendorName || 'Contract'}
                </option>
              ))}
            </select>
            <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={handleLinkContract} disabled={!contractId}>
              Link contract
            </button>
          </div>
          {linkedContracts.length > 0 ? (
            <ul className="pcc-link-list">
              {linkedContracts.map((c) => (
                <li key={c.id}><ReferenceId variant="doc">{c.id}</ReferenceId></li>
              ))}
            </ul>
          ) : (
            <p className="pcc-link-empty">No contract linked yet.</p>
          )}
        </div>
      </div>
    </section>
  )
}
