import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import { useAuthStore } from '../store/authStore'
import { tenantKey } from '../utils/tenantStorage'
import '../styles/app-page.css'
import './Forum.css'

const STORAGE_KEY = 'strefex-forum-hub'

/** @typedef {{ id: string, title: string, body: string, severity: 'normal'|'high', createdAt: string, authorLabel: string }} ForumAnnouncement */
/** @typedef {{ id: string, title: string, takeaway: string, category: string, createdAt: string, authorLabel: string }} ForumLesson */

const emptyPayload = () => ({
  announcements: /** @type {ForumAnnouncement[]} */ ([]),
  lessons: /** @type {ForumLesson[]} */ ([]),
})

function loadHub() {
  try {
    const raw = localStorage.getItem(tenantKey(STORAGE_KEY))
    if (!raw) return emptyPayload()
    const p = JSON.parse(raw)
    return {
      announcements: Array.isArray(p.announcements) ? p.announcements : [],
      lessons: Array.isArray(p.lessons) ? p.lessons : [],
    }
  } catch {
    return emptyPayload()
  }
}

function saveHub(payload) {
  try {
    localStorage.setItem(tenantKey(STORAGE_KEY), JSON.stringify(payload))
  } catch {
    /* ignore quota */
  }
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

const MS_WEEK = 7 * 24 * 60 * 60 * 1000

/** Interactive forum hub — workspace updates, lessons learned, shortcuts (tenant-local until backend exists). */
export default function Forum() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const authorLabel = user?.fullName?.trim() || user?.email || 'Member'

  const [hub, setHub] = useState(loadHub)

  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) setHub(loadHub())
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const persist = useCallback((next) => {
    setHub(next)
    saveHub(next)
  }, [])

  const [announceTitle, setAnnounceTitle] = useState('')
  const [announceBody, setAnnounceBody] = useState('')
  const [announceSeverity, setAnnounceSeverity] = useState(
    /** @type {'normal'|'high'} */ ('normal'),
  )

  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonTakeaway, setLessonTakeaway] = useState('')
  const [lessonCategory, setLessonCategory] = useState('')

  const recentCutoff = useMemo(() => Date.now() - MS_WEEK, [])

  const metrics = useMemo(() => {
    const ann = hub.announcements
    const high = ann.filter((a) => a.severity === 'high').length
    const recentAnnounce = ann.filter((a) => new Date(a.createdAt).getTime() >= recentCutoff).length
    const lessons = hub.lessons.length
    const lessonsRecent = hub.lessons.filter((l) => new Date(l.createdAt).getTime() >= recentCutoff).length

    return {
      totalAnnounce: ann.length,
      importantCount: high,
      recentAnnounce,
      lessons,
      lessonsRecent,
    }
  }, [hub.announcements, hub.lessons, recentCutoff])

  const submitAnnouncement = (e) => {
    e.preventDefault()
    const title = announceTitle.trim()
    const body = announceBody.trim()
    if (!title || !body) return
    const row = {
      id: newId('ann'),
      title,
      body,
      severity: announceSeverity,
      createdAt: new Date().toISOString(),
      authorLabel,
    }
    persist({ ...hub, announcements: [row, ...hub.announcements] })
    setAnnounceTitle('')
    setAnnounceBody('')
    setAnnounceSeverity('normal')
  }

  const submitLesson = (e) => {
    e.preventDefault()
    const title = lessonTitle.trim()
    const takeaway = lessonTakeaway.trim()
    if (!title || !takeaway) return
    const row = {
      id: newId('ll'),
      title,
      takeaway,
      category: lessonCategory.trim() || 'General',
      createdAt: new Date().toISOString(),
      authorLabel,
    }
    persist({ ...hub, lessons: [row, ...hub.lessons] })
    setLessonTitle('')
    setLessonTakeaway('')
    setLessonCategory('')
  }

  const removeAnnouncement = (id) => {
    if (!window.confirm('Remove this announcement?')) return
    persist({ ...hub, announcements: hub.announcements.filter((a) => a.id !== id) })
  }

  const removeLesson = (id) => {
    if (!window.confirm('Remove this lesson learned?')) return
    persist({ ...hub, lessons: hub.lessons.filter((l) => l.id !== id) })
  }

  const exportSnapshot = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            storageScope: tenantKey(STORAGE_KEY),
            announcements: hub.announcements,
            lessons: hub.lessons,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json;charset=utf-8' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `strefex-forum-snapshot-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout>
      <div className="app-page forum-page">
        <a
          className="app-page-back-link stx-click-feedback"
          href="/management"
          onClick={(e) => {
            e.preventDefault()
            navigate(-1)
          }}
        >
          <Icon name="arrow-left" size={16} /> Back
        </a>

        <div className="app-page-card" style={{ minWidth: 0, marginBottom: 16 }}>
          <h1 className="app-page-title">Forum</h1>
          <p className="app-page-subtitle stx-text-wrap">
            Share operational updates and lessons learned. Content is saved for your workspace until a shared backend forum is wired in.
          </p>

          {/* Indicators */}
          <div className="forum-indicator-row">
            <div className="forum-indicator-card">
              <div className="forum-indicator-value">{metrics.totalAnnounce}</div>
              <div className="forum-indicator-label stx-text-caption stx-text-wrap">Updates listed</div>
            </div>
            <div className="forum-indicator-card">
              <div className="forum-indicator-value" style={{ color: '#c27a17' }}>
                {metrics.importantCount}
              </div>
              <div className="forum-indicator-label stx-text-caption stx-text-wrap">Marked important</div>
            </div>
            <div className="forum-indicator-card">
              <div className="forum-indicator-value">{metrics.recentAnnounce}</div>
              <div className="forum-indicator-label stx-text-caption stx-text-wrap">New this week · updates</div>
            </div>
            <div className="forum-indicator-card">
              <div className="forum-indicator-value">{metrics.lessons}</div>
              <div className="forum-indicator-label stx-text-caption stx-text-wrap">
                Lessons · {metrics.lessonsRecent ? `${metrics.lessonsRecent} this week` : 'none recent'}
              </div>
            </div>
          </div>

          <div className="forum-tools">
            <button type="button" className="forum-submit stx-click-feedback" onClick={exportSnapshot}>
              <Icon name="document" size={16} aria-hidden /> Export workspace snapshot (JSON)
            </button>
          </div>
        </div>

        <div className="forum-split">
          <section className="forum-panel">
            <h2 className="forum-panel-title">
              <Icon name="notifications" size={22} aria-hidden /> Important updates &amp; news
            </h2>

            <form className="forum-form-grid" onSubmit={submitAnnouncement}>
              <div className="forum-field">
                <label htmlFor="forum-ann-title">Headline</label>
                <input
                  id="forum-ann-title"
                  type="text"
                  value={announceTitle}
                  onChange={(ev) => setAnnounceTitle(ev.target.value)}
                  placeholder="e.g. New supplier onboarding cut-off"
                  className="stx-text-wrap"
                />
              </div>
              <div className="forum-field">
                <label htmlFor="forum-ann-sev">Visibility</label>
                <select
                  id="forum-ann-sev"
                  value={announceSeverity}
                  onChange={(ev) =>
                    setAnnounceSeverity(ev.target.value === 'high' ? 'high' : 'normal')
                  }
                >
                  <option value="normal">Standard note</option>
                  <option value="high">Important — highlight</option>
                </select>
              </div>
              <div className="forum-field">
                <label htmlFor="forum-ann-body">Detail</label>
                <textarea
                  id="forum-ann-body"
                  value={announceBody}
                  onChange={(ev) => setAnnounceBody(ev.target.value)}
                  placeholder="What changed, effective date, contacts, risks…"
                  className="stx-text-wrap"
                />
              </div>
              <button
                type="submit"
                className="forum-submit stx-click-feedback"
                disabled={!announceTitle.trim() || !announceBody.trim()}
              >
                Post update
              </button>
            </form>

            {hub.announcements.length === 0 ? (
              <p className="stx-text-body stx-text-wrap" style={{ color: '#64748b', margin: 0 }}>
                No posts yet — add your first rollout note, KPI change, or management decision here.
              </p>
            ) : (
              <ul className="forum-list">
                {hub.announcements.map((a) => (
                  <li key={a.id} className={`forum-li ${a.severity === 'high' ? 'forum-li--high' : ''}`}>
                    <div className="forum-li-meta">
                      <span className={`forum-badge ${a.severity === 'high' ? 'forum-badge--high' : 'forum-badge--normal'}`}>
                        {a.severity === 'high' ? 'Important' : 'Update'}
                      </span>
                      <span>{formatWhen(a.createdAt)}</span>
                      <span>·</span>
                      <span className="stx-text-wrap">{a.authorLabel}</span>
                      <button type="button" className="forum-remove" onClick={() => removeAnnouncement(a.id)}>
                        Remove
                      </button>
                    </div>
                    <div className="forum-li-title">{a.title}</div>
                    <p className="stx-text-small stx-text-wrap" style={{ margin: 0, color: '#334155' }}>
                      {a.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="forum-panel">
            <h2 className="forum-panel-title">
              <Icon name="clipboard" size={22} aria-hidden /> Lessons learned
            </h2>

            <form className="forum-form-grid" onSubmit={submitLesson}>
              <div className="forum-field">
                <label htmlFor="forum-ll-title">Topic</label>
                <input
                  id="forum-ll-title"
                  type="text"
                  value={lessonTitle}
                  onChange={(ev) => setLessonTitle(ev.target.value)}
                  placeholder="e.g. RFQ rework after audit finding"
                  className="stx-text-wrap"
                />
              </div>
              <div className="forum-field">
                <label htmlFor="forum-ll-cat">Category (optional)</label>
                <input
                  id="forum-ll-cat"
                  type="text"
                  value={lessonCategory}
                  onChange={(ev) => setLessonCategory(ev.target.value)}
                  placeholder="Procurement · Quality · IT · HSE…"
                  className="stx-text-wrap"
                />
              </div>
              <div className="forum-field">
                <label htmlFor="forum-ll-take">Takeaway — what do we do next time?</label>
                <textarea
                  id="forum-ll-take"
                  value={lessonTakeaway}
                  onChange={(ev) => setLessonTakeaway(ev.target.value)}
                  placeholder="One or two actionable sentences leadership agreed on."
                  className="stx-text-wrap"
                />
              </div>
              <button
                type="submit"
                className="forum-submit stx-click-feedback"
                disabled={!lessonTitle.trim() || !lessonTakeaway.trim()}
              >
                Log lesson learned
              </button>
            </form>

            {hub.lessons.length === 0 ? (
              <p className="stx-text-body stx-text-wrap" style={{ color: '#64748b', margin: 0 }}>
                Capture post-mortems, audit follow-ups, and supplier incidents so peers do not repeat the same gap.
              </p>
            ) : (
              <ul className="forum-list">
                {hub.lessons.map((l) => (
                  <li key={l.id} className="forum-li">
                    <div className="forum-li-meta">
                      <span className="forum-badge forum-badge--normal stx-text-wrap">{l.category}</span>
                      <span>{formatWhen(l.createdAt)}</span>
                      <span>·</span>
                      <span className="stx-text-wrap">{l.authorLabel}</span>
                      <button type="button" className="forum-remove" onClick={() => removeLesson(l.id)}>
                        Remove
                      </button>
                    </div>
                    <div className="forum-li-title">{l.title}</div>
                    <p className="stx-text-small stx-text-wrap" style={{ margin: 0, color: '#334155' }}>
                      {l.takeaway}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Quick tools & sharing */}
        <div className="app-page-card" style={{ minWidth: 0, marginTop: 16 }}>
          <h2 className="stx-text-section stx-text-wrap" style={{ marginBottom: '0.75rem' }}>
            Collaboration tools
          </h2>
          <div className="forum-tools">
            <Link className="forum-tool-card stx-click-feedback" to="/support">
              <Icon name="document" size={22} aria-hidden />
              <div style={{ minWidth: 0 }}>
                <div className="stx-text-small" style={{ fontWeight: 'var(--font-semibold)' }}>
                  Community support / tickets
                </div>
                <div className="stx-text-caption stx-text-wrap" style={{ color: '#64748b' }}>
                  Formal requests and bug reports with backlog history
                </div>
              </div>
              <Icon name="chevron-right" size={18} style={{ opacity: 0.5 }} aria-hidden />
            </Link>

            <Link className="forum-tool-card stx-click-feedback" to="/calendar">
              <Icon name="calendar" size={22} aria-hidden />
              <div style={{ minWidth: 0 }}>
                <div className="stx-text-small" style={{ fontWeight: 'var(--font-semibold)' }}>
                  Platform calendar
                </div>
                <div className="stx-text-caption stx-text-wrap" style={{ color: '#64748b' }}>
                  Meetings, audits, and milestones your team subscribed to here
                </div>
              </div>
              <Icon name="chevron-right" size={18} style={{ opacity: 0.5 }} aria-hidden />
            </Link>

            <Link className="forum-tool-card stx-click-feedback" to="/resources">
              <Icon name="templates" size={22} aria-hidden />
              <div style={{ minWidth: 0 }}>
                <div className="stx-text-small" style={{ fontWeight: 'var(--font-semibold)' }}>
                  Resources library
                </div>
                <div className="stx-text-caption stx-text-wrap" style={{ color: '#64748b' }}>
                  Guides and hubs for materials / equipment workflows
                </div>
              </div>
              <Icon name="chevron-right" size={18} style={{ opacity: 0.5 }} aria-hidden />
            </Link>

            <Link className="forum-tool-card stx-click-feedback" to="/messenger">
              <Icon name="messenger" size={22} aria-hidden />
              <div style={{ minWidth: 0 }}>
                <div className="stx-text-small" style={{ fontWeight: 'var(--font-semibold)' }}>
                  Company messenger
                </div>
                <div className="stx-text-caption stx-text-wrap" style={{ color: '#64748b' }}>
                  Requires Premium messenger entitlement on your plan
                </div>
              </div>
              <Icon name="chevron-right" size={18} style={{ opacity: 0.5 }} aria-hidden />
            </Link>
          </div>
        </div>

        <div className="forum-tip-box">
          <h3>Suggested housekeeping</h3>
          <ul className="stx-text-small stx-text-wrap">
            <li>Review Important items weekly — export JSON before major cleanups.</li>
            <li>Pair each lesson learned with one owner — link to Auditor or Procurement hubs from Management.</li>
            <li>Need cross-company benchmarking? Invite strategy input via Community Support as a roadmap item.</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  )
}
