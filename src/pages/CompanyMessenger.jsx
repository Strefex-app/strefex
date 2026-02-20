import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n/useTranslation'
import AppLayout from '../components/AppLayout'
import './CompanyMessenger.css'

/* ── Storage (per-tenant isolation) ──────────────────────── */
const getStorageKey = (slug) => `strefex-messenger-${slug || 'default'}`

const loadConversations = (slug) => {
  try { return JSON.parse(localStorage.getItem(getStorageKey(slug)) || '[]') } catch { return [] }
}
const saveConversations = (slug, data) => {
  try { localStorage.setItem(getStorageKey(slug), JSON.stringify(data)) } catch { /* */ }
}

/* ── Team members — populated from team API in production ─ */
const DEMO_TEAM = []

/* ── Channels (company-wide) ─────────────────────────────── */
const DEFAULT_CHANNELS = [
  { id: 'general', name: 'General', desc: 'Company-wide announcements and chat', icon: '#' },
  { id: 'support', name: 'Support', desc: 'Ask questions to admins and managers', icon: '?' },
  { id: 'projects', name: 'Projects', desc: 'Project discussions and updates', icon: '📁' },
]

export default function CompanyMessenger() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const tenant = useAuthStore((s) => s.tenant)
  const slug = tenant?.slug || 'default'

  const [conversations, setConversations] = useState(() => loadConversations(slug))
  const [activeChat, setActiveChat] = useState(null) // { type: 'channel'|'dm', id }
  const [messageText, setMessageText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewDM, setShowNewDM] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('channels') // 'channels' | 'direct' | 'team'
  const messagesEndRef = useRef(null)

  const currentEmail = user?.email || 'user@strefex.com'
  const currentName = user?.fullName || 'User'

  /* ── Helpers ────────────────────────────────────────────── */
  const getMessages = (chatType, chatId) => {
    const conv = conversations.find((c) => c.type === chatType && c.id === chatId)
    return conv?.messages || []
  }

  const getUnread = (chatType, chatId) => {
    const conv = conversations.find((c) => c.type === chatType && c.id === chatId)
    return conv?.messages?.filter((m) => !m.read && m.senderEmail !== currentEmail).length || 0
  }

  const dmPartners = useMemo(() => {
    const dms = conversations.filter((c) => c.type === 'dm')
    return dms.map((dm) => ({
      ...dm,
      partner: DEMO_TEAM.find((t) => t.email === dm.partnerEmail) || { name: dm.partnerEmail, avatar: dm.partnerEmail.slice(0, 2).toUpperCase(), online: false },
      lastMessage: dm.messages?.[dm.messages.length - 1] || null,
    }))
  }, [conversations])

  /* Auto-scroll to bottom */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat, conversations])

  /* Mark as read */
  useEffect(() => {
    if (!activeChat) return
    const updated = conversations.map((c) => {
      if (c.type === activeChat.type && c.id === activeChat.id) {
        return { ...c, messages: c.messages.map((m) => ({ ...m, read: true })) }
      }
      return c
    })
    setConversations(updated)
    saveConversations(slug, updated)
  }, [activeChat?.type, activeChat?.id])

  /* ── Send message ───────────────────────────────────────── */
  const handleSend = () => {
    if (!messageText.trim() || !activeChat) return

    const newMsg = {
      id: Date.now().toString(36),
      text: messageText.trim(),
      senderEmail: currentEmail,
      senderName: currentName,
      senderRole: role,
      createdAt: new Date().toISOString(),
      read: false,
    }

    let updated = [...conversations]
    const idx = updated.findIndex((c) => c.type === activeChat.type && c.id === activeChat.id)

    if (idx >= 0) {
      updated[idx] = { ...updated[idx], messages: [...updated[idx].messages, newMsg] }
    } else {
      // Create new conversation
      const conv = {
        type: activeChat.type,
        id: activeChat.id,
        partnerEmail: activeChat.type === 'dm' ? activeChat.id : undefined,
        messages: [newMsg],
      }
      updated.push(conv)
    }

    setConversations(updated)
    saveConversations(slug, updated)
    setMessageText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  /* ── Start DM ───────────────────────────────────────────── */
  const startDM = (member) => {
    setActiveChat({ type: 'dm', id: member.email })
    setShowNewDM(false)
    setSidebarTab('direct')
  }

  /* ── Active chat info ───────────────────────────────────── */
  const activeChatInfo = useMemo(() => {
    if (!activeChat) return null
    if (activeChat.type === 'channel') {
      return DEFAULT_CHANNELS.find((ch) => ch.id === activeChat.id)
    }
    return DEMO_TEAM.find((t) => t.email === activeChat.id) || { name: activeChat.id, avatar: '?', online: false }
  }, [activeChat])

  const messages = activeChat ? getMessages(activeChat.type, activeChat.id) : []

  const filteredTeam = DEMO_TEAM.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const roleColor = (r) => r === 'admin' ? '#e74c3c' : r === 'manager' ? '#000888' : '#2e7d32'

  return (
    <AppLayout>
      <div className="cm-page">
        <div className="cm-layout">
          {/* ── Left sidebar ──────────────────────────────── */}
          <div className="cm-sidebar">
            <div className="cm-sidebar-header">
              <h2 className="cm-sidebar-title">Messages</h2>
              <button className="cm-new-btn" onClick={() => setShowNewDM(true)} title="New Direct Message">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Sidebar tabs */}
            <div className="cm-sidebar-tabs">
              {[
                { id: 'channels', label: 'Channels' },
                { id: 'direct', label: 'Direct' },
                { id: 'team', label: 'Team' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`cm-stab ${sidebarTab === tab.id ? 'active' : ''}`}
                  onClick={() => setSidebarTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Channels */}
            {sidebarTab === 'channels' && (
              <div className="cm-list">
                {DEFAULT_CHANNELS.map((ch) => {
                  const unread = getUnread('channel', ch.id)
                  return (
                    <button
                      key={ch.id}
                      className={`cm-list-item ${activeChat?.type === 'channel' && activeChat?.id === ch.id ? 'active' : ''}`}
                      onClick={() => setActiveChat({ type: 'channel', id: ch.id })}
                    >
                      <span className="cm-list-icon">{ch.icon}</span>
                      <div className="cm-list-info">
                        <span className="cm-list-name">{ch.name}</span>
                        <span className="cm-list-desc">{ch.desc}</span>
                      </div>
                      {unread > 0 && <span className="cm-unread">{unread}</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Direct messages */}
            {sidebarTab === 'direct' && (
              <div className="cm-list">
                {dmPartners.length === 0 ? (
                  <div className="cm-list-empty">No direct messages yet</div>
                ) : (
                  dmPartners.map((dm) => {
                    const unread = getUnread('dm', dm.id)
                    return (
                      <button
                        key={dm.id}
                        className={`cm-list-item ${activeChat?.type === 'dm' && activeChat?.id === dm.id ? 'active' : ''}`}
                        onClick={() => setActiveChat({ type: 'dm', id: dm.id })}
                      >
                        <div className="cm-avatar-sm">
                          {dm.partner.avatar}
                          {dm.partner.online && <span className="cm-online-dot" />}
                        </div>
                        <div className="cm-list-info">
                          <span className="cm-list-name">{dm.partner.name}</span>
                          {dm.lastMessage && <span className="cm-list-desc">{dm.lastMessage.text.slice(0, 40)}</span>}
                        </div>
                        {unread > 0 && <span className="cm-unread">{unread}</span>}
                      </button>
                    )
                  })
                )}
              </div>
            )}

            {/* Team directory */}
            {sidebarTab === 'team' && (
              <div className="cm-list">
                <input
                  className="cm-team-search"
                  placeholder="Search team..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {filteredTeam.map((m) => (
                  <button key={m.id} className="cm-list-item" onClick={() => startDM(m)}>
                    <div className="cm-avatar-sm">
                      {m.avatar}
                      {m.online && <span className="cm-online-dot" />}
                    </div>
                    <div className="cm-list-info">
                      <span className="cm-list-name">{m.name}</span>
                      <span className="cm-list-desc" style={{ color: roleColor(m.role) }}>{m.role}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Main chat area ────────────────────────────── */}
          <div className="cm-main">
            {!activeChat ? (
              <div className="cm-main-empty">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" style={{ color: '#ccc' }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3>Company Messenger</h3>
                <p>Select a channel or start a direct message to begin chatting with your team.</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="cm-chat-header">
                  {activeChat.type === 'channel' ? (
                    <div>
                      <h3 className="cm-chat-name">{activeChatInfo?.icon} {activeChatInfo?.name}</h3>
                      <p className="cm-chat-desc">{activeChatInfo?.desc}</p>
                    </div>
                  ) : (
                    <div className="cm-chat-dm-header">
                      <div className="cm-avatar-md">{activeChatInfo?.avatar || '?'}</div>
                      <div>
                        <h3 className="cm-chat-name">{activeChatInfo?.name || activeChat.id}</h3>
                        <p className="cm-chat-desc">
                          <span style={{ color: roleColor(activeChatInfo?.role || 'user') }}>{activeChatInfo?.role || 'user'}</span>
                          {activeChatInfo?.online ? ' · Online' : ' · Offline'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="cm-messages">
                  {messages.length === 0 ? (
                    <div className="cm-messages-empty">No messages yet. Start the conversation!</div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderEmail === currentEmail
                      return (
                        <div key={msg.id} className={`cm-msg ${isMe ? 'cm-msg-me' : 'cm-msg-other'}`}>
                          {!isMe && (
                            <div className="cm-msg-sender">
                              <span className="cm-msg-name">{msg.senderName}</span>
                              <span className="cm-msg-role" style={{ color: roleColor(msg.senderRole) }}>{msg.senderRole}</span>
                            </div>
                          )}
                          <div className="cm-msg-bubble">
                            {msg.text}
                          </div>
                          <div className="cm-msg-time">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="cm-input-area">
                  <textarea
                    className="cm-input"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message... (Enter to send)"
                    rows={1}
                  />
                  <button className="cm-send-btn" onClick={handleSend} disabled={!messageText.trim()}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* New DM modal */}
        {showNewDM && (
          <div className="cm-modal-backdrop" onClick={() => setShowNewDM(false)}>
            <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="cm-modal-title">New Direct Message</h3>
              <div className="cm-modal-list">
                {DEMO_TEAM.filter((m) => m.email !== currentEmail).map((m) => (
                  <button key={m.id} className="cm-modal-member" onClick={() => startDM(m)}>
                    <div className="cm-avatar-sm">{m.avatar}{m.online && <span className="cm-online-dot" />}</div>
                    <div>
                      <div className="cm-modal-name">{m.name}</div>
                      <div className="cm-modal-role" style={{ color: roleColor(m.role) }}>{m.role} · {m.email}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button className="cm-modal-close" onClick={() => setShowNewDM(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
