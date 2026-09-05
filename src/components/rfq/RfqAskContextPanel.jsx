import {
  labelOf,
  PAYMENT_TERMS_ASK,
  QUALITY_LEVELS,
  summarizeRfqAsk,
} from '../../utils/standardRfqSchema'

/**
 * Buyer ask summary shown on the plant bid form — mirrors what comparison expects back.
 */
export default function RfqAskContextPanel({ rfq = null, requirements = null, className = 'rfq-ask-context' }) {
  const req = requirements || rfq?.requirements || {}
  const ask = summarizeRfqAsk({
    rfqType: rfq?.rfqType,
    title: rfq?.title,
    requirements: req,
  })

  if (!req || Object.keys(req).length === 0) return null

  return (
    <div className={className}>
      <p className="rfq-ask-context__title">Buyer request — reply on the fields below</p>
      <ul className="rfq-ask-context__list">
        {ask.commercial.map((line) => (
          <li key={line} className="stx-text-wrap">{line}</li>
        ))}
        {req.monthlyCapacityAsk ? (
          <li className="stx-text-wrap">
            Capacity needed: {req.monthlyCapacityAsk} units / month
          </li>
        ) : null}
        {req.moqAsk ? (
          <li className="stx-text-wrap">Max MOQ acceptable: {req.moqAsk}</li>
        ) : null}
        {req.incoterms ? (
          <li className="stx-text-wrap">Incoterms ask: {req.incoterms}</li>
        ) : null}
        {req.paymentTermsAsk ? (
          <li className="stx-text-wrap">
            Payment terms ask: {labelOf(PAYMENT_TERMS_ASK, req.paymentTermsAsk)}
          </li>
        ) : null}
        {ask.quality.length > 0 ? (
          <li className="stx-text-wrap">Quality pack: {ask.quality.join(' · ')}</li>
        ) : (
          <li className="stx-text-wrap">Quality: {ask.qualityLevelLabel}</li>
        )}
      </ul>
    </div>
  )
}
