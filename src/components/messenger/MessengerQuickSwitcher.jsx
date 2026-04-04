import { useMemo, useState, useEffect, useRef } from 'react'
import { DEFAULT_CHANNELS } from '../../store/messengerStore'

/**
 * Cmd/Ctrl+K palette: jump to chats, topics, tags (Obsidian quick switcher).
 */
export default function MessengerQuickSwitcher({
  open,
  onClose,
  topics,
  groups,
  conversations,
  onGoToChat,
  onGoToTopic,
}) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const items = useMemo(() => {
    const query = q.trim().toLowerCase()
    const out = []
    DEFAULT_CHANNELS.forEach((ch) => {
      const label = `${ch.name} (channel)`
      if (!query || label.toLowerCase().includes(query) || ch.id.includes(query)) {
        out.push({
          key: `ch-${ch.id}`,
          label,
          sub: ch.desc,
          run: () => onGoToChat({ type: 'channel', id: ch.id, name: ch.name }),
        })
      }
    })
    groups.forEach((g) => {
      const label = `${g.name} (group)`
      if (!query || label.toLowerCase().includes(query)) {
        out.push({
          key: `grp-${g.id}`,
          label,
          sub: 'Group',
          run: () => onGoToChat({ type: 'group', id: g.id, name: g.name }),
        })
      }
    })
    conversations.forEach((c) => {
      if (c.type !== 'dm') return
      const label = `${c.name || c.id} (direct)`
      if (!query || label.toLowerCase().includes(query) || c.id.includes(query)) {
        out.push({
          key: `dm-${c.id}`,
          label,
          sub: 'DM',
          run: () =>
            onGoToChat({
              type: 'dm',
              id: c.id,
              name: c.name || c.id,
              partnerEmail: c.partnerEmail,
            }),
        })
      }
    })
    topics.forEach((t) => {
      const hay = `${t.title} ${(t.tags || []).join(' ')} ${(t.aliases || []).join(' ')}`.toLowerCase()
      if (!query || hay.includes(query) || t.id.includes(query)) {
        out.push({
          key: `topic-${t.id}`,
          label: t.title,
          sub: `Topic · ${(t.tags || []).slice(0, 3).join(', ') || 'no tags'}`,
          run: () => onGoToTopic(t),
        })
      }
    })
    return out.slice(0, 40)
  }, [q, topics, groups, conversations])

  if (!open) return null

  return (
    <div className="cm-modal-backdrop cm-qs-backdrop" onClick={onClose}>
      <div className="cm-qs" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cm-qs-input"
          placeholder="Jump to chat, topic, tag…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'Enter' && items[0]) {
              items[0].run()
              onClose()
            }
          }}
        />
        <ul className="cm-qs-list">
          {items.map((it) => (
            <li key={it.key}>
              <button
                type="button"
                className="cm-qs-item"
                onClick={() => {
                  it.run()
                  onClose()
                }}
              >
                <span className="cm-qs-item-label">{it.label}</span>
                <span className="cm-qs-item-sub">{it.sub}</span>
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="cm-qs-empty">No matches</li>}
        </ul>
        <p className="cm-qs-hint">Enter to open first result · Esc to close</p>
      </div>
    </div>
  )
}
