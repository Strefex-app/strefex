import { useEffect, useState } from 'react'
import StandardRfqBidForm, { isStandardBidReady } from './rfq/StandardRfqBidForm'
import { bidFormToPayload, seedBidFormFromAsk } from '../utils/standardRfqSchema'
import '../pages/SellerDashboard.css'

export default function RFQResponseForm({ rfq, supplierId, onSubmit }) {
  const [form, setForm] = useState(() => seedBidFormFromAsk(rfq?.requirements))

  useEffect(() => {
    setForm(seedBidFormFromAsk(rfq?.requirements))
  }, [rfq?.id, rfq?.requirements])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!supplierId || !rfq?.id || !isStandardBidReady(form)) return
    const payload = bidFormToPayload(form)
    onSubmit?.({
      rfqId: rfq.id,
      supplierId,
      ...payload,
      price: payload.unitPrice,
      leadTime: payload.leadTimeDays,
      responseFields: {
        targetCurrency: payload.currency || 'USD',
        supplierName: 'Supplier',
      },
    })
    setForm(seedBidFormFromAsk(rfq?.requirements))
  }

  return (
    <form onSubmit={handleSubmit} className="sd-response-form">
      <div className="stx-text-body" style={{ fontWeight: 600, marginBottom: 8 }}>
        {rfq?.title || 'RFQ Response'}
      </div>
      <p className="stx-text-caption stx-text-wrap" style={{ marginBottom: 12 }}>
        Standard bid: unit price with material / operations / flexible costs, feasibility, and quality level.
      </p>
      <StandardRfqBidForm
        value={form}
        onChange={setForm}
        askRequirements={rfq?.requirements}
        idPrefix={`legacy-bid-${rfq?.id || 'x'}`}
      />
      <div className="sd-form-actions" style={{ marginTop: 12 }}>
        <button type="submit" className="sd-btn sd-btn-primary" disabled={!isStandardBidReady(form)}>
          Submit response
        </button>
      </div>
    </form>
  )
}
