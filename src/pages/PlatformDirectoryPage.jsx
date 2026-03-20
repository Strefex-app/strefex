import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { isSupabaseConfigured, platformDirectoryContactsService } from '../services/supabaseService'

function downloadCsv(filename, rows) {
  const headers = [
    'segment',
    'company_name',
    'country',
    'contact_name',
    'position',
    'email',
    'phone',
    'website',
    'source_ref',
  ]
  const esc = (v) => {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(',')]
  rows.forEach((r) => {
    lines.push(headers.map((h) => esc(r[h])).join(','))
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function PlatformDirectoryPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [segment, setSegment] = useState('all') // all | Plastic | Stamping
  const [query, setQuery] = useState('')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        if (!isSupabaseConfigured) {
          if (!cancelled) {
            setRows([])
            setError('Supabase is not configured. Directory contacts are stored in the database (migration 017) and are not shipped in the app bundle.')
          }
          return
        }
        const data = await platformDirectoryContactsService.list(null, {
          orderBy: 'company_name',
          ascending: true,
        })
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : [])
          if (!data?.length) {
            setError(
              'No directory rows returned. If this is a new environment, run migration 017_platform_directory_contacts.sql on Supabase.',
            )
          }
        }
      } catch (err) {
        if (!cancelled) {
          setRows([])
          setError(err?.message || 'Failed to load platform directory.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (segment !== 'all' && String(r.segment) !== segment) return false
      if (!q) return true
      const hay = [
        r.company_name,
        r.country,
        r.contact_name,
        r.position,
        r.email,
        r.phone,
        r.website,
        r.source_ref,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
  }, [rows, segment, query])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const s = String(a.segment || '').localeCompare(String(b.segment || ''))
      if (s !== 0) return s
      return String(a.company_name || '').localeCompare(String(b.company_name || ''), undefined, {
        sensitivity: 'base',
      })
    })
  }, [filtered])

  return (
    <AppLayout>
      <div className="app-page" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <button type="button" className="app-page-back-link" onClick={() => navigate('/dashboard/buyer')}>
          ← Back to Buyer Workspace
        </button>

        <div className="app-page-card">
          <h2 className="app-page-title">Buyer directory</h2>
          <p className="app-page-subtitle">
            Imported B2B contacts (plastic & stamping company lists), available from the buyer area.{' '}
            <strong>Visible only to superadmin.</strong> Confidential — do not share outside STREFEX operations.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
            <span className="app-page-chip">Rows: {sorted.length}</span>
            <button
              type="button"
              className="app-page-btn-outline"
              disabled={sorted.length === 0}
              onClick={() => downloadCsv('platform-directory-contacts.csv', sorted)}
            >
              Export CSV
            </button>
          </div>
          {error && (
            <p style={{ color: '#b42318', marginTop: 12, fontSize: 14 }} role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="app-page-card">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16,
              alignItems: 'center',
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              Segment
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', minWidth: 160 }}
              >
                <option value="all">All</option>
                <option value="Plastic">Plastic</option>
                <option value="Stamping">Stamping</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 240px', fontSize: 13 }}>
              Search
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Company, contact, email, phone…"
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </label>
          </div>

          {loading ? (
            <p className="app-page-subtitle">Loading directory…</p>
          ) : sorted.length === 0 ? (
            <p className="app-page-subtitle">No contacts match the current filters.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '8px 6px' }}>Segment</th>
                    <th style={{ padding: '8px 6px' }}>Company</th>
                    <th style={{ padding: '8px 6px' }}>Country</th>
                    <th style={{ padding: '8px 6px' }}>Contact</th>
                    <th style={{ padding: '8px 6px' }}>Role</th>
                    <th style={{ padding: '8px 6px' }}>Email</th>
                    <th style={{ padding: '8px 6px' }}>Phone</th>
                    <th style={{ padding: '8px 6px' }}>Web</th>
                    <th style={{ padding: '8px 6px' }}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.id || `${r.segment}-${r.company_name}-${r.email}-${r.contact_name}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>{r.segment}</td>
                      <td style={{ padding: '8px 6px', maxWidth: 200 }}>{r.company_name}</td>
                      <td style={{ padding: '8px 6px' }}>{r.country}</td>
                      <td style={{ padding: '8px 6px', maxWidth: 180 }}>{r.contact_name}</td>
                      <td style={{ padding: '8px 6px', maxWidth: 160 }}>{r.position}</td>
                      <td style={{ padding: '8px 6px', wordBreak: 'break-all', maxWidth: 200 }}>
                        {r.email ? (
                          <a href={`mailto:${r.email}`}>{r.email}</a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>{r.phone || '—'}</td>
                      <td style={{ padding: '8px 6px', wordBreak: 'break-all', maxWidth: 140 }}>
                        {r.website ? (
                          <a href={/^https?:\/\//i.test(r.website) ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer">
                            {r.website}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '8px 6px', fontSize: 11, color: '#6b7280' }}>{r.source_ref || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
