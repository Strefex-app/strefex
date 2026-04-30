import { useState } from 'react'

export default function RFQResponseForm({ rfq, supplierId, onSubmit }) {
  const [price, setPrice] = useState('')
  const [leadTime, setLeadTime] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [warrantyMonths, setWarrantyMonths] = useState('')
  const [moq, setMoq] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [attachments, setAttachments] = useState([])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!supplierId || !rfq?.id) return
    onSubmit?.({
      rfqId: rfq.id,
      supplierId,
      price: price === '' ? null : Number(price),
      leadTime: leadTime === '' ? null : Number(leadTime),
      currency: currency || 'USD',
      warrantyMonths: warrantyMonths === '' ? null : Number(warrantyMonths),
      moq: moq === '' ? null : Number(moq),
      paymentTerms,
      attachments,
      responseFields: {
        targetCurrency: currency || 'USD',
        supplierName: 'Supplier',
      },
      notes,
    })
    setPrice('')
    setLeadTime('')
    setCurrency('USD')
    setWarrantyMonths('')
    setMoq('')
    setPaymentTerms('')
    setNotes('')
    setAttachments([])
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontWeight: 600 }}>{rfq?.title || 'RFQ Response'}</div>
      <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" />
      <input type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} placeholder="Lead time (days)" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
        <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="Currency" />
        <input type="number" value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} placeholder="Warranty (months)" />
        <input type="number" value={moq} onChange={(e) => setMoq(e.target.value)} placeholder="MOQ" />
      </div>
      <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Payment terms" />
      <input
        type="file"
        multiple
        accept=".pdf,.dwg,.dxf,.step,.stp,.png,.jpg,.jpeg"
        onChange={(e) => setAttachments(Array.from(e.target.files || []))}
      />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes" />
      <button type="submit" className="app-page-btn-primary">Submit Response</button>
    </form>
  )
}
