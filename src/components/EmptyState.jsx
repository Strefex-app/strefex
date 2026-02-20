/**
 * Reusable empty-state placeholder for lists, tables, grids.
 *
 * Usage:
 *   <EmptyState icon="folder" title="No projects yet" message="Create your first project." />
 */

const ICONS = {
  folder: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  search: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  list: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  users: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  chart: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  document: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  inbox: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <path d="M22 12h-6l-2 3H10l-2-3H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

export default function EmptyState({
  icon = 'inbox',
  title = 'No data',
  message = '',
  action,
  actionLabel,
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 24px', textAlign: 'center',
      color: '#999',
    }}>
      <div style={{ marginBottom: 16, opacity: 0.5 }}>
        {ICONS[icon] || ICONS.inbox}
      </div>
      <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: '#666' }}>
        {title}
      </h3>
      {message && (
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#999', maxWidth: 320 }}>
          {message}
        </p>
      )}
      {action && actionLabel && (
        <button
          onClick={action}
          style={{
            padding: '8px 20px', border: 'none', borderRadius: 6,
            background: 'linear-gradient(135deg, #000222, #000888)', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
