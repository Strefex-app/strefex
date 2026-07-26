import { useEffect, useMemo, useState } from 'react'
import { ToggleCheckButton } from './ToggleCheckButton'

export default function RFQBuilder({ shortlisted = [], onSubmit }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [selected, setSelected] = useState([])
  const [currency, setCurrency] = useState('USD')
  const [targetLeadTime, setTargetLeadTime] = useState('')
  const [targetMoq, setTargetMoq] = useState('')

  useEffect(() => {
    setSelected(shortlisted.map((s) => s.supplier_id || s.id).filter(Boolean))
  }, [shortlisted])

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && selected.length > 0
  }, [title, selected])

  const toggleSupplier = (supplierId) => {
    setSelected((prev) =>
      prev.includes(supplierId) ? prev.filter((id) => id !== supplierId) : [...prev, supplierId],
    )
  }

  const selectAll = () => {
    setSelected(shortlisted.map((s) => s.supplier_id || s.id).filter(Boolean))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit?.({
      title,
      description,
      deadline: deadline || null,
      supplierIds: selected,
      requirements: {
        currency,
        targetLeadTime: targetLeadTime === '' ? null : Number(targetLeadTime),
        targetMoq: targetMoq === '' ? null : Number(targetMoq),
      },
    })
    setTitle('')
    setDescription('')
    setDeadline('')
    setTargetLeadTime('')
    setTargetMoq('')
  }

  return (
    <form onSubmit={submit} className="bw-rfq-form">
      <label className="bw-rfq-field">
        <span className="bw-rfq-label">RFQ title *</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CNC machined housing — Q3 batch" />
      </label>
      <label className="bw-rfq-field">
        <span className="bw-rfq-label">Description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Scope, materials, tolerances, delivery expectations…" rows={4} />
      </label>
      <label className="bw-rfq-field">
        <span className="bw-rfq-label">Response deadline</span>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </label>
      <div className="bw-rfq-field-grid">
        <label className="bw-rfq-field">
          <span className="bw-rfq-label">Currency</span>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
        </label>
        <label className="bw-rfq-field">
          <span className="bw-rfq-label">Target lead time (days)</span>
          <input type="number" min="0" value={targetLeadTime} onChange={(e) => setTargetLeadTime(e.target.value)} placeholder="30" />
        </label>
        <label className="bw-rfq-field">
          <span className="bw-rfq-label">Target MOQ</span>
          <input type="number" min="0" value={targetMoq} onChange={(e) => setTargetMoq(e.target.value)} placeholder="100" />
        </label>
      </div>
      <div className="bw-rfq-suppliers">
        <div className="bw-rfq-suppliers__head">
          <span className="bw-rfq-label">Invite suppliers ({selected.length}/{shortlisted.length})</span>
          {shortlisted.length > 1 && (
            <button type="button" className="app-page-btn-outline" onClick={selectAll}>
              Select all
            </button>
          )}
        </div>
        {shortlisted.length === 0 ? (
          <p className="app-page-subtitle" style={{ margin: 0 }}>No shortlisted suppliers.</p>
        ) : (
          shortlisted.map((s) => {
            const sid = s.supplier_id || s.id
            return (
              <ToggleCheckButton
                key={sid}
                style={{ display: 'flex', width: '100%', marginBottom: 6 }}
                checked={selected.includes(sid)}
                onChange={() => toggleSupplier(sid)}
              >
                {s.display_name || s.name || sid}
              </ToggleCheckButton>
            )
          })
        )}
      </div>
      <button type="submit" className="app-page-btn-primary" disabled={!canSubmit}>
        Send RFQ ({selected.length})
      </button>
    </form>
  )
}
