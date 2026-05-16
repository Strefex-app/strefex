import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuditProStore from '../../store/auditProStore'
import { Card, STATUS_COLORS } from './auditProUi'

export default function AuditProCalendar() {
  const navigate = useNavigate()
  const audits = useAuditProStore((s) => s.audits)
  const reminders = useAuditProStore((s) => s.reminders)
  const dismissReminder = useAuditProStore((s) => s.dismissReminder)

  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())

  const dim = new Date(year, month + 1, 0).getDate()
  const fd = new Date(year, month, 1).getDay()
  const prev = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }
  const next = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }
  const mName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })

  const getDay = (d) => {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return {
      audits: audits.filter((a) => a.plannedDate === ds),
      rems: (reminders || []).filter((r) => r.dueDate === ds && r.status === 'Open'),
    }
  }

  const cells = []
  for (let i = 0; i < fd; i++) cells.push(null)
  for (let i = 1; i <= dim; i++) cells.push(i)

  const openRems = (reminders || []).filter((r) => r.status === 'Open').sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(240px,300px)', gap: 18 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <button type="button" className="ap-input" style={{ width: 'auto', cursor: 'pointer', color: 'var(--color-muted)', padding: '7px 13px' }} onClick={prev}>
            ←
          </button>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-primary)' }}>{mName}</div>
          <button type="button" className="ap-input" style={{ width: 'auto', cursor: 'pointer', color: 'var(--color-muted)', padding: '7px 13px' }} onClick={next}>
            →
          </button>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-surface)' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} style={{ padding: 8, textAlign: 'center', fontSize: 10, color: 'var(--color-muted)', fontWeight: 700, borderBottom: '1px solid var(--border-color)' }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, i) => {
              const isT = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const da = day ? getDay(day).audits : []
              const dr = day ? getDay(day).rems : []
              return (
                <div
                  key={i}
                  style={{
                    minHeight: 80,
                    padding: '5px 4px',
                    borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border-color)' : 'none',
                    borderBottom: '1px solid var(--border-color)',
                    background: isT ? 'var(--accent-light)' : 'transparent',
                  }}
                >
                  {day ? (
                    <>
                      <div style={{ fontSize: 10, fontWeight: isT ? 700 : 400, color: isT ? 'var(--accent)' : 'var(--color-muted)', marginBottom: 2 }}>{day}</div>
                      {da.map((a) => (
                        <div
                          key={a.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/management/auditors/conduct/${a.id}`)}
                          onKeyDown={(e) => e.key === 'Enter' && navigate(`/management/auditors/conduct/${a.id}`)}
                          style={{
                            background: `${STATUS_COLORS[a.status] || '#374151'}25`,
                            border: `1px solid ${STATUS_COLORS[a.status] || '#374151'}55`,
                            borderRadius: 3,
                            padding: '1px 5px',
                            marginBottom: 2,
                            cursor: 'pointer',
                            fontSize: 9,
                            color: STATUS_COLORS[a.status] || '#94a3b8',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={a.title}
                        >
                          ◫ {a.title.slice(0, 16)}
                        </div>
                      ))}
                      {dr.map((r) => {
                        const od = new Date(`${r.dueDate}T12:00:00`) < startOfToday
                        return (
                          <div
                            key={r.id}
                            style={{
                              background: od ? 'var(--surface-danger-soft)' : 'var(--accent-light)',
                              border: `1px solid ${od ? 'var(--danger)' : 'var(--border-color)'}`,
                              borderRadius: 3,
                              padding: '1px 5px',
                              marginBottom: 2,
                              fontSize: 9,
                              color: od ? 'var(--danger-text)' : 'var(--accent)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={r.title}
                          >
                            ⏰ {r.title.slice(0, 16)}
                          </div>
                        )
                      })}
                    </>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        <Card title={`Reminders (${openRems.length})`} icon="⏰">
          {openRems.length === 0 && <div style={{ color: 'var(--color-muted)', fontSize: 11 }}>All caught up!</div>}
          {openRems.map((r) => {
            const days = Math.ceil((new Date(`${r.dueDate}T12:00:00`) - startOfToday) / 86400000)
            const od = days < 0
            const aud = audits.find((a) => a.id === r.auditId)
            return (
              <div key={r.id} style={{ background: od ? 'var(--surface-danger-soft)' : 'var(--bg-surface)', border: `1px solid ${od ? 'var(--danger)' : 'var(--border-light)'}`, borderRadius: 8, padding: '9px 11px', marginBottom: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: od ? 'var(--danger-text)' : 'var(--color-primary)', fontWeight: 500, marginBottom: 3, lineHeight: 1.35 }} className="stx-text-wrap">
                      {r.title.slice(0, 54)}
                      {r.title.length > 54 ? '…' : ''}
                    </div>
                    {aud && (
                      <div style={{ fontSize: 10, color: 'var(--color-secondary)' }} className="stx-text-wrap">
                        {aud.standard} · {aud.industry}
                      </div>
                    )}
                    <div style={{ fontSize: 10, marginTop: 3, color: od ? 'var(--danger-text)' : 'var(--color-muted)' }}>
                      📅 {r.dueDate}
                      {od ? ` (${Math.abs(days)}d late)` : days === 0 ? ' (today)' : days === 1 ? ' (tomorrow)' : ''}
                    </div>
                  </div>
                  <button type="button" onClick={() => dismissReminder(r.id)} style={{ background: 'none', border: 'none', color: 'var(--color-secondary)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
