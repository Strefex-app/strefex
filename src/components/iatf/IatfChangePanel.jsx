import { useState } from 'react'
import { IATF_CHANGE_IMPACTS, IATF_CHANGE_STATUSES, labelOf } from '../../data/iatfControlCatalog'
import useIatfControlStore from '../../store/iatfControlStore'
import IatfField from './IatfField'
import IatfTrackedActions from './IatfTrackedActions'

export default function IatfChangePanel({ parts, processes, documents = [], changes = [], readOnly }) {
  const addChange = useIatfControlStore((s) => s.addChange)
  const updateChange = useIatfControlStore((s) => s.updateChange)
  const approveChange = useIatfControlStore((s) => s.approveChange)
  const closeChange = useIatfControlStore((s) => s.closeChange)
  const [form, setForm] = useState({
    title: '', partId: '', processId: '', reason: '', impacts: ['pfmea', 'controlPlan'],
  })

  const toggleImpact = (id) => {
    setForm((prev) => ({
      ...prev,
      impacts: prev.impacts.includes(id)
        ? prev.impacts.filter((item) => item !== id)
        : [...prev.impacts, id],
    }))
  }

  return (
    <div className="iatf-stack">
      {!readOnly && (
        <form
          className="app-page-card iatf-card iatf-form"
          onSubmit={(e) => {
            e.preventDefault()
            addChange(form)
            setForm({ title: '', partId: form.partId, processId: form.processId, reason: '', impacts: form.impacts })
          }}
        >
          <h2 className="stx-text-heading">Change request (8.5.6)</h2>
          <p className="stx-text-caption">
            Approving obsoletes related work instructions for that part, flags PFMEA and control plan, and reopens an approved PPAP pack if PPAP is in scope.
          </p>
          <div className="iatf-form-grid">
            <IatfField label="Title">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </IatfField>
            <IatfField label="Part">
              <select value={form.partId} onChange={(e) => setForm({ ...form, partId: e.target.value })}>
                <option value="">—</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>{part.partNumber || part.name}</option>
                ))}
              </select>
            </IatfField>
            <IatfField label="Process">
              <select value={form.processId} onChange={(e) => setForm({ ...form, processId: e.target.value })}>
                <option value="">—</option>
                {processes.map((prc) => (
                  <option key={prc.id} value={prc.id}>{prc.name}</option>
                ))}
              </select>
            </IatfField>
            <IatfField label="Reason">
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </IatfField>
          </div>
          <div className="iatf-impact-row">
            {IATF_CHANGE_IMPACTS.map((item) => (
              <label key={item.id} className="iatf-check">
                <input
                  type="checkbox"
                  checked={form.impacts.includes(item.id)}
                  onChange={() => toggleImpact(item.id)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <button type="submit" className="app-page-btn-primary">Add draft</button>
        </form>
      )}

      <section className="app-page-card iatf-card">
        <h2 className="stx-text-heading">Change register</h2>
        {changes.length === 0 ? (
          <p className="stx-text-caption">No change requests yet.</p>
        ) : (
          <div className="iatf-table-wrap">
            <table className="iatf-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Title</th>
                  <th>Impacts</th>
                  <th>Status</th>
                  <th>Flagged docs</th>
                  <th> </th>
                </tr>
              </thead>
              <tbody>
                {changes.map((row) => (
                  <tr key={row.id}>
                    <td>{row.number}</td>
                    <td className="stx-text-wrap">{row.title}</td>
                    <td className="stx-text-wrap">
                      {(row.impacts || []).map((id) => labelOf(IATF_CHANGE_IMPACTS, id)).join(', ') || '—'}
                    </td>
                    <td>{labelOf(IATF_CHANGE_STATUSES, row.status)}</td>
                    <td>
                      {(row.flaggedDocIds || []).length
                        ? (row.flaggedDocIds || []).map((id) => documents.find((d) => d.id === id)?.docNumber || id).join(', ')
                        : '—'}
                    </td>
                    <td>
                      <IatfTrackedActions
                        record={row}
                        title={`Edit ${row.number}`}
                        readOnly={readOnly || row.status === 'closed'}
                        requireReason={row.status === 'approved'}
                        fields={[
                          { key: 'title', label: 'Title' },
                          { key: 'reason', label: 'Reason' },
                        ]}
                        onSave={(values, meta) => updateChange(row.id, values, meta)}
                      />
                      {!readOnly && row.status === 'draft' && (
                        <button type="button" className="qe-btn" onClick={() => approveChange(row.id)}>Approve</button>
                      )}
                      {!readOnly && row.status === 'approved' && (
                        <button type="button" className="qe-btn" onClick={() => closeChange(row.id)}>Close</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
