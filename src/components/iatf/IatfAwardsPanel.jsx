import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useRfqStore from '../../store/rfqStore'
import { bindReceivedAwardToPlant } from '../../utils/awardRfqToProject'
import IatfField from './IatfField'
import IatfTrackedActions from './IatfTrackedActions'
import useIatfControlStore from '../../store/iatfControlStore'

export default function IatfAwardsPanel({ parts, awards = [], readOnly }) {
  const receivedRfqs = useRfqStore((s) => s.receivedRfqs)
  const awardedInbox = useMemo(
    () => (receivedRfqs || []).filter((row) => row.status === 'awarded'),
    [receivedRfqs],
  )
  const boundIds = new Set((awards || []).map((row) => row.rfqId).filter(Boolean))
  const unbound = awardedInbox.filter((row) => !boundIds.has(row.rfqId))
  const [partId, setPartId] = useState('')
  const [note, setNote] = useState('')
  const updateAward = useIatfControlStore((s) => s.updateAward)

  return (
    <div className="iatf-stack">
      <section className="app-page-card iatf-card">
        <h2 className="stx-text-heading">Awarded RFQs → plant project</h2>
        <p className="stx-text-caption">
          Buyers award from RFQ comparison. When this plant wins, bind the awarded request to a project so PPAP, change, and lots sit on the same binder.
        </p>
        {!readOnly && unbound.length > 0 && (
          <div className="iatf-form">
            <IatfField label="Default part for new binders">
              <select value={partId} onChange={(e) => setPartId(e.target.value)}>
                <option value="">—</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>{part.partNumber || part.name}</option>
                ))}
              </select>
            </IatfField>
            {unbound.map((row) => (
              <div key={row.id} className="iatf-inline">
                <span className="stx-text-wrap">{row.title || row.rfqId} · {row.buyerCompany || row.buyerEmail || 'Buyer'}</span>
                <button
                  type="button"
                  className="app-page-btn-primary"
                  onClick={() => {
                    const result = bindReceivedAwardToPlant({ receivedRfqId: row.id, partId })
                    setNote(result.ok
                      ? (result.already ? 'Already bound to a project.' : 'Plant project created.')
                      : (result.error || 'Could not bind.'))
                  }}
                >
                  Create plant project
                </button>
              </div>
            ))}
          </div>
        )}
        {note && <p className="stx-text-caption">{note}</p>}
      </section>

      <section className="app-page-card iatf-card">
        <h2 className="stx-text-heading">Award binders</h2>
        {awards.length === 0 ? (
          <p className="stx-text-caption">No awards bound yet. Award an RFQ from comparison, or bind a won request above.</p>
        ) : (
          <div className="iatf-table-wrap">
            <table className="iatf-table">
              <thead>
                <tr><th>RFQ</th><th>Seller / plant</th><th>Part</th><th>Project</th><th>PO / contract</th><th> </th></tr>
                </thead>
                <tbody>
                  {awards.map((row) => {
                    const part = parts.find((p) => p.id === row.partId)
                    return (
                      <tr key={row.id}>
                        <td className="stx-text-wrap">{row.buyerRef || row.title || row.rfqId}</td>
                        <td className="stx-text-wrap">{row.sellerName || row.sellerId || '—'}</td>
                        <td>{part?.partNumber || part?.name || '—'}</td>
                        <td>
                          {row.projectId ? (
                            <Link className="iatf-link" to={`/management/ops/projects/project/${row.projectId}`}>
                              Open project
                            </Link>
                          ) : '—'}
                        </td>
                        <td className="stx-text-wrap">
                          {row.poId ? <Link className="iatf-link" to="/management/sourcing/procurement">{row.poId}</Link> : '—'}
                          {row.contractId ? ' · contract' : ''}
                          {row.binderDocId ? (
                            <>
                              {' · '}
                              <Link
                                className="iatf-link"
                                to={`/management/company-database/commercial/${row.commercialFolderId || 'folder-com-01-active'}`}
                              >
                                Commercial binder
                              </Link>
                            </>
                          ) : null}
                        </td>
                        <td>
                          <IatfTrackedActions
                            record={row}
                            title="Edit award binder"
                            readOnly={readOnly}
                            fields={[
                              {
                                key: 'partId',
                                label: 'Part',
                                type: 'select',
                                options: [{ value: '', label: '—' }, ...parts.map((p) => ({ value: p.id, label: p.partNumber || p.name }))],
                              },
                              { key: 'title', label: 'Title' },
                            ]}
                            onSave={(values, meta) => updateAward(row.id, values, meta)}
                          />
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
