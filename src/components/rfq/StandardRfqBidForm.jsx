import {
  CAPACITY_STATUSES,
  FEASIBILITY_LEVELS,
  INCOTERMS,
  QUALITY_LEVELS,
} from '../../utils/standardRfqSchema'
import RfqAskContextPanel from './RfqAskContextPanel'

/**
 * Unified plant bid form — one schema for Quoting inbox, Supplier workspace, and comparison matrix.
 */
export default function StandardRfqBidForm({
  value,
  onChange,
  askRequirements = null,
  gridClassName = 'sd-form-grid',
  idPrefix = 'rfq-bid',
}) {
  const patch = (key, val) => onChange({ ...value, [key]: val })
  const patchCost = (key, val) => onChange({
    ...value,
    costs: { ...(value.costs || {}), [key]: val },
  })

  const showPpap = Boolean(askRequirements?.ppapLevel)
  const showIncoterms = Boolean(askRequirements?.incoterms)
  const showCapacityDetail = Boolean(askRequirements?.monthlyCapacityAsk)
  const maxLead = askRequirements?.maxLeadTime

  return (
    <div className={gridClassName}>
      {askRequirements ? (
        <div className="sd-form-full">
          <RfqAskContextPanel requirements={askRequirements} />
        </div>
      ) : null}
      <div className="sd-form-group">
        <label htmlFor={`${idPrefix}-unit`}>Unit price *</label>
        <input
          id={`${idPrefix}-unit`}
          type="number"
          min="0"
          step="0.01"
          value={value.unitPrice ?? ''}
          onChange={(e) => patch('unitPrice', e.target.value)}
          placeholder="Quoted unit price"
        />
      </div>
      <div className="sd-form-group">
        <label htmlFor={`${idPrefix}-currency`}>Currency</label>
        <select
          id={`${idPrefix}-currency`}
          value={value.currency || 'USD'}
          onChange={(e) => patch('currency', e.target.value)}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="CNY">CNY</option>
        </select>
      </div>
      <div className="sd-form-group">
        <label htmlFor={`${idPrefix}-lead`}>
          Lead time (days) *
          {maxLead ? ` — buyer max ${maxLead}d` : ''}
        </label>
        <input
          id={`${idPrefix}-lead`}
          type="number"
          min="1"
          value={value.leadTimeDays ?? ''}
          onChange={(e) => patch('leadTimeDays', e.target.value)}
          placeholder="Days"
        />
      </div>
      <div className="sd-form-group">
        <label htmlFor={`${idPrefix}-mat`}>Material cost / unit</label>
        <input
          id={`${idPrefix}-mat`}
          type="number"
          min="0"
          step="0.01"
          value={value.costs?.material ?? ''}
          onChange={(e) => patchCost('material', e.target.value)}
          placeholder="Standard material"
        />
      </div>
      <div className="sd-form-group">
        <label htmlFor={`${idPrefix}-ops`}>Operations cost / unit</label>
        <input
          id={`${idPrefix}-ops`}
          type="number"
          min="0"
          step="0.01"
          value={value.costs?.operations ?? ''}
          onChange={(e) => patchCost('operations', e.target.value)}
          placeholder="Process / machine time"
        />
      </div>
      <div className="sd-form-group">
        <label htmlFor={`${idPrefix}-flex`}>Flexible cost / unit</label>
        <input
          id={`${idPrefix}-flex`}
          type="number"
          min="0"
          step="0.01"
          value={value.costs?.flexible ?? ''}
          onChange={(e) => patchCost('flexible', e.target.value)}
          placeholder="Overhead, logistics, tooling amort."
        />
      </div>
      <div className="sd-form-group">
        <label htmlFor={`${idPrefix}-feas`}>Feasibility</label>
        <select
          id={`${idPrefix}-feas`}
          value={value.feasibility || 'feasible'}
          onChange={(e) => patch('feasibility', e.target.value)}
        >
          {FEASIBILITY_LEVELS.map((row) => (
            <option key={row.id} value={row.id}>{row.label}</option>
          ))}
        </select>
      </div>
      <div className="sd-form-group">
        <label htmlFor={`${idPrefix}-quality`}>Quality level</label>
        <select
          id={`${idPrefix}-quality`}
          value={value.qualityLevel || 'iso_9001'}
          onChange={(e) => patch('qualityLevel', e.target.value)}
        >
          {QUALITY_LEVELS.map((row) => (
            <option key={row.id} value={row.id}>{row.label}</option>
          ))}
        </select>
      </div>
      <div className="sd-form-group">
        <label htmlFor={`${idPrefix}-cap`}>Capacity status</label>
        <select
          id={`${idPrefix}-cap`}
          value={value.capacityStatus || 'available'}
          onChange={(e) => patch('capacityStatus', e.target.value)}
        >
          {CAPACITY_STATUSES.map((row) => (
            <option key={row.id} value={row.id}>{row.label}</option>
          ))}
        </select>
      </div>
      {showCapacityDetail ? (
        <div className="sd-form-group">
          <label htmlFor={`${idPrefix}-monthly`}>
            Monthly capacity (units)
            {askRequirements.monthlyCapacityAsk
              ? ` — buyer needs ${askRequirements.monthlyCapacityAsk}/mo`
              : ''}
          </label>
          <input
            id={`${idPrefix}-monthly`}
            type="number"
            min="0"
            value={value.monthlyCapacity ?? ''}
            onChange={(e) => patch('monthlyCapacity', e.target.value)}
            placeholder="Units you can deliver per month"
          />
        </div>
      ) : null}
      <div className="sd-form-group">
        <label htmlFor={`${idPrefix}-moq`}>MOQ</label>
        <input
          id={`${idPrefix}-moq`}
          type="number"
          min="0"
          value={value.moq ?? ''}
          onChange={(e) => patch('moq', e.target.value)}
        />
      </div>
      {showPpap ? (
        <div className="sd-form-group">
          <label htmlFor={`${idPrefix}-ppap`}>
            PPAP level offered
            {askRequirements.ppapLevel ? ` (ask: L${askRequirements.ppapLevel})` : ''}
          </label>
          <input
            id={`${idPrefix}-ppap`}
            type="text"
            value={value.ppapCommit ?? ''}
            onChange={(e) => patch('ppapCommit', e.target.value)}
            placeholder="e.g. 3"
          />
        </div>
      ) : null}
      {showIncoterms ? (
        <div className="sd-form-group">
          <label htmlFor={`${idPrefix}-incoterms`}>
            Incoterms offered
            {askRequirements.incoterms ? ` (buyer ask: ${askRequirements.incoterms})` : ''}
          </label>
          <select
            id={`${idPrefix}-incoterms`}
            value={value.incotermsOffer || ''}
            onChange={(e) => patch('incotermsOffer', e.target.value)}
          >
            {INCOTERMS.filter((row) => row.id).map((row) => (
              <option key={row.id} value={row.id}>{row.label}</option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="sd-form-group">
        <label htmlFor={`${idPrefix}-pay`}>Payment terms</label>
        <input
          id={`${idPrefix}-pay`}
          type="text"
          value={value.paymentTerms ?? ''}
          onChange={(e) => patch('paymentTerms', e.target.value)}
          placeholder="Net 30, milestone…"
        />
      </div>
      <div className="sd-form-group">
        <label htmlFor={`${idPrefix}-warranty`}>Warranty</label>
        <input
          id={`${idPrefix}-warranty`}
          type="text"
          value={value.warranty ?? '12 months'}
          onChange={(e) => patch('warranty', e.target.value)}
        />
      </div>
      <div className="sd-form-group sd-form-full">
        <label htmlFor={`${idPrefix}-cert`}>
          <input
            id={`${idPrefix}-cert`}
            type="checkbox"
            checked={Boolean(value.certConfirm)}
            onChange={(e) => patch('certConfirm', e.target.checked)}
          />
          {' '}Confirm required certificates / quality evidence can be supplied
        </label>
      </div>
      <div className="sd-form-group sd-form-full">
        <label htmlFor={`${idPrefix}-notes`}>Notes</label>
        <textarea
          id={`${idPrefix}-notes`}
          value={value.notes ?? ''}
          onChange={(e) => patch('notes', e.target.value)}
          placeholder="Clarifications, exclusions, process changes…"
          rows={3}
        />
      </div>
    </div>
  )
}

export function isStandardBidReady(form) {
  return Boolean(form?.unitPrice && form?.leadTimeDays)
}
