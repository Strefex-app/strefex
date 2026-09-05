import { useState } from 'react'
import { IATF_GAUGE_STATUSES, labelOf } from '../../data/iatfControlCatalog'
import useIatfControlStore from '../../store/iatfControlStore'
import { gaugeCalibrationStatus } from '../../utils/iatfControlCompute'
import IatfField from './IatfField'
import IatfTrackedActions from './IatfTrackedActions'

export default function IatfGaugePanel({ parts, gauges = [], qeRecords = [], readOnly }) {
  const addGauge = useIatfControlStore((s) => s.addGauge)
  const updateGauge = useIatfControlStore((s) => s.updateGauge)
  const deleteGauge = useIatfControlStore((s) => s.deleteGauge)
  const msaRecords = (qeRecords || []).filter((r) => r.toolId === 't8-gage-rr')
  const [form, setForm] = useState({
    assetNumber: '', name: '', location: '', calibrationDue: '', partId: '', msaRecordId: '',
  })

  return (
    <div className="iatf-stack">
      {!readOnly && (
        <form
          className="app-page-card iatf-card iatf-form"
          onSubmit={(e) => {
            e.preventDefault()
            addGauge(form)
            setForm({ assetNumber: '', name: '', location: '', calibrationDue: form.calibrationDue, partId: form.partId, msaRecordId: '' })
          }}
        >
          <h2 className="stx-text-heading">Gauge / calibration register</h2>
          <p className="stx-text-caption">
            Due dates drive In calibration / Due / Overdue. Link a Quality Excellence MSA (T8 Gage R&amp;R) record when the study exists.
          </p>
          <div className="iatf-form-grid">
            <IatfField label="Asset number">
              <input value={form.assetNumber} onChange={(e) => setForm({ ...form, assetNumber: e.target.value })} />
            </IatfField>
            <IatfField label="Name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </IatfField>
            <IatfField label="Location">
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </IatfField>
            <IatfField label="Calibration due">
              <input type="date" value={form.calibrationDue} onChange={(e) => setForm({ ...form, calibrationDue: e.target.value })} />
            </IatfField>
            <IatfField label="Part">
              <select value={form.partId} onChange={(e) => setForm({ ...form, partId: e.target.value })}>
                <option value="">—</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>{part.partNumber || part.name}</option>
                ))}
              </select>
            </IatfField>
            <IatfField label="MSA record (T8)">
              <select value={form.msaRecordId} onChange={(e) => setForm({ ...form, msaRecordId: e.target.value })}>
                <option value="">—</option>
                {msaRecords.map((row) => (
                  <option key={row.id} value={row.id}>{row.title || row.number || row.id}</option>
                ))}
              </select>
            </IatfField>
          </div>
          <button type="submit" className="app-page-btn-primary">Add gauge</button>
        </form>
      )}

      <section className="app-page-card iatf-card">
        <h2 className="stx-text-heading">Gauges</h2>
        {gauges.length === 0 ? (
          <p className="stx-text-caption">No gauges on file.</p>
        ) : (
          <div className="iatf-table-wrap">
            <table className="iatf-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Name</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>MSA</th>
                  <th> </th>
                </tr>
              </thead>
              <tbody>
                {gauges.map((gauge) => {
                  const live = gaugeCalibrationStatus(gauge)
                  const msa = msaRecords.find((r) => r.id === gauge.msaRecordId)
                  return (
                    <tr key={gauge.id}>
                      <td>{gauge.assetNumber}</td>
                      <td className="stx-text-wrap">{gauge.name}</td>
                      <td>
                        <input
                          className="iatf-mini"
                          type="date"
                          value={gauge.calibrationDue || ''}
                          disabled={readOnly}
                          onChange={(e) => updateGauge(gauge.id, { calibrationDue: e.target.value })}
                        />
                      </td>
                      <td>{labelOf(IATF_GAUGE_STATUSES, live)}</td>
                      <td className="stx-text-wrap">{msa?.title || msa?.number || '—'}</td>
                      <td>
                        <IatfTrackedActions
                          record={gauge}
                          title={`Edit ${gauge.assetNumber || gauge.name}`}
                          readOnly={readOnly}
                          fields={[
                            { key: 'assetNumber', label: 'Asset number' },
                            { key: 'name', label: 'Name' },
                            { key: 'location', label: 'Location' },
                            { key: 'calibrationDue', label: 'Calibration due', type: 'date' },
                            {
                              key: 'partId',
                              label: 'Part',
                              type: 'select',
                              options: [{ value: '', label: '—' }, ...parts.map((part) => ({ value: part.id, label: part.partNumber || part.name }))],
                            },
                          ]}
                          onSave={(values, meta) => updateGauge(gauge.id, values, meta)}
                        />
                        {!readOnly && (
                          <button type="button" className="qe-btn qe-btn--danger" onClick={() => deleteGauge(gauge.id)}>Remove</button>
                        )}
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
