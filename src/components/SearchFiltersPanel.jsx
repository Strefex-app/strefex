import { useTranslation } from '../i18n/useTranslation'

const SORT_IDS = ['score', 'relevance', 'newest']

export default function SearchFiltersPanel({ filters, onChange, onApply }) {
  const { t } = useTranslation()
  const sortLabel = (id) => {
    if (id === 'score') return t('supplierFilters.sortScore')
    if (id === 'relevance') return t('supplierFilters.sortRelevance')
    if (id === 'newest') return t('supplierFilters.sortNewest')
    return id
  }
  const set = (field, value) => onChange?.({ ...filters, [field]: value })
  return (
    <div style={{ border: '1px solid #e4e7ec', borderRadius: 10, padding: 12, display: 'grid', gap: 8 }}>
      <input
        value={filters.query || ''}
        onChange={(e) => set('query', e.target.value)}
        placeholder={t('supplierFilters.queryPlaceholder')}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
        <input value={filters.country || ''} onChange={(e) => set('country', e.target.value)} placeholder={t('supplierFilters.country')} />
        <input value={filters.industry || ''} onChange={(e) => set('industry', e.target.value)} placeholder={t('supplierFilters.industry')} />
        <input value={filters.process || ''} onChange={(e) => set('process', e.target.value)} placeholder={t('supplierFilters.process')} />
        <input value={filters.certification || ''} onChange={(e) => set('certification', e.target.value)} placeholder={t('supplierFilters.certification')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
        <input
          type="number"
          value={filters.minAuditScore ?? ''}
          onChange={(e) => set('minAuditScore', e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={t('supplierFilters.minAuditScore')}
        />
        <input
          type="number"
          value={filters.maxRiskScore ?? ''}
          onChange={(e) => set('maxRiskScore', e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={t('supplierFilters.maxRiskScore')}
        />
        <select value={filters.sortBy || 'score'} onChange={(e) => set('sortBy', e.target.value)}>
          {SORT_IDS.map((id) => (
            <option key={id} value={id}>{sortLabel(id)}</option>
          ))}
        </select>
      </div>
      <div>
        <button type="button" className="app-page-btn-primary" onClick={() => onApply?.()}>
          {t('supplierFilters.apply')}
        </button>
      </div>
    </div>
  )
}
