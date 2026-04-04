/**
 * Obsidian-style helpers for Company Messenger: wiki links, outline sections, graph layout.
 */

const WIKI_LINK = /\[\[([^\]]+)\]\]/g

/** @param {string} raw */
export function normalizeTag(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

/**
 * @param {string} text
 * @param {{ id: string, title: string, aliases?: string[] }[]} topics
 * @returns {{ topicIds: string[], unresolved: string[] }}
 */
export function resolveWikiLinks(text, topics) {
  const list = Array.isArray(topics) ? topics : []
  const topicIds = []
  const unresolved = []
  const seen = new Set()
  let m
  const re = new RegExp(WIKI_LINK.source, 'g')
  while ((m = re.exec(text)) !== null) {
    const inner = m[1].trim()
    if (!inner) continue
    if (inner.toLowerCase().startsWith('topic:')) {
      const id = inner.slice(6).trim()
      if (list.some((t) => t.id === id) && !seen.has(id)) {
        seen.add(id)
        topicIds.push(id)
      } else if (!list.some((t) => t.id === id)) unresolved.push(inner)
      continue
    }
    const low = inner.toLowerCase()
    const hit = list.find(
      (t) =>
        (t.title || '').toLowerCase() === low ||
        (t.aliases || []).some((a) => a.toLowerCase() === low),
    )
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id)
      topicIds.push(hit.id)
    } else if (!hit) unresolved.push(inner)
  }
  return { topicIds, unresolved }
}

/**
 * @param {string} body
 * @returns {{ id: string, title: string, lineStart: number }[]}
 */
export function parseOutlineSections(body) {
  const lines = String(body || '').split('\n')
  const sections = []
  lines.forEach((line, i) => {
    const mm = /^(#{2,6})\s+(.+)$/.exec(line.trim())
    if (mm) {
      const depth = mm[1].length
      const title = mm[2].trim()
      sections.push({
        id: `h-${i}-${title.slice(0, 24)}`,
        title,
        depth,
        lineStart: i,
      })
    }
  })
  return sections
}

/**
 * Incoming links: who points to this topic (graph edges).
 * @param {string} topicId
 * @param {{ id: string, linkedTopicIds?: string[] }[]} topics
 */
export function computeBacklinksFromGraph(topicId, topics) {
  if (!Array.isArray(topics)) return []
  const from = []
  topics.forEach((t) => {
    if (t.id === topicId) return
    if ((t.linkedTopicIds || []).includes(topicId)) from.push(t.id)
  })
  return from
}

/**
 * Messages that mention this topic via [[wiki]] links.
 * @param {string} topicId
 * @param {{ messages?: { id: string, mentionedTopicIds?: string[] }[], type: string, id: string, name?: string }[]} conversations
 */
export function computeMentionBacklinks(topicId, conversations) {
  const hits = []
  conversations.forEach((c) => {
    ;(c.messages || []).forEach((m) => {
      if ((m.mentionedTopicIds || []).includes(topicId)) {
        hits.push({
          messageId: m.id,
          chatType: c.type,
          chatId: c.id,
          chatName: c.name || c.id,
        })
      }
    })
  })
  return hits
}

/**
 * @param {string} topicId
 * @param {{ id: string, linkedTopicIds?: string[], embeds?: { sourceTopicId: string }[] }[]} topics
 * @param {number} maxDepth
 */
export function getLocalGraphNeighborhood(topicId, topics, maxDepth = 1) {
  if (!Array.isArray(topics) || topics.length === 0) return { nodeIds: new Set(), edges: [] }
  const byId = Object.fromEntries(topics.map((t) => [t.id, t]))
  if (!byId[topicId]) return { nodeIds: new Set(), edges: [] }

  function neighborsUndirected(id) {
    const out = new Set()
    const t = byId[id]
    if (!t) return out
    ;(t.linkedTopicIds || []).forEach((o) => out.add(o))
    topics.forEach((x) => {
      if (x.id !== id && (x.linkedTopicIds || []).includes(id)) out.add(x.id)
    })
    ;(t.embeds || []).forEach((em) => {
      if (em.sourceTopicId) out.add(em.sourceTopicId)
    })
    topics.forEach((x) => {
      if (x.id === id) return
      ;(x.embeds || []).forEach((em) => {
        if (em.sourceTopicId === id) out.add(x.id)
      })
    })
    return out
  }

  const nodeIds = new Set([topicId])
  const edges = []
  let frontier = [topicId]
  for (let d = 0; d < maxDepth; d++) {
    const next = []
    frontier.forEach((id) => {
      neighborsUndirected(id).forEach((other) => {
        if (!byId[other]) return
        edges.push([id, other])
        if (!nodeIds.has(other)) {
          nodeIds.add(other)
          next.push(other)
        }
      })
    })
    frontier = next
  }
  return { nodeIds, edges }
}

/**
 * Simple force-directed-ish layout in a box (iterations).
 * @param {string[]} nodeIds
 * @param {[string, string][]} edges
 * @param {{ width: number, height: number }} box
 */
export function layoutGraphNodes(nodeIds, edges, box) {
  const n = nodeIds.length
  if (n === 0) return {}
  const ids = [...nodeIds]
  const pos = {}
  ids.forEach((id, i) => {
    const ang = (2 * Math.PI * i) / Math.max(n, 1)
    pos[id] = {
      x: box.width / 2 + Math.cos(ang) * (box.width * 0.35),
      y: box.height / 2 + Math.sin(ang) * (box.height * 0.35),
    }
  })
  const kRep = 800
  const kAttr = 0.04
  const iterations = 36
  for (let it = 0; it < iterations; it++) {
    const force = {}
    ids.forEach((id) => {
      force[id] = { x: 0, y: 0 }
    })
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i]
        const b = ids[j]
        let dx = pos[b].x - pos[a].x
        let dy = pos[b].y - pos[a].y
        let dist = Math.hypot(dx, dy) || 0.01
        const rep = kRep / (dist * dist)
        dx = (dx / dist) * rep
        dy = (dy / dist) * rep
        force[a].x -= dx
        force[a].y -= dy
        force[b].x += dx
        force[b].y += dy
      }
    }
    edges.forEach(([a, b]) => {
      if (!pos[a] || !pos[b]) return
      let dx = pos[b].x - pos[a].x
      let dy = pos[b].y - pos[a].y
      const dist = Math.hypot(dx, dy) || 0.01
      const ideal = 90
      const f = (dist - ideal) * kAttr
      dx = (dx / dist) * f
      dy = (dy / dist) * f
      force[a].x += dx
      force[a].y += dy
      force[b].x -= dx
      force[b].y -= dy
    })
    ids.forEach((id) => {
      pos[id].x += force[id].x * 0.15
      pos[id].y += force[id].y * 0.15
      pos[id].x = Math.max(40, Math.min(box.width - 40, pos[id].x))
      pos[id].y = Math.max(30, Math.min(box.height - 30, pos[id].y))
    })
  }
  return pos
}

/**
 * Dedupe undirected edges for drawing.
 * @param {[string, string][]} edges
 */
export function uniqueUndirectedEdges(edges) {
  const out = []
  const seen = new Set()
  edges.forEach(([a, b]) => {
    const k = a < b ? `${a}|${b}` : `${b}|${a}`
    if (seen.has(k)) return
    seen.add(k)
    out.push([a, b])
  })
  return out
}

/**
 * @param {string} inner wiki link content without brackets
 * @param {{ id: string, title: string, aliases?: string[] }[]} topics
 */
export function resolveTopicRef(inner, topics) {
  const list = Array.isArray(topics) ? topics : []
  const s = String(inner || '').trim()
  if (!s) return null
  if (s.toLowerCase().startsWith('topic:')) {
    const id = s.slice(6).trim()
    return list.find((t) => t.id === id) || { id, title: id }
  }
  const low = s.toLowerCase()
  const hit =
    list.find((t) => (t.title || '').toLowerCase() === low) ||
    list.find((t) => (t.aliases || []).some((a) => a.toLowerCase() === low))
  return hit || null
}

/**
 * @param {string} text
 * @returns {{ type: 'text' | 'link', text?: string, inner?: string }[]}
 */
export function parseWikiSegments(text) {
  const s = String(text || '')
  const re = /\[\[([^\]]+)\]\]/g
  const segments = []
  let last = 0
  let m
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) segments.push({ type: 'text', text: s.slice(last, m.index) })
    segments.push({ type: 'link', inner: m[1].trim() })
    last = m.index + m[0].length
  }
  if (last < s.length) segments.push({ type: 'text', text: s.slice(last) })
  return segments.length ? segments : [{ type: 'text', text: s }]
}

/** @param {Record<string, string>} topicEdgeKinds */
export function getEdgeKind(topicEdgeKinds, a, b) {
  const k = [a, b].sort().join('::')
  return topicEdgeKinds[k] || 'relates'
}
