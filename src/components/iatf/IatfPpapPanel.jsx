import { useState } from 'react'
import {
  IATF_PPAP_ELEMENTS,
  IATF_PPAP_ELEMENT_STATES,
  IATF_PPAP_LEVELS,
  IATF_PPAP_STATUSES,
  labelOf,
  ppapPackProgress,
} from '../../data/iatfControlCatalog'
import useIatfControlStore from '../../store/iatfControlStore'
import IatfField from './IatfField'
import IatfTrackedActions from './IatfTrackedActions'

export default function IatfPpapPanel({ parts, packages = [], readOnly }) {
  const addPpapPackage = useIatfControlStore((s) => s.addPpapPackage)
  const setPpapElement = useIatfControlStore((s) => s.setPpapElement)
  const updatePpapPackage = useIatfControlStore((s) => s.updatePpapPackage)
  const submitPpapPackage = useIatfControlStore((s) => s.submitPpapPackage)
  const approvePpapPackage = useIatfControlStore((s) => s.approvePpapPackage)
  const [form, setForm] = useState({ partId: '', customer: '', level: '3' })
  const [openId, setOpenId] = useState(packages[0]?.id || '')
  const open = packages.find((row) => row.id === openId) || packages[0] || null

  return (
    <div className="iatf-stack">
      {!readOnly && (
        <form
          className="app-page-card iatf-card iatf-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.partId) return
            const row = addPpapPackage(form)
            setOpenId(row.id)
            setForm({ partId: form.partId, customer: '', level: form.level })
          }}
        >
          <h2 className="stx-text-heading">New PPAP package</h2>
          <p className="stx-text-caption">
            Live 18-element pack per part and customer. Level 3 required items start as Missing; Appearance Approval defaults to N/A.
          </p>
          <div className="iatf-form-grid">
            <IatfField label="Part">
              <select value={form.partId} onChange={(e) => setForm({ ...form, partId: e.target.value })} required>
                <option value="">—</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>{part.partNumber || part.name}</option>
                ))}
              </select>
            </IatfField>
            <IatfField label="Customer">
              <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
            </IatfField>
            <IatfField label="PPAP level">
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                {IATF_PPAP_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
            </IatfField>
          </div>
          <button type="submit" className="app-page-btn-primary">Create pack</button>
        </form>
      )}

      {packages.length === 0 ? (
        <section className="app-page-card iatf-card">
          <p className="stx-text-caption">No PPAP packs yet. Add a part first, then open a pack here — the encyclopedia table is not a live submission.</p>
        </section>
      ) : (
        <div className="iatf-grid-2">
          <section className="app-page-card iatf-card">
            <h2 className="stx-text-heading">Packages</h2>
            <div className="iatf-table-wrap">
              <table className="iatf-table">
                    <thead>
                      <tr><th>Part</th><th>Customer</th><th>Level</th><th>Progress</th><th> </th></tr>
                    </thead>
                    <tbody>
                      {packages.map((pkg) => {
                        const part = parts.find((p) => p.id === pkg.partId)
                        const progress = ppapPackProgress(pkg.elements, pkg.level)
                        return (
                          <tr key={pkg.id}>
                            <td>
                              <button type="button" className="iatf-link" onClick={() => setOpenId(pkg.id)}>
                                {part?.partNumber || part?.name || pkg.partId}
                              </button>
                            </td>
                            <td className="stx-text-wrap">{pkg.customer || '—'}</td>
                            <td>L{pkg.level}</td>
                            <td>{progress.pct}% · {labelOf(IATF_PPAP_STATUSES, pkg.status)}</td>
                            <td>
                              <IatfTrackedActions
                                record={pkg}
                                title="Edit PPAP pack"
                                readOnly={readOnly}
                                requireReason={pkg.status === 'approved'}
                                attachKind="iatf-ppap"
                                fields={[
                                  { key: 'customer', label: 'Customer' },
                                  { key: 'level', label: 'PPAP level', type: 'select', options: IATF_PPAP_LEVELS.map((lvl) => ({ value: lvl, label: String(lvl) })) },
                                  { key: 'notes', label: 'Notes' },
                                ]}
                                onSave={(values, meta) => updatePpapPackage(pkg.id, values, meta)}
                                onAttachMeta={(fileMeta, reason) => updatePpapPackage(pkg.id, {
                                  pswFile: fileMeta.fileName,
                                  storagePath: fileMeta.storagePath || pkg.storagePath || '',
                                }, { action: 'file_attached', reason })}
                              />
                            </td>
                          </tr>
                        )
                      })}
                </tbody>
              </table>
            </div>
          </section>

          {open && (
            <section className="app-page-card iatf-card">
              <h2 className="stx-text-heading">
                Elements · L{open.level} · {ppapPackProgress(open.elements, open.level).pct}%
              </h2>
              <ol className="iatf-ppap-list">
                {IATF_PPAP_ELEMENTS.map((el) => (
                  <li key={el.id} className="iatf-ppap-row">
                    <span className="stx-text-wrap">{el.n}. {el.label}</span>
                    <select
                      className="iatf-mini"
                      value={open.elements?.[el.id] || (el.level3 ? 'missing' : 'na')}
                      disabled={readOnly}
                      onChange={(e) => setPpapElement(open.id, el.id, e.target.value)}
                    >
                      {IATF_PPAP_ELEMENT_STATES.map((st) => (
                        <option key={st.id} value={st.id}>{st.label}</option>
                      ))}
                    </select>
                  </li>
                ))}
              </ol>
              {!readOnly && (
                <div className="iatf-inline">
                  <IatfField label="PSW file name">
                    <input
                      defaultValue={open.pswFile || ''}
                      disabled={readOnly}
                      onBlur={(e) => {
                        if (e.target.value !== (open.pswFile || '')) {
                          updatePpapPackage(open.id, { pswFile: e.target.value }, { reason: 'PSW file name' })
                        }
                      }}
                      placeholder="PSW-revA.pdf"
                    />
                  </IatfField>
                </div>
              )}
              {!readOnly && open.status !== 'approved' && (
                <div className="iatf-inline">
                  {open.status !== 'submitted' && (
                    <button type="button" className="qe-btn" onClick={() => submitPpapPackage(open.id)}>Mark submitted</button>
                  )}
                  <button type="button" className="app-page-btn-primary" onClick={() => approvePpapPackage(open.id)}>
                    Customer approved
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
