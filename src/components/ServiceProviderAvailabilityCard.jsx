export const SERVICE_CATEGORY_LABELS = {
  'project-management': 'Project Management',
  'supplier-services': 'Supplier Services',
  'quality-services': 'Quality & Compliance',
}

export default function ServiceProviderAvailabilityCard({
  industryLabel,
  canSeeNames,
  providers = [],
  onRequestService,
  onRequestProvider,
  cardStyle = null,
}) {
  return (
    <div className="app-page-card" style={cardStyle || undefined}>
      <h3 className="exec-section-title">Service Providers for {industryLabel}</h3>
      <p style={{ margin: '6px 0 14px', fontSize: 13, color: '#666' }}>
        Request project management, buy-off and related supplier services from registered providers in this industry.
      </p>
      {onRequestService && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {Object.entries(SERVICE_CATEGORY_LABELS).map(([serviceId, label]) => (
            <button
              key={serviceId}
              type="button"
              className="exec-btn-secondary"
              onClick={() => onRequestService?.(serviceId, label)}
            >
              Request {label}
            </button>
          ))}
        </div>
      )}
      {providers.length === 0 ? (
        <div style={{ fontSize: 13, color: '#888' }}>
          No service providers registered yet for this industry.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {providers.map((provider, idx) => (
            <div
              key={provider.id || `${provider.company}-${idx}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 12px',
                background: '#fff',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                {canSeeNames ? provider.company : `Service Provider #${String(idx + 1).padStart(2, '0')}`}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                {onRequestProvider && (
                  <button
                    type="button"
                    className="exec-btn-secondary"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={() => {
                      const primaryService = Array.isArray(provider?.serviceCategories) && provider.serviceCategories.length > 0
                        ? provider.serviceCategories[0]
                        : 'supplier-services'
                      const primaryServiceLabel = SERVICE_CATEGORY_LABELS[primaryService] || primaryService.replace(/-/g, ' ')
                      onRequestProvider(provider, {
                        serviceCategoryId: primaryService,
                        serviceCategoryLabel: primaryServiceLabel,
                      })
                    }}
                  >
                    Request This Provider
                  </button>
                )}
                {(provider.serviceCategories?.length > 0 ? provider.serviceCategories : ['supplier-services']).map((serviceId) => (
                  <span
                    key={`${provider.id}-${serviceId}`}
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {SERVICE_CATEGORY_LABELS[serviceId] || serviceId}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
