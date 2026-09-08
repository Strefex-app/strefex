import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import {
  buildMailtoSellerGrowthInvite,
  buildSellerInviteRegisterUrl,
  inviteSellerToPlatform,
  listSellerGrowthInvitesByInviter,
} from '../utils/sellerGrowthInvites'
import '../styles/app-page.css'
import './InviteSellersPage.css'

export default function InviteSellersPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const inviterEmail = String(user?.email || '').toLowerCase()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [lastInvite, setLastInvite] = useState(null)
  const [tick, setTick] = useState(0)

  const sent = useMemo(
    () => listSellerGrowthInvitesByInviter(inviterEmail),
    [inviterEmail, tick, lastInvite],
  )

  const sendInvite = useCallback(async () => {
    setBusy(true)
    setError('')
    setOkMsg('')
    try {
      const out = await inviteSellerToPlatform({
        inviteeEmail: email,
        inviteeName: name,
        inviterEmail,
        inviterCompany: tenant?.name || user?.companyName || user?.company || '',
        inviterUserId: user?.id || '',
        inviterName: user?.fullName || user?.name || tenant?.name || '',
        source: 'manual',
        message: message.trim(),
      })
      setLastInvite(out.invite)
      if (out.delivered) {
        setOkMsg(
          out.reused
            ? `Invite re-sent to ${out.invite.inviteeEmail} from STREFEX (Resend).`
            : `Invite emailed to ${out.invite.inviteeEmail} from invites@strefex.pro.`,
        )
      } else {
        setOkMsg(
          `Invite created for ${out.invite.inviteeEmail}. `
          + (out.mail?.error ? `(${out.mail.error}) ` : '')
          + 'Platform email was not delivered — use Open in mail app or Copy invite link.',
        )
      }
      setEmail('')
      setName('')
      setMessage('')
      setTick((n) => n + 1)
    } catch (e) {
      setError(e?.message || 'Could not create invite.')
    } finally {
      setBusy(false)
    }
  }, [email, name, message, inviterEmail, tenant, user])

  return (
    <AppLayout>
      <div className="app-page invite-sellers-page">
        <header className="invite-sellers-head">
          <div className="invite-sellers-head__text">
            <h1 className="app-page-title">Invite sellers to STREFEX</h1>
            <p className="invite-sellers-lead stx-text-wrap">
              Grow the network: invite manufacturers who are not on the platform yet.
              They create <strong>their own</strong> company account — this is not a team seat,
              and not Super Admin account creation.
            </p>
          </div>
          <Link className="invite-sellers-link" to="/management/people/team">
            Invite teammate instead →
          </Link>
        </header>

        <section className="app-page-card">
          <h2 className="app-page-section-heading">Send invite</h2>
          {error ? <div className="invite-sellers-error" role="alert">{error}</div> : null}
          {okMsg ? <div className="invite-sellers-ok" role="status">{okMsg}</div> : null}
          <div className="invite-sellers-grid">
            <label className="invite-sellers-field">
              Seller email *
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                placeholder="plant@supplier.com"
              />
            </label>
            <label className="invite-sellers-field">
              Company / contact name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                placeholder="Optional"
              />
            </label>
            <label className="invite-sellers-field invite-sellers-field--wide">
              Personal note
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={busy}
                rows={3}
                placeholder="Optional context for the invite email"
              />
            </label>
          </div>
          <div className="invite-sellers-actions">
            <button
              type="button"
              className="invite-sellers-primary"
              disabled={busy || !email.trim()}
              onClick={() => void sendInvite()}
            >
                {busy ? 'Sending…' : 'Send invite email'}
              </button>
              {lastInvite ? (
                <>
                  {(!lastInvite.delivered) ? (
                    <a className="invite-sellers-secondary" href={buildMailtoSellerGrowthInvite(lastInvite)}>
                      Open in mail app (fallback)
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="invite-sellers-secondary"
                    onClick={() => {
                      void navigator.clipboard.writeText(buildSellerInviteRegisterUrl(lastInvite.token))
                      setOkMsg('Invite link copied.')
                    }}
                  >
                    Copy invite link
                  </button>
                </>
              ) : null}
            </div>
            <p className="invite-sellers-hint">
              When Resend is configured, STREFEX sends from <strong>invites@strefex.pro</strong>.
              If send fails, use mail-app fallback or copy the tracked link.
              RFQ “Invite seller by email” uses the same delivery path.
            </p>
        </section>

        <section className="app-page-card">
          <h2 className="app-page-section-heading">Your sent invites</h2>
          {!sent.length ? (
            <p className="invite-sellers-hint">No invites yet from this account.</p>
          ) : (
            <ul className="invite-sellers-list">
              {sent.map((row) => (
                <li key={row.token} className="invite-sellers-list__item">
                  <div className="invite-sellers-list__main">
                    <div className="stx-text-wrap">
                      <strong>{row.inviteeName || row.inviteeEmail}</strong>
                      {row.inviteeName ? (
                        <span className="invite-sellers-muted"> · {row.inviteeEmail}</span>
                      ) : null}
                    </div>
                    <div className="invite-sellers-muted stx-text-wrap">
                      {row.source === 'rfq' ? 'From RFQ' : row.source === 'messenger' ? 'Messenger' : 'Manual'}
                      {row.rfqTitle ? ` · ${row.rfqTitle}` : ''}
                      {' · '}
                      {row.status}
                      {row.delivered ? ' · emailed' : row.deliveryChannel === 'local_stub' ? ' · link only' : ''}
                      {' · '}
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}
                    </div>
                  </div>
                  {row.status === 'pending' ? (
                    <button
                      type="button"
                      className="invite-sellers-secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(buildSellerInviteRegisterUrl(row.token))
                        setOkMsg(`Copied link for ${row.inviteeEmail}`)
                      }}
                    >
                      Copy link
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
