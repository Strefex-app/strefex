import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import AppLayout from '../components/AppLayout'
import { useMessengerStore, DEFAULT_CHANNELS, DEFAULT_TOPIC_TEMPLATES } from '../store/messengerStore'
import MessengerBrainPanel from '../components/messenger/MessengerBrainPanel'
import MessengerQuickSwitcher from '../components/messenger/MessengerQuickSwitcher'
import { parseWikiSegments, resolveTopicRef, normalizeTag } from '../utils/messengerObsidian'
import { deriveMessengerCryptoKey, isWebCryptoAvailable } from '../utils/messengerCrypto'
import {
  lookupContactInCompany,
  buildRegisterInviteUrl,
  buildMailtoInvite,
} from '../services/messengerContactService'
import './CompanyMessenger.css'

function useMessengerCryptoKey(user, tenant) {
  const [key, setKey] = useState(null)
  useEffect(() => {
    let alive = true
    const seed = `${user?.email || ''}|${tenant?.id || 'guest'}`
    deriveMessengerCryptoKey(seed).then((k) => {
      if (alive) setKey(k)
    })
    return () => {
      alive = false
    }
  }, [user?.email, tenant?.id])
  return key
}

export default function CompanyMessenger() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const tenant = useAuthStore((s) => s.tenant)
  const companyId = tenant?.id || null
  const slug = tenant?.slug || 'default'

  const encryptionAtRest = useMessengerStore((s) => s.encryptionAtRest)
  const setEncryptionAtRest = useMessengerStore((s) => s.setEncryptionAtRest)
  const migrateLegacyIfNeeded = useMessengerStore((s) => s.migrateLegacyIfNeeded)
  const groups = useMessengerStore((s) => s.groups ?? [])
  const topics = useMessengerStore((s) => s.topics ?? [])
  const taskBoards = useMessengerStore((s) => s.taskBoards ?? [])
  const conversations = useMessengerStore((s) => s.conversations ?? [])
  const createGroup = useMessengerStore((s) => s.createGroup)
  const ensureConversation = useMessengerStore((s) => s.ensureConversation)
  const appendMessage = useMessengerStore((s) => s.appendMessage)
  const decryptMessageBody = useMessengerStore((s) => s.decryptMessageBody)
  const addTopic = useMessengerStore((s) => s.addTopic)
  const linkTopics = useMessengerStore((s) => s.linkTopics)
  const topicEdgeKinds = useMessengerStore((s) => s.topicEdgeKinds ?? {})
  const topicTemplates = useMessengerStore((s) => s.topicTemplates)
  const updateTopic = useMessengerStore((s) => s.updateTopic)
  const addTopicEmbed = useMessengerStore((s) => s.addTopicEmbed)
  const addTopicAlias = useMessengerStore((s) => s.addTopicAlias)
  const ensureTaskBoard = useMessengerStore((s) => s.ensureTaskBoard)
  const addTaskCard = useMessengerStore((s) => s.addTaskCard)
  const toggleTaskCard = useMessengerStore((s) => s.toggleTaskCard)

  const cryptoKey = useMessengerCryptoKey(user, tenant)

  const [activeChat, setActiveChat] = useState(null)
  const [activeTopicId, setActiveTopicId] = useState(null)
  const [mainTab, setMainTab] = useState('chats')
  const [sidebarTab, setSidebarTab] = useState('channels')
  const [messageText, setMessageText] = useState('')
  const [decryptedTexts, setDecryptedTexts] = useState({})
  const [showNewDM, setShowNewDM] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupResult, setLookupResult] = useState(null)
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTopicTemplateId, setNewTopicTemplateId] = useState('blank')
  const [newTopicTags, setNewTopicTags] = useState('')
  const [topicTagFilter, setTopicTagFilter] = useState('')
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false)
  const [brainFocusTopicId, setBrainFocusTopicId] = useState(null)
  const messagesEndRef = useRef(null)

  const templatesList = topicTemplates?.length ? topicTemplates : DEFAULT_TOPIC_TEMPLATES

  const currentEmail = (user?.email || '').toLowerCase()
  const currentName = user?.fullName || user?.name || 'You'

  useEffect(() => {
    migrateLegacyIfNeeded(slug)
  }, [slug, migrateLegacyIfNeeded])

  useEffect(() => {
    if (activeTopicId) {
      ensureTaskBoard(activeTopicId)
      setBrainFocusTopicId(activeTopicId)
    }
  }, [activeTopicId, ensureTaskBoard])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowQuickSwitcher(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const messages = useMemo(() => {
    if (!activeChat) return []
    const conv = conversations.find((c) => c.type === activeChat.type && c.id === activeChat.id)
    return conv?.messages || []
  }, [activeChat, conversations])

  const scrollChatRef = useRef({ key: '', len: 0 })

  useEffect(() => {
    let cancelled = false
    async function decryptAll() {
      if (!encryptionAtRest || !cryptoKey) {
        const map = {}
        messages.forEach((m) => {
          map[m.id] = m.text || ''
        })
        if (!cancelled) setDecryptedTexts(map)
        return
      }
      const map = {}
      const batchSize = 8
      for (let i = 0; i < messages.length; i += batchSize) {
        if (cancelled) return
        const slice = messages.slice(i, i + batchSize)
        await Promise.all(
          slice.map(async (m) => {
            map[m.id] = await decryptMessageBody(m, cryptoKey)
          }),
        )
        await new Promise((r) => {
          setTimeout(r, 0)
        })
      }
      if (!cancelled) setDecryptedTexts(map)
    }
    void decryptAll()
    return () => {
      cancelled = true
    }
  }, [messages, encryptionAtRest, cryptoKey, decryptMessageBody])

  useEffect(() => {
    const key = activeChat ? `${activeChat.type}:${activeChat.id}` : ''
    const n = messages.length
    const prev = scrollChatRef.current
    if (key !== prev.key) {
      scrollChatRef.current = { key, len: n }
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      })
      return
    }
    if (n > prev.len) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    scrollChatRef.current = { key, len: n }
  }, [messages.length, activeChat])

  const parentTopics = useMemo(() => {
    if (!activeChat) return []
    let list = topics.filter(
      (t) => t.parentType === activeChat.type && t.parentId === activeChat.id,
    )
    const f = normalizeTag(topicTagFilter)
    if (f) {
      list = list.filter((t) => (t.tags || []).some((tag) => tag.includes(f) || normalizeTag(tag) === f))
    }
    return list
  }, [topics, activeChat, topicTagFilter])

  const activeBoard = useMemo(
    () => taskBoards.find((b) => b.topicId === activeTopicId),
    [taskBoards, activeTopicId],
  )

  const handleSend = async () => {
    if (!messageText.trim() || !activeChat) return
    const payload = {
      id: Date.now().toString(36),
      text: messageText.trim(),
      senderEmail: currentEmail,
      senderName: currentName,
      senderRole: role,
      createdAt: new Date().toISOString(),
      read: false,
      topicId: activeTopicId || undefined,
    }
    ensureConversation({
      type: activeChat.type,
      id: activeChat.id,
      name: activeChat.name,
      partnerEmail: activeChat.partnerEmail,
    })
    await appendMessage(activeChat.type, activeChat.id, payload, encryptionAtRest ? cryptoKey : null)
    setMessageText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const startDMWithProfile = (profile) => {
    const email = (profile.email || '').toLowerCase()
    ensureConversation({
      type: 'dm',
      id: email,
      name: profile.fullName || email,
      partnerEmail: email,
    })
    setActiveChat({ type: 'dm', id: email, name: profile.fullName || email, partnerEmail: email })
    setShowNewDM(false)
    setShowAddContact(false)
    setSidebarTab('direct')
    setMainTab('chats')
  }

  const runContactLookup = async () => {
    setLookupLoading(true)
    setLookupResult(null)
    try {
      const res = await lookupContactInCompany(
        { email: contactEmail.trim(), phone: contactPhone.trim() },
        companyId,
      )
      setLookupResult(res)
    } finally {
      setLookupLoading(false)
    }
  }

  const openTopicEverywhere = useCallback(
    (tp) => {
      if (!tp) return
      let name = tp.parentId
      let partnerEmail
      if (tp.parentType === 'channel') {
        name = DEFAULT_CHANNELS.find((c) => c.id === tp.parentId)?.name || tp.parentId
      } else if (tp.parentType === 'group') {
        name = groups.find((g) => g.id === tp.parentId)?.name || tp.parentId
      } else if (tp.parentType === 'dm') {
        const dm = conversations.find((c) => c.type === 'dm' && c.id === tp.parentId)
        name = dm?.name || tp.parentId
        partnerEmail = dm?.partnerEmail || tp.parentId
      }
      setActiveChat({
        type: tp.parentType,
        id: tp.parentId,
        name,
        partnerEmail,
      })
      setActiveTopicId(tp.id)
      setBrainFocusTopicId(tp.id)
      setMainTab('chats')
      if (tp.parentType === 'channel') setSidebarTab('channels')
      else if (tp.parentType === 'group') setSidebarTab('groups')
      else setSidebarTab('direct')
    },
    [conversations, groups],
  )

  const jumpToTopicId = useCallback(
    (topicId) => {
      const tp = topics.find((t) => t.id === topicId)
      if (tp) openTopicEverywhere(tp)
    },
    [topics, openTopicEverywhere],
  )

  const activeChatLabel = useMemo(() => {
    if (!activeChat) return ''
    if (activeChat.type === 'channel') {
      return DEFAULT_CHANNELS.find((c) => c.id === activeChat.id)?.name || activeChat.id
    }
    if (activeChat.type === 'group') {
      return groups.find((g) => g.id === activeChat.id)?.name || activeChat.name
    }
    return activeChat.name || activeChat.id
  }, [activeChat, groups])

  const roleColor = (r) =>
    r === 'admin' ? '#e74c3c' : r === 'manager' ? '#00d4ff' : '#2e7d32'

  return (
    <AppLayout>
      <div className="cm-page">
        <div className="cm-topbar">
          <div className="cm-topbar-tabs">
            {[
              { id: 'chats', label: 'Chats' },
              { id: 'brain', label: 'Brain' },
              { id: 'board', label: 'Task board' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`cm-ttab ${mainTab === tab.id ? 'active' : ''}`}
                onClick={() => setMainTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="cm-qs-launch"
            onClick={() => setShowQuickSwitcher(true)}
            title="Quick switcher (⌘K / Ctrl+K)"
          >
            Quick switcher ⌘K
          </button>
          <div className="cm-crypto-toggle" title="AES-GCM encryption for data stored in this browser (not network E2E)">
            <label className="cm-crypto-label">
              <input
                type="checkbox"
                checked={encryptionAtRest}
                onChange={(e) => setEncryptionAtRest(e.target.checked)}
                disabled={!isWebCryptoAvailable()}
              />
              <span>Encrypted storage</span>
            </label>
            {!isWebCryptoAvailable() && (
              <span className="cm-crypto-warn">Web Crypto unavailable</span>
            )}
          </div>
        </div>

        <div className="cm-layout">
          <div className="cm-sidebar">
            <div className="cm-sidebar-header">
              <h2 className="cm-sidebar-title">Messages</h2>
              <div className="cm-header-actions">
                <button
                  type="button"
                  className="cm-new-btn"
                  onClick={() => setShowAddContact(true)}
                  title="Add by email or phone"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="cm-new-btn cm-new-btn-secondary"
                  onClick={() => setShowCreateGroup(true)}
                  title="New group"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <button type="button" className="cm-new-btn" onClick={() => setShowNewDM(true)} title="New DM">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="cm-sidebar-tabs">
              {[
                { id: 'channels', label: 'Channels' },
                { id: 'groups', label: 'Groups' },
                { id: 'direct', label: 'Direct' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`cm-stab ${sidebarTab === tab.id ? 'active' : ''}`}
                  onClick={() => setSidebarTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {sidebarTab === 'channels' && (
              <div className="cm-list">
                {DEFAULT_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    className={`cm-list-item ${
                      activeChat?.type === 'channel' && activeChat?.id === ch.id ? 'active' : ''
                    }`}
                    onClick={() => {
                      setActiveChat({ type: 'channel', id: ch.id, name: ch.name })
                      setActiveTopicId(null)
                    }}
                  >
                    <span className="cm-list-icon">{ch.icon}</span>
                    <div className="cm-list-info">
                      <span className="cm-list-name">{ch.name}</span>
                      <span className="cm-list-desc">{ch.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {sidebarTab === 'groups' && (
              <div className="cm-list">
                {groups.length === 0 && (
                  <div className="cm-list-empty">No groups yet — create one (+)</div>
                )}
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`cm-list-item ${
                      activeChat?.type === 'group' && activeChat?.id === g.id ? 'active' : ''
                    }`}
                    onClick={() => {
                      setActiveChat({ type: 'group', id: g.id, name: g.name })
                      setActiveTopicId(null)
                    }}
                  >
                    <span className="cm-list-icon">👥</span>
                    <div className="cm-list-info">
                      <span className="cm-list-name">{g.name}</span>
                      <span className="cm-list-desc">{g.memberEmails?.length || 0} members</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {sidebarTab === 'direct' && (
              <div className="cm-list">
                {conversations.filter((c) => c.type === 'dm').length === 0 ? (
                  <div className="cm-list-empty">No direct chats — add a contact</div>
                ) : (
                  conversations
                    .filter((c) => c.type === 'dm')
                    .map((dm) => (
                      <button
                        key={dm.id}
                        type="button"
                        className={`cm-list-item ${
                          activeChat?.type === 'dm' && activeChat?.id === dm.id ? 'active' : ''
                        }`}
                        onClick={() => {
                          setActiveChat({
                            type: 'dm',
                            id: dm.id,
                            name: dm.name || dm.id,
                            partnerEmail: dm.partnerEmail,
                          })
                          setActiveTopicId(null)
                        }}
                      >
                        <div className="cm-avatar-sm">{(dm.name || dm.id).slice(0, 2).toUpperCase()}</div>
                        <div className="cm-list-info">
                          <span className="cm-list-name">{dm.name || dm.partnerEmail}</span>
                        </div>
                      </button>
                    ))
                )}
              </div>
            )}
          </div>

          {mainTab === 'chats' && (
            <div className="cm-main">
              {!activeChat ? (
                <div className="cm-main-empty">
                  <h3>Company Messenger</h3>
                  <p>
                    Encrypted local storage, groups, topics, and task boards. Add colleagues by email or phone
                    (same company directory when using Supabase).
                  </p>
                </div>
              ) : (
                <>
                  <div className="cm-chat-header">
                    <div>
                      <h3 className="cm-chat-name">{activeChatLabel}</h3>
                      {activeTopicId && (
                        <p className="cm-chat-desc">
                          Topic: {topics.find((x) => x.id === activeTopicId)?.title || '…'}
                        </p>
                      )}
                    </div>
                  </div>

                  {(activeChat.type === 'channel' ||
                    activeChat.type === 'group' ||
                    activeChat.type === 'dm') && (
                    <div className="cm-topic-bar">
                      <span className="cm-topic-bar-label">Topics</span>
                      <input
                        className="cm-topic-filter"
                        placeholder="Filter by tag…"
                        value={topicTagFilter}
                        onChange={(e) => setTopicTagFilter(e.target.value)}
                      />
                      <div className="cm-topic-chips">
                        {parentTopics.map((tp) => (
                          <button
                            key={tp.id}
                            type="button"
                            className={`cm-topic-chip ${activeTopicId === tp.id ? 'active' : ''}`}
                            onClick={() =>
                              setActiveTopicId((v) => (v === tp.id ? null : tp.id))
                            }
                            title={(tp.tags || []).join(', ')}
                          >
                            {tp.title}
                            {(tp.tags || []).length > 0 && (
                              <span className="cm-topic-chip-tags">
                                {(tp.tags || []).slice(0, 2).map((tag) => (
                                  <span key={tag} className="cm-tag cm-tag-sm">
                                    {tag}
                                  </span>
                                ))}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="cm-topic-new cm-topic-new-wide">
                        <select
                          className="cm-select cm-select-sm"
                          value={newTopicTemplateId}
                          onChange={(e) => setNewTopicTemplateId(e.target.value)}
                        >
                          {templatesList.map((tm) => (
                            <option key={tm.id} value={tm.id}>
                              {tm.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="cm-topic-input"
                          placeholder="New topic…"
                          value={newTopicTitle}
                          onChange={(e) => setNewTopicTitle(e.target.value)}
                        />
                        <input
                          className="cm-topic-input"
                          placeholder="Tags (comma)"
                          value={newTopicTags}
                          onChange={(e) => setNewTopicTags(e.target.value)}
                        />
                        <button
                          type="button"
                          className="cm-topic-add"
                          onClick={() => {
                            const title = newTopicTitle.trim()
                            if (!title || !activeChat) return
                            const tags = newTopicTags
                              .split(',')
                              .map((x) => normalizeTag(x))
                              .filter(Boolean)
                            addTopic({
                              parentType: activeChat.type,
                              parentId: activeChat.id,
                              title,
                              templateId: newTopicTemplateId,
                              tags,
                            })
                            setNewTopicTitle('')
                            setNewTopicTags('')
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="cm-messages">
                    {messages
                      .filter((m) =>
                        activeTopicId ? m.topicId === activeTopicId : !m.topicId,
                      )
                      .map((msg) => {
                        const isMe = msg.senderEmail === currentEmail
                        const display = decryptedTexts[msg.id] ?? msg.text ?? '…'
                        return (
                          <div
                            key={msg.id}
                            className={`cm-msg ${isMe ? 'cm-msg-me' : 'cm-msg-other'}`}
                          >
                            {!isMe && (
                              <div className="cm-msg-sender">
                                <span className="cm-msg-name">{msg.senderName}</span>
                                <span className="cm-msg-role" style={{ color: roleColor(msg.senderRole) }}>
                                  {msg.senderRole}
                                </span>
                              </div>
                            )}
                            <div className="cm-msg-bubble">
                              {parseWikiSegments(display).map((seg, si) => {
                                if (seg.type === 'text') {
                                  return <span key={si}>{seg.text}</span>
                                }
                                const ref = resolveTopicRef(seg.inner, topics)
                                const tid =
                                  ref?.id ||
                                  (String(seg.inner).toLowerCase().startsWith('topic:')
                                    ? String(seg.inner).slice(6).trim()
                                    : null)
                                const label = ref?.title || seg.inner
                                return (
                                  <button
                                    key={si}
                                    type="button"
                                    className="cm-wiki-link"
                                    onClick={() => tid && jumpToTopicId(tid)}
                                  >
                                    [[{label}]]
                                  </button>
                                )
                              })}
                            </div>
                            <div className="cm-msg-time">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        )
                      })}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="cm-input-area">
                    <textarea
                      className="cm-input"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        activeTopicId
                          ? `Message in topic… (${topics.find((x) => x.id === activeTopicId)?.title})`
                          : 'Type a message… (Enter to send)'
                      }
                      rows={1}
                    />
                    <button
                      type="button"
                      className="cm-send-btn"
                      onClick={() => void handleSend()}
                      disabled={!messageText.trim()}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {mainTab === 'brain' && (
            <div className="cm-panel cm-panel-brain">
              <h3 className="cm-panel-title">Brain · topics · dialogues · connections</h3>
              <p className="cm-panel-hint">
                Map ties chats to topics; timeline shows daily notes; graph is full or local neighborhood; topic
                inspector has backlinks, outline, embeds. Use{' '}
                <kbd className="cm-kbd">⌘K</kbd> to jump anywhere.
              </p>
              <MessengerBrainPanel
                topics={topics}
                conversations={conversations}
                groups={groups}
                topicEdgeKinds={topicEdgeKinds}
                linkTopics={linkTopics}
                updateTopic={updateTopic}
                addTopicEmbed={addTopicEmbed}
                addTopicAlias={addTopicAlias}
                onOpenChat={(chat) => {
                  setActiveChat(chat)
                  setActiveTopicId(null)
                  setMainTab('chats')
                  if (chat.type === 'channel') setSidebarTab('channels')
                  else if (chat.type === 'group') setSidebarTab('groups')
                  else setSidebarTab('direct')
                }}
                onPickTopic={(id) => {
                  setBrainFocusTopicId(id)
                  const tp = topics.find((t) => t.id === id)
                  if (tp) openTopicEverywhere(tp)
                }}
                externalFocusTopicId={brainFocusTopicId}
              />
            </div>
          )}

          {mainTab === 'board' && (
            <div className="cm-panel cm-panel-board">
              <h3 className="cm-panel-title">Task board</h3>
              {!activeTopicId ? (
                <p className="cm-panel-hint">Select a chat with topics, pick a topic in the Chats tab, then open Task board.</p>
              ) : (
                <>
                  <p className="cm-board-sub">
                    Topic: <strong>{topics.find((x) => x.id === activeTopicId)?.title}</strong>
                  </p>
                  {activeBoard && (
                    <div className="cm-kanban">
                      {activeBoard.columns.map((col) => (
                        <div key={col.id} className="cm-kanban-col">
                          <div className="cm-kanban-col-title">{col.title}</div>
                          {col.cards.map((card) => (
                            <button
                              key={card.id}
                              type="button"
                              className={`cm-kanban-card ${card.done ? 'done' : ''}`}
                              onClick={() => toggleTaskCard(activeTopicId, col.id, card.id)}
                            >
                              {card.title}
                            </button>
                          ))}
                          <div className="cm-kanban-add">
                            <input
                              className="cm-kanban-input"
                              placeholder="Task…"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                            />
                            <button
                              type="button"
                              className="cm-kanban-add-btn"
                              onClick={() => {
                                const t = newTaskTitle.trim()
                                if (!t) return
                                addTaskCard(activeTopicId, col.id, t)
                                setNewTaskTitle('')
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {showCreateGroup && (
          <div className="cm-modal-backdrop" onClick={() => setShowCreateGroup(false)}>
            <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="cm-modal-title">Create group</h3>
              <input
                className="cm-modal-field"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <button
                type="button"
                className="cm-btn-primary cm-modal-primary"
                onClick={() => {
                  const n = groupName.trim()
                  if (!n) return
                  const gid = createGroup({ name: n })
                  setActiveChat({ type: 'group', id: gid, name: n })
                  setShowCreateGroup(false)
                  setGroupName('')
                  setSidebarTab('groups')
                }}
              >
                Create
              </button>
              <button type="button" className="cm-modal-close" onClick={() => setShowCreateGroup(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {showAddContact && (
          <div className="cm-modal-backdrop" onClick={() => setShowAddContact(false)}>
            <div className="cm-modal cm-modal-wide" onClick={(e) => e.stopPropagation()}>
              <h3 className="cm-modal-title">Find colleague on STREFEX</h3>
              <p className="cm-modal-text">
                Search by email or phone. Users must be in your company directory (Supabase). Otherwise send an
                invite to register.
              </p>
              <input
                className="cm-modal-field"
                placeholder="Email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <input
                className="cm-modal-field"
                placeholder="Phone (digits)"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
              <button
                type="button"
                className="cm-btn-primary"
                disabled={lookupLoading}
                onClick={() => void runContactLookup()}
              >
                {lookupLoading ? 'Searching…' : 'Search directory'}
              </button>
              {lookupResult?.found && (
                <div className="cm-lookup-found">
                  <div>
                    <strong>{lookupResult.profile.fullName || lookupResult.profile.email}</strong>
                    <div className="cm-modal-role">{lookupResult.profile.email}</div>
                  </div>
                  <button type="button" className="cm-btn-primary" onClick={() => startDMWithProfile(lookupResult.profile)}>
                    Message
                  </button>
                </div>
              )}
              {lookupResult && !lookupResult.found && (
                <div className="cm-lookup-miss">
                  <p>{lookupResult.reason || 'Not found.'}</p>
                  <div className="cm-invite-actions">
                    <a className="cm-btn-link" href={buildMailtoInvite(contactEmail || 'contact@example.com')}>
                      Invite by email
                    </a>
                    <button
                      type="button"
                      className="cm-btn-secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(buildRegisterInviteUrl())
                      }}
                    >
                      Copy join link
                    </button>
                  </div>
                </div>
              )}
              <button type="button" className="cm-modal-close" onClick={() => setShowAddContact(false)}>
                Close
              </button>
            </div>
          </div>
        )}

        {showNewDM && (
          <div className="cm-modal-backdrop" onClick={() => setShowNewDM(false)}>
            <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="cm-modal-title">Start direct chat</h3>
              <p className="cm-modal-text">Use “Add contact” to find someone by email or phone.</p>
              <button type="button" className="cm-btn-primary" onClick={() => { setShowNewDM(false); setShowAddContact(true) }}>
                Open contact search
              </button>
              <button type="button" className="cm-modal-close" onClick={() => setShowNewDM(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <MessengerQuickSwitcher
          open={showQuickSwitcher}
          onClose={() => setShowQuickSwitcher(false)}
          topics={topics}
          groups={groups}
          conversations={conversations}
          onGoToChat={(chat) => {
            setActiveChat(chat)
            setActiveTopicId(null)
            setMainTab('chats')
            if (chat.type === 'channel') setSidebarTab('channels')
            else if (chat.type === 'group') setSidebarTab('groups')
            else setSidebarTab('direct')
          }}
          onGoToTopic={(t) => openTopicEverywhere(t)}
        />
      </div>
    </AppLayout>
  )
}
