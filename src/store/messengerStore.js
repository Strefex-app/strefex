import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, tenantKey } from '../utils/tenantStorage'
import { encryptText, decryptText, isWebCryptoAvailable } from '../utils/messengerCrypto'
import { resolveWikiLinks, normalizeTag } from '../utils/messengerObsidian'

const LEGACY_KEY = (slug) => tenantKey(`strefex-messenger-${slug || 'default'}`)

const DEFAULT_CHANNELS = [
  { id: 'general', name: 'General', desc: 'Company-wide announcements', icon: '#' },
  { id: 'support', name: 'Support', desc: 'Questions for admins', icon: '?' },
  { id: 'projects', name: 'Projects', desc: 'Project updates', icon: '📁' },
]

function chatKey(type, id) {
  return `${type}:${id}`
}

/** Built-in topic templates (Obsidian-style) */
export const DEFAULT_TOPIC_TEMPLATES = [
  { id: 'blank', name: 'Blank', body: '', defaultTags: [] },
  {
    id: 'meeting',
    name: 'Meeting',
    body: '## Agenda\n\n## Notes\n\n## Actions\n',
    defaultTags: ['meeting'],
  },
  {
    id: 'decision',
    name: 'Decision log',
    body: '## Context\n\n## Decision\n\n## Consequences\n',
    defaultTags: ['decision'],
  },
  {
    id: 'daily',
    name: 'Daily note',
    body: '## Today\n\n## Log\n\n',
    defaultTags: ['daily'],
  },
]

export const useMessengerStore = create(
  persist(
    (set, get) => ({
      encryptionAtRest: true,
      groups: [],
      /**
       * Topic: linkedTopicIds, aliases[], tags[], dailyDate?, body, embeds[], templateId?,
       * linkedTopicIds — brain graph; body — outline/wiki; embeds — transclusion refs
       */
      topics: [],
      /** undirected edge key `${min}::${max}` → 'relates' | 'blocks' | 'embeds' */
      topicEdgeKinds: {},
      topicTemplates: DEFAULT_TOPIC_TEMPLATES,
      /** { id, topicId, columns: { id, title, cards: { id, title, done }[] }[] } */
      taskBoards: [],
      /** legacy-shaped + topicId on messages optional */
      conversations: [],

      setEncryptionAtRest: (v) => set({ encryptionAtRest: !!v }),

      migrateLegacyIfNeeded: (slug) => {
        try {
          const raw = localStorage.getItem(LEGACY_KEY(slug))
          if (!raw) return
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length && get().conversations.length === 0) {
            set({ conversations: parsed })
          }
          localStorage.removeItem(LEGACY_KEY(slug))
        } catch { /* */ }
      },

      createGroup: ({ name, memberEmails = [] }) => {
        const id = `grp-${Date.now()}`
        const g = { id, name, memberEmails, createdAt: new Date().toISOString() }
        set((s) => ({ groups: [...s.groups, g] }))
        get().ensureConversation({ type: 'group', id, name })
        return id
      },

      ensureConversation: ({ type, id, name, partnerEmail }) => {
        const { conversations } = get()
        const exists = conversations.some((c) => c.type === type && c.id === id)
        if (exists) return
        const conv = {
          type,
          id,
          name: name || id,
          partnerEmail: type === 'dm' ? partnerEmail || id : undefined,
          messages: [],
        }
        set({ conversations: [...conversations, conv] })
      },

      addTopic: ({
        parentType,
        parentId,
        title,
        templateId,
        tags: tagInput,
        dailyDate: dailyInput,
        aliases: aliasInput,
      }) => {
        const templates = get().topicTemplates?.length ? get().topicTemplates : DEFAULT_TOPIC_TEMPLATES
        const tmpl = templates.find((x) => x.id === templateId) || templates[0]
        const id = `topic-${Date.now()}`
        const tagSet = new Set([
          ...(tmpl.defaultTags || []).map(normalizeTag),
          ...(Array.isArray(tagInput) ? tagInput : []),
        ].map(normalizeTag).filter(Boolean))
        const tags = [...tagSet]
        let dailyDate = dailyInput || null
        if (tmpl.id === 'daily' && !dailyDate) {
          dailyDate = new Date().toISOString().slice(0, 10)
        }
        const t = {
          id,
          parentType,
          parentId,
          title: title || tmpl.name || 'New topic',
          linkedTopicIds: [],
          aliases: Array.isArray(aliasInput) ? aliasInput.filter(Boolean) : [],
          tags,
          dailyDate,
          body: tmpl.body || '',
          embeds: [],
          templateId: tmpl.id,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ topics: [...s.topics, t] }))
        get().ensureTaskBoard(id)
        return id
      },

      updateTopic: (topicId, patch) => {
        set((s) => ({
          topics: s.topics.map((t) => (t.id === topicId ? { ...t, ...patch } : t)),
        }))
      },

      addTopicTags: (topicId, newTags) => {
        const extra = (Array.isArray(newTags) ? newTags : []).map(normalizeTag).filter(Boolean)
        if (!extra.length) return
        set((s) => ({
          topics: s.topics.map((t) => {
            if (t.id !== topicId) return t
            const set = new Set([...(t.tags || []), ...extra])
            return { ...t, tags: [...set] }
          }),
        }))
      },

      addTopicAlias: (topicId, alias) => {
        const a = String(alias || '').trim()
        if (!a) return
        set((s) => ({
          topics: s.topics.map((t) =>
            t.id === topicId ? { ...t, aliases: [...new Set([...(t.aliases || []), a])] } : t,
          ),
        }))
      },

      addTopicEmbed: (targetTopicId, { sourceTopicId, messageId }) => {
        if (!sourceTopicId) return
        set((s) => ({
          topics: s.topics.map((t) => {
            if (t.id !== targetTopicId) return t
            const embeds = [...(t.embeds || [])]
            const dup = embeds.some(
              (e) => e.sourceTopicId === sourceTopicId && (e.messageId || null) === (messageId || null),
            )
            if (!dup) embeds.push({ sourceTopicId, messageId: messageId || null })
            return { ...t, embeds }
          }),
        }))
      },

      linkTopics: (topicIdA, topicIdB, kind = 'relates') => {
        if (topicIdA === topicIdB) return
        const edgeKey = [topicIdA, topicIdB].sort().join('::')
        set((s) => ({
          topicEdgeKinds: { ...s.topicEdgeKinds, [edgeKey]: kind },
          topics: s.topics.map((t) => {
            if (t.id === topicIdA) {
              const setIds = new Set([...(t.linkedTopicIds || []), topicIdB])
              return { ...t, linkedTopicIds: [...setIds] }
            }
            if (t.id === topicIdB) {
              const setIds = new Set([...(t.linkedTopicIds || []), topicIdA])
              return { ...t, linkedTopicIds: [...setIds] }
            }
            return t
          }),
        }))
      },

      ensureTaskBoard: (topicId) => {
        const { taskBoards } = get()
        if (taskBoards.some((b) => b.topicId === topicId)) return
        const id = `board-${topicId}`
        const board = {
          id,
          topicId,
          columns: [
            { id: 'c1', title: 'To do', cards: [] },
            { id: 'c2', title: 'Doing', cards: [] },
            { id: 'c3', title: 'Done', cards: [] },
          ],
        }
        set({ taskBoards: [...taskBoards, board] })
      },

      addTaskCard: (topicId, columnId, title) => {
        const card = { id: `card-${Date.now()}`, title: title || 'Task', done: false }
        set((s) => ({
          taskBoards: s.taskBoards.map((b) => {
            if (b.topicId !== topicId) return b
            return {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId ? { ...c, cards: [...c.cards, card] } : c,
              ),
            }
          }),
        }))
      },

      toggleTaskCard: (topicId, columnId, cardId) => {
        set((s) => ({
          taskBoards: s.taskBoards.map((b) => {
            if (b.topicId !== topicId) return b
            return {
              ...b,
              columns: b.columns.map((c) => {
                if (c.id !== columnId) return c
                return {
                  ...c,
                  cards: c.cards.map((x) =>
                    x.id === cardId ? { ...x, done: !x.done } : x,
                  ),
                }
              }),
            }
          }),
        }))
      },

      appendMessage: async (chatType, chatId, msg, cryptoKey) => {
        const plain = msg.text || ''
        const { topicIds: mentionedTopicIds } = resolveWikiLinks(plain, get().topics || [])
        const enc = get().encryptionAtRest && cryptoKey && isWebCryptoAvailable()
        let out = { ...msg, mentionedTopicIds }
        if (enc && msg.text) {
          const { cipher, iv } = await encryptText(msg.text, cryptoKey)
          out = { ...msg, mentionedTopicIds, text: '', textCipher: cipher, textIv: iv }
        }
        set((s) => {
          const idx = s.conversations.findIndex((c) => c.type === chatType && c.id === chatId)
          if (idx < 0) {
            return {
              conversations: [
                ...s.conversations,
                { type: chatType, id: chatId, name: chatId, messages: [out] },
              ],
            }
          }
          return {
            conversations: s.conversations.map((c, i) =>
              i === idx ? { ...c, messages: [...c.messages, out] } : c,
            ),
          }
        })
      },

      decryptMessageBody: async (m, cryptoKey) => {
        if (m.text) return m.text
        if (m.textCipher && m.textIv && cryptoKey) {
          return decryptText(m.textCipher, m.textIv, cryptoKey)
        }
        return ''
      },
    }),
    {
      name: 'messenger-workspace',
      storage: createTenantStorage(),
      partialize: (s) => ({
        encryptionAtRest: s.encryptionAtRest,
        groups: s.groups,
        topics: s.topics,
        topicEdgeKinds: s.topicEdgeKinds,
        topicTemplates: s.topicTemplates,
        taskBoards: s.taskBoards,
        conversations: s.conversations,
      }),
      merge: (persisted, current) => {
        const p = persisted && typeof persisted === 'object' ? persisted : {}
        return {
          ...current,
          ...p,
          encryptionAtRest: typeof p.encryptionAtRest === 'boolean' ? p.encryptionAtRest : current.encryptionAtRest,
          groups: Array.isArray(p.groups) ? p.groups : current.groups,
          topics: Array.isArray(p.topics) ? p.topics : current.topics,
          topicEdgeKinds:
            p.topicEdgeKinds && typeof p.topicEdgeKinds === 'object' ? p.topicEdgeKinds : current.topicEdgeKinds,
          topicTemplates:
            Array.isArray(p.topicTemplates) && p.topicTemplates.length > 0
              ? p.topicTemplates
              : current.topicTemplates,
          taskBoards: Array.isArray(p.taskBoards) ? p.taskBoards : current.taskBoards,
          conversations: Array.isArray(p.conversations) ? p.conversations : current.conversations,
        }
      },
    },
  ),
)

export { DEFAULT_CHANNELS, chatKey }
