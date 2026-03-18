const SORT_OPTIONS = [
  { id: 'score', label: 'Best Score' },
  { id: 'relevance', label: 'Best Match' },
  { id: 'newest', label: 'Newest Suppliers' },
]

export default function SearchFiltersPanel({ filters, onChange, onApply }) {
  const set = (field, value) => onChange?.({ ...filters, [field]: value })
  return (
    <div style={{ border: '1px solid #e4e7ec', borderRadius: 10, padding: 12, display: 'grid', gap: 8 }}>
      <input
        value={filters.query || ''}
        onChange={(e) => set('query', e.target.value)}
        placeholder="Search suppliers, processes, capabilities..."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
        <input value={filters.country || ''} onChange={(e) => set('country', e.target.value)} placeholder="Country" />
        <input value={filters.industry || ''} onChange={(e) => set('industry', e.target.value)} placeholder="Industry" />
        <input value={filters.process || ''} onChange={(e) => set('process', e.target.value)} placeholder="Process" />
        <input value={filters.certification || ''} onChange={(e) => set('certification', e.target.value)} placeholder="Certification" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
        <input
          type="number"
          value={filters.minAuditScore ?? ''}
          onChange={(e) => set('minAuditScore', e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="Min audit score"
        />
        <input
          type="number"
          value={filters.maxRiskScore ?? ''}
          onChange={(e) => set('maxRiskScore', e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="Max risk score"
        />
        <select value={filters.sortBy || 'score'} onChange={(e) => set('sortBy', e.target.value)}>
          {SORT_OPTIONS.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
        </select>
      </div>
      <div>
        <button type="button" className="app-page-btn-primary" onClick={() => onApply?.()}>
          Apply Filters
        </button>
      </div>
    </div>
  )
}
