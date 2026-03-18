import { useMemo, useState } from 'react'

export default function RFQBuilder({ shortlisted = [], onSubmit }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [selected, setSelected] = useState([])
  const [currency, setCurrency] = useState('USD')
  const [targetLeadTime, setTargetLeadTime] = useState('')
  const [targetMoq, setTargetMoq] = useState('')

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && selected.length > 0
  }, [title, selected])

  const toggleSupplier = (supplierId) => {
    setSelected((prev) =>
      prev.includes(supplierId) ? prev.filter((id) => id !== supplierId) : [...prev, supplierId]
    )
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
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="RFQ title *" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="RFQ description" rows={3} />
      <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8 }}>
        <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="Currency (e.g. USD)" />
        <input type="number" value={targetLeadTime} onChange={(e) => setTargetLeadTime(e.target.value)} placeholder="Target lead time (days)" />
        <input type="number" value={targetMoq} onChange={(e) => setTargetMoq(e.target.value)} placeholder="Target MOQ" />
      </div>
      <div style={{ border: '1px solid #e4e7ec', borderRadius: 8, padding: 8 }}>
        <div style={{ marginBottom: 8, fontWeight: 700 }}>Select suppliers</div>
        {shortlisted.length === 0 ? (
          <div style={{ color: '#667085' }}>No shortlisted suppliers.</div>
        ) : (
          shortlisted.map((s) => (
            <label key={s.supplier_id || s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={selected.includes(s.supplier_id || s.id)}
                onChange={() => toggleSupplier(s.supplier_id || s.id)}
              />
              <span>{s.display_name || s.name || s.supplier_id || s.id}</span>
            </label>
          ))
        )}
      </div>
      <button type="submit" className="app-page-btn-primary" disabled={!canSubmit}>
        Send RFQ ({selected.length})
      </button>
    </form>
  )
}
