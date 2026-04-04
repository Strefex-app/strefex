import { useMemo, useState, useCallback, useEffect } from 'react'
import {
  computeBacklinksFromGraph,
  computeMentionBacklinks,
  getLocalGraphNeighborhood,
  layoutGraphNodes,
  uniqueUndirectedEdges,
  parseOutlineSections,
  getEdgeKind,
} from '../../utils/messengerObsidian'
import { DEFAULT_CHANNELS } from '../../store/messengerStore'

const BRAIN_TABS = [
  { id: 'map', label: 'Map' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'graph', label: 'Graph' },
  { id: 'inspector', label: 'Topic' },
]

export default function MessengerBrainPanel({
  topics,
  conversations,
  groups,
  topicEdgeKinds,
  linkTopics,
  updateTopic,
  addTopicEmbed,
  addTopicAlias,
  onOpenChat,
  onFocusTopic,
  onOpenTopicInChat,
  externalFocusTopicId,
}) {
  const [sub, setSub] = useState('map')
  const [graphScope, setGraphScope] = useState('full')
  const [focusTopicId, setFocusTopicId] = useState(null)
  const [linkKind, setLinkKind] = useState('relates')
  const [linkA, setLinkA] = useState('')
  const [linkB, setLinkB] = useState('')
  const [newAlias, setNewAlias] = useState('')
  const [embedSource, setEmbedSource] = useState('')
  const [collapsedSections, setCollapsedSections] = useState({})

  useEffect(() => {
    if (externalFocusTopicId) setFocusTopicId(externalFocusTopicId)
  }, [externalFocusTopicId])

  const effectiveFocus = externalFocusTopicId || focusTopicId
  const focusTopic = topics.find((t) => t.id === effectiveFocus) || null

  const allEdges = useMemo(() => {
    const e = []
    topics.forEach((t) => {
      ;(t.linkedTopicIds || []).forEach((o) => e.push([t.id, o]))
    })
    return uniqueUndirectedEdges(e)
  }, [topics])

  const graphLayout = useMemo(() => {
    const box = { width: 520, height: 320 }
    let nodeIds = topics.map((t) => t.id)
    let edges = allEdges
    if (graphScope === 'local') {
      if (!effectiveFocus) {
        return { positions: {}, nodeIds: [], edges: [] }
      }
      const { nodeIds: n, edges: ed } = getLocalGraphNeighborhood(effectiveFocus, topics, 1)
      nodeIds = [...n]
      edges = uniqueUndirectedEdges(ed)
    }
    if (nodeIds.length === 0) return { positions: {}, nodeIds: [], edges: [] }
    const positions = layoutGraphNodes(nodeIds, edges, box)
    return { positions, nodeIds, edges }
  }, [topics, allEdges, graphScope, effectiveFocus])

  const dailyGroups = useMemo(() => {
    const byDate = {}
    topics.forEach((t) => {
      if (!t.dailyDate) return
      if (!byDate[t.dailyDate]) byDate[t.dailyDate] = []
      byDate[t.dailyDate].push(t)
    })
    return Object.keys(byDate)
      .sort((a, b) => b.localeCompare(a))
      .map((d) => ({ date: d, topics: byDate[d] }))
  }, [topics])

  const dialogueRows = useMemo(() => {
    const rows = []
    DEFAULT_CHANNELS.forEach((ch) => {
      const n = topics.filter((t) => t.parentType === 'channel' && t.parentId === ch.id).length
      rows.push({
        key: `c-${ch.id}`,
        label: ch.name,
        kind: 'channel',
        type: 'channel',
        id: ch.id,
        topicCount: n,
      })
    })
    groups.forEach((g) => {
      const n = topics.filter((t) => t.parentType === 'group' && t.parentId === g.id).length
      rows.push({
        key: `g-${g.id}`,
        label: g.name,
        kind: 'group',
        type: 'group',
        id: g.id,
        topicCount: n,
      })
    })
    conversations
      .filter((c) => c.type === 'dm')
      .forEach((c) => {
        const n = topics.filter((t) => t.parentType === 'dm' && t.parentId === c.id).length
        rows.push({
          key: `d-${c.id}`,
          label: c.name || c.id,
          kind: 'direct',
          type: 'dm',
          id: c.id,
          partnerEmail: c.partnerEmail,
          topicCount: n,
        })
      })
    return rows
  }, [topics, groups, conversations])

  const backFromGraph = useCallback(
    (id) => {
      const fromGraph = computeBacklinksFromGraph(id, topics)
      const fromMsg = computeMentionBacklinks(id, conversations)
      return { fromGraph, fromMsg }
    },
    [topics, conversations],
  )

  const outline = useMemo(
    () => (focusTopic ? parseOutlineSections(focusTopic.body || '') : []),
    [focusTopic],
  )

  const toggleSection = (id) => {
    setCollapsedSections((s) => ({ ...s, [id]: !s[id] }))
  }

  return (
    <div className="cm-brain">
      <div className="cm-brain-tabs">
        {BRAIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`cm-brain-tab ${sub === t.id ? 'active' : ''}`}
            onClick={() => setSub(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'map' && (
        <div className="cm-brain-section">
          <h4 className="cm-brain-h4">Dialogues → topics → brain</h4>
          <p className="cm-panel-hint">
            Each row is a chat (dialogue). Topic count shows how many threads exist under it. Open a chat to add
            topics in the Chats tab.
          </p>
          <div className="cm-map-table-wrap">
            <table className="cm-map-table">
              <thead>
                <tr>
                  <th>Dialogue</th>
                  <th>Type</th>
                  <th>Topics</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dialogueRows.map((r) => (
                  <tr key={r.key}>
                    <td>{r.label}</td>
                    <td>{r.kind}</td>
                    <td>{r.topicCount}</td>
                    <td>
                      <button
                        type="button"
                        className="cm-btn-secondary cm-btn-xs"
                        onClick={() =>
                          onOpenChat({
                            type: r.type,
                            id: r.id,
                            name: r.label,
                            partnerEmail: r.partnerEmail,
                          })
                        }
                      >
                        Open chat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cm-brain-meta">
            Total topics: <strong>{topics.length}</strong> · Graph edges: <strong>{allEdges.length}</strong>
          </p>
        </div>
      )}

      {sub === 'timeline' && (
        <div className="cm-brain-section">
          <h4 className="cm-brain-h4">Daily notes (timeline)</h4>
          <p className="cm-panel-hint">Topics created with the Daily template get a date and appear here.</p>
          <div className="cm-timeline">
            {dailyGroups.length === 0 && (
              <p className="cm-list-empty">No daily-dated topics yet. Create one with template “Daily note”.</p>
            )}
            {dailyGroups.map(({ date, topics: tps }) => (
              <div key={date} className="cm-timeline-day">
                <div className="cm-timeline-date">{date}</div>
                <ul className="cm-timeline-list">
                  {tps.map((tp) => (
                    <li key={tp.id}>
                      <button type="button" className="cm-timeline-link" onClick={() => onPickTopic(tp.id)}>
                        {tp.title}
                      </button>
                      {(tp.tags || []).map((tag) => (
                        <span key={tag} className="cm-tag cm-tag-sm">
                          {tag}
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === 'graph' && (
        <div className="cm-brain-section">
          <h4 className="cm-brain-h4">Topic graph</h4>
          <div className="cm-graph-toolbar">
            <label className="cm-graph-scope">
              <input
                type="radio"
                name="gscope"
                checked={graphScope === 'full'}
                onChange={() => setGraphScope('full')}
              />{' '}
              Full brain
            </label>
            <label className="cm-graph-scope">
              <input
                type="radio"
                name="gscope"
                checked={graphScope === 'local'}
                onChange={() => setGraphScope('local')}
              />{' '}
              Local (1 hop){' '}
              {!effectiveFocus && <span className="cm-crypto-warn">select a topic first</span>}
            </label>
          </div>
          {graphScope === 'local' && !effectiveFocus && (
            <p className="cm-panel-hint">Select a topic in Chats or click a node after switching to Full brain.</p>
          )}
          <div className="cm-graph cm-graph-interactive">
            <svg
              className="cm-graph-svg"
              viewBox="0 0 520 320"
              role="img"
              aria-label="Topic graph"
            >
              {graphLayout.edges.map(([a, b], i) => {
                const pa = graphLayout.positions[a]
                const pb = graphLayout.positions[b]
                if (!pa || !pb) return null
                const kind = getEdgeKind(topicEdgeKinds || {}, a, b)
                return (
                  <g key={`${a}-${b}-${i}`}>
                    <line
                      x1={pa.x}
                      y1={pa.y}
                      x2={pb.x}
                      y2={pb.y}
                      stroke="var(--color-primary)"
                      strokeOpacity={kind === 'blocks' ? 0.55 : 0.28}
                      strokeWidth={kind === 'blocks' ? 3 : 2}
                      strokeDasharray={kind === 'embeds' ? '4 3' : undefined}
                    />
                  </g>
                )
              })}
            </svg>
            <div className="cm-graph-nodes cm-graph-nodes-abs">
              {graphLayout.nodeIds.length === 0 && graphScope === 'full' && topics.length === 0 && (
                <span className="cm-list-empty cm-graph-empty">No topics yet.</span>
              )}
              {graphLayout.nodeIds.map((id) => {
                const tp = topics.find((t) => t.id === id)
                const p = graphLayout.positions[id]
                if (!tp || !p) return null
                const active = effectiveFocus === id
                return (
                  <button
                    key={id}
                    type="button"
                    className={`cm-graph-node-btn ${active ? 'active' : ''}`}
                    style={{ left: p.x - 4, top: p.y - 10 }}
                    onClick={() => {
                      setFocusTopicId(id)
                      onFocusTopic(id)
                    }}
                    title={tp.title}
                  >
                    {tp.title.length > 22 ? `${tp.title.slice(0, 20)}…` : tp.title}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="cm-link-row cm-link-row-wrap">
            <select className="cm-select" value={linkA} onChange={(e) => setLinkA(e.target.value)}>
              <option value="">Topic A…</option>
              {topics.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.title}
                </option>
              ))}
            </select>
            <select className="cm-select" value={linkB} onChange={(e) => setLinkB(e.target.value)}>
              <option value="">Topic B…</option>
              {topics.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.title}
                </option>
              ))}
            </select>
            <select className="cm-select" value={linkKind} onChange={(e) => setLinkKind(e.target.value)}>
              <option value="relates">relates</option>
              <option value="blocks">blocks</option>
              <option value="embeds">embeds</option>
            </select>
            <button
              type="button"
              className="cm-btn-primary"
              onClick={() => {
                if (linkA && linkB) linkTopics(linkA, linkB, linkKind)
              }}
            >
              Link
            </button>
          </div>
        </div>
      )}

      {sub === 'inspector' && (
        <div className="cm-brain-section">
          <h4 className="cm-brain-h4">Topic inspector</h4>
          <p className="cm-panel-hint">
            Backlinks (mentioned in), aliases, tags, outline, and transclusion (embeds). Pick a topic from the
            graph or timeline.
          </p>
          {!focusTopic && <p className="cm-list-empty">Select a topic in Graph or Timeline.</p>}
          {focusTopic && (
            <div className="cm-inspector">
              <div className="cm-inspector-head">
                <h5 className="cm-inspector-title">{focusTopic.title}</h5>
                <button
                  type="button"
                  className="cm-btn-primary cm-btn-xs"
                  onClick={() => onOpenTopicInChat(focusTopic)}
                >
                  Open in chat
                </button>
              </div>
              <div className="cm-inspector-row">
                <span className="cm-inspector-label">Tags</span>
                <span>
                  {(focusTopic.tags || []).map((tag) => (
                    <span key={tag} className="cm-tag">
                      {tag}
                    </span>
                  ))}
                </span>
              </div>
              <div className="cm-inspector-row">
                <span className="cm-inspector-label">Aliases</span>
                <span>{(focusTopic.aliases || []).join(', ') || '—'}</span>
              </div>
              <div className="cm-inspector-add">
                <input
                  className="cm-modal-field"
                  placeholder="Add alias"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                />
                <button
                  type="button"
                  className="cm-btn-secondary"
                  onClick={() => {
                    if (newAlias.trim()) addTopicAlias(focusTopic.id, newAlias.trim())
                    setNewAlias('')
                  }}
                >
                  Add alias
                </button>
              </div>

              <div className="cm-backlinks">
                <h6>Backlinks (graph)</h6>
                <ul>
                  {backFromGraph(focusTopic.id).fromGraph.map((tid) => {
                    const t = topics.find((x) => x.id === tid)
                    return (
                      <li key={tid}>
                        <button
                          type="button"
                          className="cm-inline-link"
                          onClick={() => onFocusTopic(tid)}
                        >
                          {t?.title || tid}
                        </button>
                      </li>
                    )
                  })}
                  {backFromGraph(focusTopic.id).fromGraph.length === 0 && <li>None</li>}
                </ul>
                <h6>Mentioned in messages</h6>
                <ul>
                  {backFromGraph(focusTopic.id).fromMsg.map((h) => (
                    <li key={`${h.chatType}-${h.chatId}-${h.messageId || 'm'}`}>
                      <button
                        type="button"
                        className="cm-inline-link"
                        onClick={() =>
                          onOpenChat({
                            type: h.chatType,
                            id: h.chatId,
                            name: h.chatName,
                          })
                        }
                      >
                        {h.chatName}
                      </button>{' '}
                      · msg {String(h.messageId || '').slice(-6) || '—'}
                    </li>
                  ))}
                  {backFromGraph(focusTopic.id).fromMsg.length === 0 && <li>None</li>}
                </ul>
              </div>

              <div className="cm-outline">
                <h6>Outline (folding)</h6>
                {outline.length === 0 && <p className="cm-muted">Add ## headings in the topic body below.</p>}
                {outline.map((sec) => (
                  <div key={sec.id} className="cm-outline-section">
                    <button
                      type="button"
                      className="cm-outline-head"
                      onClick={() => toggleSection(sec.id)}
                    >
                      {collapsedSections[sec.id] ? '▶' : '▼'} {sec.title}
                    </button>
                    {!collapsedSections[sec.id] && (
                      <p className="cm-outline-preview">Section at line {sec.lineStart + 1}</p>
                    )}
                  </div>
                ))}
              </div>

              <label className="cm-inspector-label">Topic body / wiki</label>
              <textarea
                className="cm-topic-body"
                rows={8}
                value={focusTopic.body || ''}
                onChange={(e) => updateTopic(focusTopic.id, { body: e.target.value })}
                placeholder="## Section&#10;Notes…"
              />

              <div className="cm-embeds">
                <h6>Transclusion (embeds)</h6>
                <ul>
                  {(focusTopic.embeds || []).map((em, i) => {
                    const src = topics.find((t) => t.id === em.sourceTopicId)
                    return (
                      <li key={`${em.sourceTopicId}-${i}`}>
                        <strong>{src?.title || em.sourceTopicId}</strong>
                        {em.messageId ? ` · message ${em.messageId.slice(-6)}` : ''}
                      </li>
                    )
                  })}
                  {(focusTopic.embeds || []).length === 0 && <li>None</li>}
                </ul>
                <div className="cm-embed-add">
                  <select
                    className="cm-select"
                    value={embedSource}
                    onChange={(e) => setEmbedSource(e.target.value)}
                  >
                    <option value="">Embed topic…</option>
                    {topics
                      .filter((t) => t.id !== focusTopic.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="cm-btn-secondary"
                    onClick={() => {
                      if (embedSource) addTopicEmbed(focusTopic.id, { sourceTopicId: embedSource })
                      setEmbedSource('')
                    }}
                  >
                    Add embed
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
